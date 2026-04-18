import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("reading_tracker.db");

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
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
    const app = express();
    const PORT = 3000;

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

  // Health check
  app.get("/api/health", (req, res) => {
    try {
      db.prepare("SELECT count(*) FROM books").get();
      res.json({ status: "ok", timestamp: new Date().toISOString(), database: "connected" });
    } catch (e) {
      res.status(500).json({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  });

  // API Routes
  
  // Get all books
  app.get("/api/books", (req, res) => {
    try {
      const books = db.prepare(`
        SELECT b.*, 
        CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_reflection 
        FROM books b 
        LEFT JOIN reflections r ON b.id = r.book_id 
        ORDER BY b.created_at DESC
      `).all();
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add new book
  app.post("/api/books", upload.single("cover"), (req, res) => {
    try {
      const { title, author, total_pages, mode } = req.body;
      const cover_url = req.file ? `/uploads/${req.file.filename}` : null;

      const info = db.prepare(
        "INSERT INTO books (title, author, total_pages, mode, cover_url) VALUES (?, ?, ?, ?, ?)"
      ).run(title, author || "", total_pages, mode || "PHYSICAL", cover_url);
      
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
      const { currentPage, current_page, pagesRead, date } = req.body;
      const effectiveCurrentPage = currentPage !== undefined ? currentPage : current_page;
      const logDate = date || new Date().toISOString().split('T')[0];
      
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id) as any;
      if (!book) return res.status(404).json({ error: "Book not found" });

      // If absolute page is provided, use it. Otherwise use incremental.
      let newCurrentPage;
      let actualPagesRead = pagesRead;

      if (effectiveCurrentPage !== undefined) {
        newCurrentPage = Math.min(effectiveCurrentPage, book.total_pages);
        actualPagesRead = Math.max(0, newCurrentPage - (book.current_page || 0));
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

      db.transaction(() => {
        db.prepare("UPDATE books SET current_page = ?, status = ? WHERE id = ?")
          .run(newCurrentPage, newStatus, id);
        
        db.prepare("INSERT INTO logs (book_id, date, pages_read, current_page) VALUES (?, ?, ?, ?)")
          .run(id, logDate, actualPagesRead, newCurrentPage);
      })();

      res.json({ success: true, current_page: newCurrentPage, status: newStatus });
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
      const today = new Date().toISOString().split('T')[0];
      
      // Logged today?
      const loggedTodayResult = db.prepare("SELECT SUM(pages_read) as total FROM logs WHERE date = ?").get(today) as any;
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
  } catch (error) {
    console.error("FATAL ERROR during server startup:", error);
    process.exit(1);
  }
}

startServer();
