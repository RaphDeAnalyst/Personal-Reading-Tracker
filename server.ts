import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";

console.log("--- The Archivist Server: Sequential Startup Initiated ---");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  console.log("Creating uploads sanctuary...");
  fs.mkdirSync(uploadsDir);
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

async function startServer() {
  try {
    console.log("Initializing database connection...");
    db = new Database("reading_tracker.db");
    
    const app = express();
    const PORT = 3000;

    console.log("Running database migrations...");
    // Initialize Database
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        total_pages INTEGER NOT NULL,
        current_page INTEGER DEFAULT 0,
        status TEXT DEFAULT 'NOT_STARTED',
        mode TEXT DEFAULT 'PHYSICAL',
        cover_url TEXT,
        pdf_file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        pages_read INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
      );

      CREATE TABLE IF NOT EXISTS reflections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER UNIQUE NOT NULL,
        content TEXT,
        rating INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
      );
    `);

    // Migration: Add cover_url if it doesn't exist
    const booksInfo = db.prepare("PRAGMA table_info(books)").all() as any[];
    if (!booksInfo.some(col => col.name === 'cover_url')) {
      db.exec("ALTER TABLE books ADD COLUMN cover_url TEXT");
    }
    if (!booksInfo.some(col => col.name === 'pdf_file_path')) {
      db.exec("ALTER TABLE books ADD COLUMN pdf_file_path TEXT");
    }

    // Migration: Reflections (learning/application/disagreement -> content/rating)
    const reflectionsInfo = db.prepare("PRAGMA table_info(reflections)").all() as any[];
    if (!reflectionsInfo.some(col => col.name === 'learning')) {
      db.exec("ALTER TABLE reflections ADD COLUMN learning TEXT");
      db.exec("ALTER TABLE reflections ADD COLUMN application TEXT");
      db.exec("ALTER TABLE reflections ADD COLUMN disagreement TEXT");
    }
    if (!reflectionsInfo.some(col => col.name === 'content')) {
      db.exec("ALTER TABLE reflections ADD COLUMN content TEXT");
      db.exec("ALTER TABLE reflections ADD COLUMN rating INTEGER DEFAULT 5");
    }

    // Migration: Logs (add current_page if missing)
    const logsInfo = db.prepare("PRAGMA table_info(logs)").all() as any[];
    if (!logsInfo.some(col => col.name === 'current_page')) {
      db.exec("ALTER TABLE logs ADD COLUMN current_page INTEGER");
    }

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // Get all books
  app.get("/api/books", (req, res) => {
    try {
      console.log("Archive: Fetching volumes...");
      const books = db.prepare(`
        SELECT b.*, 
        (SELECT COUNT(*) FROM reflections r WHERE r.book_id = b.id AND r.learning IS NOT NULL AND r.learning != '') as is_full_reflection,
        (SELECT COUNT(*) FROM reflections r WHERE r.book_id = b.id) as has_reflection 
        FROM books b 
        ORDER BY b.created_at DESC
      `).all();
      
      // Convert 1/0 counts to booleans for the client if needed, 
      // but the client logic books.filter(b => b.is_full_reflection) will work with 1/0.
      res.json(books);
    } catch (error) {
      console.error("Archive Error: Failed to fetch books:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check - moved higher
  app.get("/api/health", (req, res) => {
    try {
      res.json({ status: "ok", sanctuary: "online" });
    } catch (e) {
      res.status(500).json({ error: "Sanctum unstable" });
    }
  });

  // Add new book
  app.post("/api/books", upload.fields([{ name: "cover", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), (req, res) => {
    try {
      const { title, author, total_pages, mode, cover_url: body_cover_url } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const cover_url = files?.cover?.[0] ? `/uploads/${files.cover[0].filename}` : (body_cover_url || null);
      const pdf_file_path = files?.pdf?.[0] ? `/uploads/${files.pdf[0].filename}` : null;

      const info = db.prepare(
        "INSERT INTO books (title, author, total_pages, mode, cover_url, pdf_file_path) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(title, author || "", total_pages, mode || "PHYSICAL", cover_url, pdf_file_path);
      
      const newBook = db.prepare("SELECT * FROM books WHERE id = ?").get(info.lastInsertRowid);
      res.json(newBook);
    } catch (error) {
      console.error("Error adding book:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single book detail
  app.get("/api/books/:id", (req, res) => {
    try {
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id) as any;
      if (!book) return res.status(404).json({ error: "Book not found" });
      
      const logs = db.prepare("SELECT * FROM logs WHERE book_id = ? ORDER BY id DESC").all(req.params.id);
      const reflection = db.prepare("SELECT * FROM reflections WHERE book_id = ?").get(req.params.id);
      
      res.json({ ...book, logs, reflection });
    } catch (error) {
      console.error("Error fetching book details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get logs for a book
  app.get("/api/books/:id/logs", (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM logs WHERE book_id = ? ORDER BY id DESC").all(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Log progress
  app.post("/api/books/:id/logs", (req, res) => {
    try {
      const { id } = req.params;
      const { currentPage, current_page, pagesRead, date, logId } = req.body;
      const effectiveCurrentPage = currentPage !== undefined ? currentPage : current_page;
      const logDate = date || new Date().toISOString();
      
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id) as any;
      if (!book) return res.status(404).json({ error: "Book not found" });

      // If absolute page is provided, use it. Otherwise use incremental.
      let newCurrentPage;
      let actualPagesRead = pagesRead;

      if (effectiveCurrentPage !== undefined) {
        newCurrentPage = Math.min(effectiveCurrentPage, book.total_pages);
        // For digital reading, we might update the same log.
        // If we are updating a log, we need the previous current_page from either the book or the log itself.
        // But the server-side calculation of pagesRead based on book.current_page is only valid for NEW logs.
        if (!logId) {
          actualPagesRead = Math.max(0, newCurrentPage - (book.current_page || 0));
        }
      } else {
        newCurrentPage = Math.min((book.current_page || 0) + (pagesRead || 0), book.total_pages);
        actualPagesRead = pagesRead || 0;
      }

      let newStatus = book.status;
      if (newCurrentPage > 0 && newStatus === 'NOT_STARTED') {
        newStatus = 'IN_PROGRESS';
      }
      if (newCurrentPage === book.total_pages) {
        newStatus = 'COMPLETED';
      }

      let returnedLogId = logId;

      db.transaction(() => {
        db.prepare("UPDATE books SET current_page = ?, status = ? WHERE id = ?")
          .run(newCurrentPage, newStatus, id);
        
        if (logId) {
          // Update existing log
          // We need to re-calculate pages_read based on the start of the session
          // but simpler is to let the client provide pagesRead if they are managing the session.
          if (pagesRead !== undefined) {
            db.prepare("UPDATE logs SET pages_read = ?, current_page = ? WHERE id = ?")
              .run(pagesRead, newCurrentPage, logId);
          } else if (effectiveCurrentPage !== undefined) {
            // If only current_page is provided, we might not know how many pages were read in total
            // unless we know the page when the log was first created.
            // For now, let's assume if logId is provided, the client should ideally provide pagesRead too.
            db.prepare("UPDATE logs SET current_page = ? WHERE id = ?")
              .run(newCurrentPage, logId);
          }
        } else {
          const info = db.prepare("INSERT INTO logs (book_id, date, pages_read, current_page) VALUES (?, ?, ?, ?)")
            .run(id, logDate, actualPagesRead, newCurrentPage);
          returnedLogId = info.lastInsertRowid;
        }
      })();

      res.json({ success: true, current_page: newCurrentPage, status: newStatus, logId: returnedLogId });
    } catch (error) {
      console.error("Error logging progress:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete book
  app.delete("/api/books/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.transaction(() => {
        db.prepare("DELETE FROM reflections WHERE book_id = ?").run(id);
        db.prepare("DELETE FROM logs WHERE book_id = ?").run(id);
        db.prepare("DELETE FROM books WHERE id = ?").run(id);
      })();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Direct page update (optional but requested "Mark as Completed")
  app.patch("/api/books/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, current_page } = req.body;
      
      const updates = [];
      const params = [];
      if (status) {
        updates.push("status = ?");
        params.push(status);
      }
      if (current_page !== undefined) {
        updates.push("current_page = ?");
        params.push(current_page);
      }
      params.push(id);

      if (updates.length > 0) {
        db.prepare(`UPDATE books SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reflection
  app.post("/api/books/:id/reflection", (req, res) => {
    try {
      const { id } = req.params;
      const { content, rating, learning, application, disagreement } = req.body;
      
      db.prepare(`
        INSERT INTO reflections (book_id, content, rating, learning, application, disagreement)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(book_id) DO UPDATE SET
          content=excluded.content,
          rating=excluded.rating,
          learning=excluded.learning,
          application=excluded.application,
          disagreement=excluded.disagreement
      `).run(id, content, rating, learning, application, disagreement);

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving reflection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/status", (req, res) => {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Logged today?
      // Use strftime to compare only the date part of the ISO string
      const loggedTodayResult = db.prepare("SELECT SUM(pages_read) as total FROM logs WHERE strftime('%Y-%m-%d', date) = ?").get(today) as any;
      const pagesReadToday = loggedTodayResult?.total || 0;

      // Current focus (most recently updated book)
      const currentFocus = db.prepare("SELECT * FROM books WHERE status = 'IN_PROGRESS' ORDER BY id DESC LIMIT 1").get() as any;

      // Library snapshot
      const totalBooks = db.prepare("SELECT COUNT(*) as count FROM books").get() as any;
      const completedBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE status = 'COMPLETED'").get() as any;

      res.json({ 
        loggedToday: pagesReadToday > 0,
        pagesReadToday,
        currentFocusId: currentFocus?.id || null,
        libraryStats: {
          total: totalBooks?.count || 0,
          completed: completedBooks?.count || 0
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Insights Dashboard
  app.get("/api/insights", (req, res) => {
    try {
      // 1. Total books completed
      const completedBooksCount = db.prepare("SELECT COUNT(*) as count FROM books WHERE status = 'COMPLETED'").get().count;

      // 2. Total pages read
      const totalPagesRead = db.prepare("SELECT SUM(pages_read) as total FROM logs").get().total || 0;

      // 3. Total reflections
      const totalReflections = db.prepare("SELECT COUNT(*) as count FROM reflections").get().count;

      // 4. Reading streak
      const logDates = db.prepare("SELECT DISTINCT strftime('%Y-%m-%d', date) as day FROM logs ORDER BY day DESC").all() as { day: string }[];
      
      let streak = 0;
      if (logDates.length > 0) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const latestLogDate = new Date(logDates[0].day);
        latestLogDate.setHours(0,0,0,0);

        // If the latest log is today or yesterday, we might have a streak
        if (latestLogDate.getTime() === today.getTime() || latestLogDate.getTime() === yesterday.getTime()) {
          streak = 1;
          let currentCheck = latestLogDate;
          for (let i = 1; i < logDates.length; i++) {
            const nextLogDate = new Date(logDates[i].day);
            nextLogDate.setHours(0,0,0,0);
            
            const expectedDate = new Date(currentCheck);
            expectedDate.setDate(expectedDate.getDate() - 1);

            if (nextLogDate.getTime() === expectedDate.getTime()) {
              streak++;
              currentCheck = nextLogDate;
            } else {
              break;
            }
          }
        }
      }

      // 5. Average pages per day (of days active)
      const activeDaysCount = logDates.length || 1;
      const averagePagesPerDay = Math.round(totalPagesRead / activeDaysCount);

      // 6. Last 35 days trend (5 full weeks to align grid)
      const last35Days = [];
      const now = new Date();
      
      // Calculate how many days to go back to start from a Sunday
      // now.getDay() returns 0 for Sunday, 1 for Monday, etc.
      // We want to show 5 full weeks ending with the current week's Saturday (or today)
      // To keep it simple and consistent: 35 days ending today.
      for (let i = 34; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        
        const dateStr = d.toISOString().split('T')[0];
        const pagesRead = db.prepare("SELECT SUM(pages_read) as total FROM logs WHERE strftime('%Y-%m-%d', date) = ?").get(dateStr).total || 0;
        last35Days.push({ 
          day: d.toLocaleDateString(undefined, { weekday: 'short' }), 
          pages: pagesRead, 
          fullDate: dateStr,
          dayOfWeek: d.getDay() // 0-6
        });
      }

      // 7. Recent reflections preview
      const recentReflections = db.prepare(`
        SELECT r.content, r.rating, b.title, b.author 
        FROM reflections r 
        JOIN books b ON r.book_id = b.id 
        ORDER BY r.id DESC 
        LIMIT 3
      `).all();

      res.json({
        stats: {
          completedBooks: completedBooksCount,
          totalPagesRead,
          totalReflections,
          streak,
          averagePagesPerDay
        },
        trend: last35Days,
        recentReflections
      });
    } catch (error) {
      console.error("Insights Error:", error);
      res.status(500).json({ error: "Failed to gather insights" });
    }
  });

  // 404 catch-all for API ONLY
  app.use("/api/*", (req, res) => {
    console.warn(`Attempt to access non-existent chronicle: ${req.method} ${req.url}`);
    res.status(404).json({ error: "Chronicle not found" });
  });

  // Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`--- The Archivist Server: Online at http://0.0.0.0:${PORT} ---`);
  });
  } catch (error) {
    console.error("!!! FATAL ERROR during server startup !!!");
    console.error(error);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error("Top-level promise rejection in server:", err);
});
