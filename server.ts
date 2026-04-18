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
    learning TEXT,
    application TEXT,
    disagreement TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
  );
`);

// Migration: Add cover_url if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(books)").all() as any[];
const hasCoverUrl = tableInfo.some(col => col.name === 'cover_url');
if (!hasCoverUrl) {
  db.exec("ALTER TABLE books ADD COLUMN cover_url TEXT");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  
  // Get all books
  app.get("/api/books", (req, res) => {
    try {
      const books = db.prepare("SELECT * FROM books ORDER BY created_at DESC").all();
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
      
      const logs = db.prepare("SELECT * FROM logs WHERE book_id = ? ORDER BY date DESC").all(req.params.id);
      const reflection = db.prepare("SELECT * FROM reflections WHERE book_id = ?").get(req.params.id);
      
      res.json({ ...book, logs, reflection });
    } catch (error) {
      console.error("Error fetching book details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Log progress
  app.post("/api/books/:id/logs", (req, res) => {
    try {
      const { id } = req.params;
      const { pagesRead, date } = req.body;
      
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id) as any;
      if (!book) return res.status(404).json({ error: "Book not found" });

      // Update current_page and status
      const newCurrentPage = Math.min((book.current_page || 0) + pagesRead, book.total_pages);
      let newStatus = book.status;
      if (newCurrentPage > 0 && newStatus === 'NOT_STARTED') {
        newStatus = 'IN_PROGRESS';
      }

      db.transaction(() => {
        db.prepare("UPDATE books SET current_page = ?, status = ? WHERE id = ?")
          .run(newCurrentPage, newStatus, id);
        
        db.prepare("INSERT INTO logs (book_id, date, pages_read) VALUES (?, ?, ?)")
          .run(id, date, pagesRead);
      })();

      res.json({ success: true, current_page: newCurrentPage, status: newStatus });
    } catch (error) {
      console.error("Error logging progress:", error);
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
      const { learning, application, disagreement } = req.body;
      
      db.prepare(`
        INSERT INTO reflections (book_id, learning, application, disagreement)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(book_id) DO UPDATE SET
          learning=excluded.learning,
          application=excluded.application,
          disagreement=excluded.disagreement
      `).run(id, learning, application, disagreement);

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
      const result = db.prepare("SELECT COUNT(*) as count FROM logs WHERE date = ?").get(today) as any;
      res.json({ loggedToday: result ? result.count > 0 : false });
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
}

startServer();
