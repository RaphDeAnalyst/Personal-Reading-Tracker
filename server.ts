import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import dotenv from "dotenv";
import { initializeBackupManager } from "./backupManager.js";

dotenv.config();

console.log("--- The Archivist Server: Sequential Startup Initiated ---");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: InstanceType<typeof Database>;

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DATABASE_URL || "reading_tracker.db";

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

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (ALLOWED_PDF_TYPES.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Only PDF files are allowed for the pdf field'));
    }
    if (file.fieldname === 'cover') {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Only JPEG, PNG, WebP, or GIF files are allowed for cover images'));
    }
    cb(null, true);
  }
});

async function startServer() {
  try {
    console.log(`Initializing database connection at ${DB_PATH}...`);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize backup manager
    initializeBackupManager({
      db,
      dbPath: DB_PATH,
      backupDir: path.join(process.cwd(), "backups"),
      retentionDays: 30,
    });

    const app = express();

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
        isbn TEXT,
        description TEXT,
        publisher TEXT,
        publication_year INTEGER,
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
    if (!booksInfo.some(col => col.name === 'isbn')) {
      db.exec("ALTER TABLE books ADD COLUMN isbn TEXT");
    }
    if (!booksInfo.some(col => col.name === 'description')) {
      db.exec("ALTER TABLE books ADD COLUMN description TEXT");
    }
    if (!booksInfo.some(col => col.name === 'publisher')) {
      db.exec("ALTER TABLE books ADD COLUMN publisher TEXT");
    }
    if (!booksInfo.some(col => col.name === 'publication_year')) {
      db.exec("ALTER TABLE books ADD COLUMN publication_year INTEGER");
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

    // Tables: tags, reading_goals, goal_completions
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS book_tags (
        book_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (book_id, tag_id),
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reading_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER UNIQUE NOT NULL,
        target_value INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goal_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, book_id)
      );
    `);

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_goal_completions_year ON goal_completions(year);`).run();

    // Run ALL goal_completions column migrations BEFORE the backfill so every column exists
    const gcInfo = db.prepare("PRAGMA table_info(goal_completions)").all() as any[];
    const gcHas = (col: string) => gcInfo.some((c: any) => c.name === col);
    if (!gcHas('title'))            db.exec("ALTER TABLE goal_completions ADD COLUMN title TEXT");
    if (!gcHas('author'))           db.exec("ALTER TABLE goal_completions ADD COLUMN author TEXT");
    if (!gcHas('total_pages'))      db.exec("ALTER TABLE goal_completions ADD COLUMN total_pages INTEGER");
    if (!gcHas('mode'))             db.exec("ALTER TABLE goal_completions ADD COLUMN mode TEXT");
    if (!gcHas('cover_url'))        db.exec("ALTER TABLE goal_completions ADD COLUMN cover_url TEXT");
    if (!gcHas('isbn'))             db.exec("ALTER TABLE goal_completions ADD COLUMN isbn TEXT");
    if (!gcHas('publisher'))        db.exec("ALTER TABLE goal_completions ADD COLUMN publisher TEXT");
    if (!gcHas('publication_year')) db.exec("ALTER TABLE goal_completions ADD COLUMN publication_year INTEGER");

    // Backfill goal_completions — only insert rows that are genuinely missing (idempotent)
    const booksToBackfill = db.prepare(`
      SELECT id, created_at, title, author, total_pages, mode, cover_url, isbn, publisher, publication_year
      FROM books
      WHERE status = 'COMPLETED'
        AND id NOT IN (SELECT book_id FROM goal_completions)
    `).all() as any[];

    if (booksToBackfill.length > 0) {
      db.transaction(() => {
        for (const book of booksToBackfill) {
          const latestLog = db.prepare(
            "SELECT MAX(date) as latest FROM logs WHERE book_id = ?"
          ).get(book.id) as { latest: string | null };
          const completedDate = latestLog.latest || book.created_at || new Date().toISOString();
          const year = new Date(completedDate).getFullYear();
          db.prepare(`
            INSERT OR IGNORE INTO goal_completions
              (year, book_id, completed_at, title, author, total_pages, mode, cover_url, isbn, publisher, publication_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            year, book.id, completedDate,
            book.title, book.author, book.total_pages,
            book.mode, book.cover_url, book.isbn,
            book.publisher, book.publication_year
          );
        }
      })();
      console.log(`✓ Backfilled goal_completions for ${booksToBackfill.length} completed books`);
    }

    // Patch any existing rows that are missing snapshot fields (from earlier schema versions)
    db.prepare(`
      UPDATE goal_completions
      SET
        title            = COALESCE(title,            (SELECT title            FROM books WHERE id = goal_completions.book_id)),
        author           = COALESCE(author,            (SELECT author           FROM books WHERE id = goal_completions.book_id)),
        total_pages      = COALESCE(total_pages,       (SELECT total_pages      FROM books WHERE id = goal_completions.book_id)),
        mode             = COALESCE(mode,              (SELECT mode             FROM books WHERE id = goal_completions.book_id)),
        cover_url        = COALESCE(cover_url,         (SELECT cover_url        FROM books WHERE id = goal_completions.book_id)),
        isbn             = COALESCE(isbn,              (SELECT isbn             FROM books WHERE id = goal_completions.book_id)),
        publisher        = COALESCE(publisher,         (SELECT publisher        FROM books WHERE id = goal_completions.book_id)),
        publication_year = COALESCE(publication_year,  (SELECT publication_year FROM books WHERE id = goal_completions.book_id))
      WHERE EXISTS (SELECT 1 FROM books WHERE id = goal_completions.book_id)
        AND (title IS NULL OR mode IS NULL OR total_pages IS NULL)
    `).run();

    // completion_reflections: immutable reflection snapshots
    db.exec(`
      CREATE TABLE IF NOT EXISTS completion_reflections (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id       INTEGER NOT NULL UNIQUE,
        title         TEXT NOT NULL,
        author        TEXT,
        rating        INTEGER,
        content       TEXT,
        learning      TEXT,
        application   TEXT,
        disagreement  TEXT,
        saved_at      DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.prepare(`
      INSERT OR IGNORE INTO completion_reflections
        (book_id, title, author, rating, content, learning, application, disagreement, saved_at)
      SELECT
        r.book_id, b.title, b.author, r.rating, r.content, r.learning, r.application, r.disagreement, r.created_at
      FROM reflections r
      JOIN books b ON r.book_id = b.id
      WHERE b.status = 'COMPLETED'
    `).run();
    console.log("✓ Migrations complete");

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Request logging middleware (API routes only)
  app.use("/api", (req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // ISBN Lookup API (Phase 2 - Automated Metadata)
  app.get("/api/books/lookup", async (req, res) => {
    try {
      const { isbn } = req.query;
      if (!isbn || typeof isbn !== 'string') {
        return res.status(400).json({ error: "ISBN parameter is required" });
      }

      // Clean ISBN (remove dashes/spaces)
      const cleanIsbn = isbn.replace(/[-\s]/g, "");
      if (cleanIsbn.length === 13 && !/^\d{13}$/.test(cleanIsbn)) {
        return res.status(400).json({ error: "Invalid ISBN-13: must be exactly 13 digits." });
      } else if (cleanIsbn.length === 10 && !/^\d{9}[\dXx]$/.test(cleanIsbn)) {
        return res.status(400).json({ error: "Invalid ISBN-10: must be 9 digits followed by a digit or X." });
      } else if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
        return res.status(400).json({ error: "Invalid ISBN format. Must be 10 or 13 digits." });
      }

      console.log(`Archivist: Consulting external scrolls for ISBN ${cleanIsbn}...`);
      
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
      const data = await response.json() as any;
      const bookKey = `ISBN:${cleanIsbn}`;

      if (!data[bookKey]) {
        return res.status(404).json({ error: "Volume not found in the Open Library archives" });
      }

      const info = data[bookKey];
      
      // Map Open Library data to our schema
      const mappedData = {
        title: info.title || "",
        author: info.authors ? info.authors.map((a: any) => a.name).join(", ") : "",
        publisher: info.publishers ? info.publishers.map((p: any) => p.name).join(", ") : "",
        publication_year: info.publish_date ? parseInt(info.publish_date.match(/\d{4}/)?.[0] || "") : null,
        total_pages: info.number_of_pages || info.pagination || null,
        description: info.notes || (info.excerpts ? info.excerpts[0].text : ""),
        cover_url: info.cover ? (info.cover.large || info.cover.medium || info.cover.small) : null,
        isbn: cleanIsbn
      };

      res.json(mappedData);
    } catch (error) {
      console.error("Lookup Error:", error);
      res.status(500).json({ error: "Failed to connect to external metadata service" });
    }
  });

  // Reading Archive: Get all goal completions with book and reflection data
  app.get("/api/goals/reading-list", (req, res) => {
    try {
      const entries = db.prepare(`
        SELECT
          gc.id, gc.year, gc.book_id, gc.completed_at,
          COALESCE(b.title,            gc.title)            AS title,
          COALESCE(b.author,           gc.author)           AS author,
          COALESCE(b.total_pages,      gc.total_pages)      AS total_pages,
          COALESCE(b.mode,             gc.mode)             AS mode,
          COALESCE(b.cover_url,        gc.cover_url)        AS cover_url,
          COALESCE(b.isbn,             gc.isbn)             AS isbn,
          COALESCE(b.publisher,        gc.publisher)        AS publisher,
          COALESCE(b.publication_year, gc.publication_year) AS publication_year,
          b.pdf_file_path,
          (b.id IS NOT NULL) AS book_exists,
          r.id AS reflection_id, r.rating, r.content,
          r.learning, r.application, r.disagreement
        FROM goal_completions gc
        LEFT JOIN books b ON gc.book_id = b.id
        LEFT JOIN reflections r ON gc.book_id = r.book_id
        ORDER BY gc.completed_at DESC
      `).all();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching reading list:", error);
      res.status(500).json({ error: "Failed to fetch reading list" });
    }
  });

  // Monthly completions grouped by year and month — drives the historical chart
  app.get("/api/goals/monthly-stats", (_req, res) => {
    try {
      const rows = db.prepare(`
        SELECT
          year,
          CAST(strftime('%m', completed_at) AS INTEGER) AS month,
          COUNT(*) AS count
        FROM goal_completions
        GROUP BY year, month
        ORDER BY year, month
      `).all();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ error: "Failed to fetch monthly stats" });
    }
  });

  // All goal targets across all years — lets the frontend show goal lines for any year
  app.get("/api/goals/all", (_req, res) => {
    try {
      const goals = db.prepare("SELECT year, target_value FROM reading_goals ORDER BY year DESC").all();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching all goals:", error);
      res.status(500).json({ error: "Failed to fetch all goals" });
    }
  });

  // Goals API (Phase 2 - Basic Reading Goals)
  app.get("/api/goals/:year", (req, res) => {
    try {
      const { year } = req.params;
      const goal = db.prepare("SELECT * FROM reading_goals WHERE year = ?").get(year);
      res.json(goal || { year: parseInt(year), target_value: 0 });
    } catch (error) {
      console.error("Error fetching reading goal:", error);
      res.status(500).json({ error: "Failed to fetch reading goal" });
    }
  });

  app.post("/api/goals", (req, res) => {
    try {
      const { year, target_value } = req.body;
      if (!year || target_value === undefined) {
        return res.status(400).json({ error: "Year and target_value are required" });
      }

      db.prepare(`
        INSERT INTO reading_goals (year, target_value)
        VALUES (?, ?)
        ON CONFLICT(year) DO UPDATE SET target_value = excluded.target_value
      `).run(year, target_value);

      const goal = db.prepare("SELECT * FROM reading_goals WHERE year = ?").get(year);
      res.json(goal);
    } catch (error) {
      console.error("Error updating reading goal:", error);
      res.status(500).json({ error: "Internal server error while updating goal" });
    }
  });

  // Get all books
  app.get("/api/books", (req, res) => {
    try {
      console.log("Archive: Fetching volumes...");
      const books = db.prepare(`
        SELECT b.*,
        (SELECT COUNT(*) FROM reflections r WHERE r.book_id = b.id AND r.learning IS NOT NULL AND r.learning != '') as is_full_reflection,
        (SELECT COUNT(*) FROM reflections r WHERE r.book_id = b.id) as has_reflection,
        json_group_array(json_object('id', t.id, 'name', t.name)) as tags
        FROM books b
        LEFT JOIN book_tags bt ON b.id = bt.book_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `).all() as any[];

      // Parse tags JSON and filter out null entries
      const processedBooks = books.map(b => ({
        ...b,
        tags: b.tags ? JSON.parse(b.tags).filter((t: any) => t && t.id !== null) : []
      }));

      res.json(processedBooks);
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

  // Tags API (Phase 1 - Basic Tagging)
  app.get("/api/tags", (req, res) => {
    try {
      const tags = db.prepare("SELECT * FROM tags ORDER BY name").all();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: "Failed to fetch tags from archive" });
    }
  });

  app.post("/api/tags", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "A valid tag name is required" });
      }
      
      const trimmedName = name.trim();
      
      // Check for existing tag to provide better error
      const existing = db.prepare("SELECT id FROM tags WHERE name = ?").get(trimmedName);
      if (existing) {
        return res.status(409).json({ error: "This tag already exists in the archive" });
      }

      const result = db.prepare("INSERT INTO tags (name) VALUES (?)").run(trimmedName);
      const newTag = db.prepare("SELECT * FROM tags WHERE id = ?").get(result.lastInsertRowid);
      res.status(201).json(newTag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ error: "Internal server error while creating tag" });
    }
  });

  // Get tags for a specific book
  app.get("/api/books/:id/tags", (req, res) => {
    try {
      const { id } = req.params;
      const bookExists = db.prepare("SELECT id FROM books WHERE id = ?").get(id);
      if (!bookExists) {
        return res.status(404).json({ error: "Volume not found" });
      }

      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN book_tags bt ON t.id = bt.tag_id
        WHERE bt.book_id = ?
        ORDER BY t.name
      `).all(id);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching book tags:", error);
      res.status(500).json({ error: "Internal server error while fetching volume tags" });
    }
  });

  // Update tags for a book (replaces all tags)
  app.post("/api/books/:id/tags", (req, res) => {
    try {
      const { tagIds } = req.body;
      const bookId = req.params.id;

      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ error: "tagIds must be an array" });
      }

      if (tagIds.some((tid: any) => !Number.isInteger(tid) || tid <= 0)) {
        return res.status(400).json({ error: "All tagIds must be positive integers" });
      }

      const bookExists = db.prepare("SELECT id FROM books WHERE id = ?").get(bookId);
      if (!bookExists) {
        return res.status(404).json({ error: "Volume not found" });
      }

      // Verify all supplied tag IDs exist
      if (tagIds.length > 0) {
        const placeholders = tagIds.map(() => '?').join(',');
        const foundTags = db.prepare(`SELECT COUNT(*) as count FROM tags WHERE id IN (${placeholders})`).get(...tagIds) as any;
        if (foundTags.count !== tagIds.length) {
          return res.status(400).json({ error: "One or more tag IDs do not exist" });
        }
      }

      db.transaction(() => {
        db.prepare("DELETE FROM book_tags WHERE book_id = ?").run(bookId);
        if (tagIds.length > 0) {
          const insert = db.prepare("INSERT INTO book_tags (book_id, tag_id) VALUES (?, ?)");
          for (const tagId of tagIds) {
            insert.run(bookId, tagId);
          }
        }
      })();
      
      res.json({ success: true, message: "Tags updated successfully" });
    } catch (error) {
      console.error("Error updating book tags:", error);
      res.status(500).json({ error: "Internal server error while updating volume tags" });
    }
  });

  // Add new book
  app.post("/api/books", upload.fields([{ name: "cover", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), (req, res) => {
    try {
      const { title, author, total_pages, mode, cover_url: body_cover_url, isbn, description, publisher, publication_year } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      const parsedPages = parseInt(total_pages, 10);
      if (!total_pages || isNaN(parsedPages) || parsedPages < 1) {
        return res.status(400).json({ error: "total_pages must be a positive integer" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const cover_url = files?.cover?.[0] ? `/uploads/${files.cover[0].filename}` : (body_cover_url || null);
      const pdf_file_path = files?.pdf?.[0] ? `/uploads/${files.pdf[0].filename}` : null;

      const info = db.prepare(
        "INSERT INTO books (title, author, total_pages, mode, cover_url, pdf_file_path, isbn, description, publisher, publication_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(title.trim(), author || "", parsedPages, mode || "PHYSICAL", cover_url, pdf_file_path, isbn || null, description || null, publisher || null, publication_year || null);

      const newBook = db.prepare("SELECT * FROM books WHERE id = ?").get(info.lastInsertRowid);
      res.json(newBook);
    } catch (error: any) {
      if (error?.message?.includes('Only')) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error adding book:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single book detail
  app.get("/api/books/:id", (req, res) => {
    try {
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id) as any;
      if (!book) return res.status(404).json({ error: "Book not found" });
      
      const logs = db.prepare("SELECT * FROM logs WHERE book_id = ? ORDER BY id DESC LIMIT 100").all(req.params.id);
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

        if (logId) {
          // Updating an existing log (PDF reader session): client owns pages_read accounting.
          // If pagesRead is provided use it; otherwise derive from the log's own starting page.
          if (pagesRead !== undefined) {
            actualPagesRead = pagesRead;
          } else {
            const existingLog = db.prepare("SELECT current_page FROM logs WHERE id = ?").get(logId) as any;
            const sessionStartPage = existingLog
              ? (existingLog.current_page - (existingLog.pages_read ?? 0))
              : (book.current_page || 0);
            actualPagesRead = Math.max(0, newCurrentPage - sessionStartPage);
          }
        } else {
          // New log from absolute page (physical book / LogProgressView).
          // Guard: refuse to move the book backward — this prevents accidental typos
          // from corrupting the cumulative pages_read total.
          if (newCurrentPage < (book.current_page || 0)) {
            return res.status(400).json({
              error: "Page cannot go backward. Enter a page number greater than your current progress.",
              current_page: book.current_page
            });
          }
          actualPagesRead = newCurrentPage - (book.current_page || 0);
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

      // All writes — including archive records — are atomic
      db.transaction(() => {
        db.prepare("UPDATE books SET current_page = ?, status = ? WHERE id = ?")
          .run(newCurrentPage, newStatus, id);

        if (logId) {
          db.prepare("UPDATE logs SET pages_read = ?, current_page = ? WHERE id = ?")
            .run(actualPagesRead, newCurrentPage, logId);
        } else {
          const info = db.prepare("INSERT INTO logs (book_id, date, pages_read, current_page) VALUES (?, ?, ?, ?)")
            .run(id, logDate, actualPagesRead, newCurrentPage);
          returnedLogId = info.lastInsertRowid;
        }

        if (newStatus === 'COMPLETED' && book.status !== 'COMPLETED') {
          const year = new Date().getFullYear();
          const bookSnap = db.prepare(
            "SELECT title, author, total_pages, mode, cover_url, isbn, publisher, publication_year FROM books WHERE id = ?"
          ).get(id) as any;
          db.prepare(`
            INSERT OR IGNORE INTO goal_completions
              (year, book_id, completed_at, title, author, total_pages, mode, cover_url, isbn, publisher, publication_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            year, id, new Date().toISOString(),
            bookSnap?.title, bookSnap?.author, bookSnap?.total_pages,
            bookSnap?.mode, bookSnap?.cover_url, bookSnap?.isbn,
            bookSnap?.publisher, bookSnap?.publication_year
          );

          const existingReflection = db.prepare("SELECT * FROM reflections WHERE book_id = ?").get(id) as any;
          if (existingReflection) {
            db.prepare(`
              INSERT INTO completion_reflections
                (book_id, title, author, rating, content, learning, application, disagreement, saved_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(book_id) DO UPDATE SET
                rating=excluded.rating, content=excluded.content,
                learning=excluded.learning, application=excluded.application,
                disagreement=excluded.disagreement, saved_at=excluded.saved_at
            `).run(
              id, bookSnap?.title, bookSnap?.author,
              existingReflection.rating, existingReflection.content,
              existingReflection.learning, existingReflection.application,
              existingReflection.disagreement
            );
          }
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
      const deleteBook = db.transaction(() => {
        db.prepare("DELETE FROM reflections WHERE book_id = ?").run(id);
        // Logs are intentionally kept — they record real reading activity on real days.
        // Deleting them would erase pages-read-today, heatmap, and streak history.
        db.prepare("DELETE FROM book_tags WHERE book_id = ?").run(id);
        db.prepare("DELETE FROM books WHERE id = ?").run(id);
      });
      deleteBook();
      console.log(`Book ${id} removed from library`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Direct page update / status update
  app.patch("/api/books/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status, current_page } = req.body;

      const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      // C3: validate current_page is a non-negative integer
      if (current_page !== undefined) {
        const parsedPage = Number(current_page);
        if (!Number.isInteger(parsedPage) || parsedPage < 0) {
          return res.status(400).json({ error: "current_page must be a non-negative integer" });
        }
      }

      const book = db.prepare("SELECT status, title, author, total_pages FROM books WHERE id = ?").get(id) as any;
      if (!book) return res.status(404).json({ error: "Book not found" });

      const updates: string[] = [];
      const params: any[] = [];
      if (status !== undefined) {
        updates.push("status = ?");
        params.push(status);
        if (status === 'COMPLETED') {
          updates.push("current_page = ?");
          params.push(book.total_pages);
        }
      }
      if (current_page !== undefined && status !== 'COMPLETED') {
        updates.push("current_page = ?");
        params.push(Math.floor(Number(current_page)));
      }
      params.push(id);

      // All writes are atomic
      db.transaction(() => {
        if (updates.length > 0) {
          db.prepare(`UPDATE books SET ${updates.join(", ")} WHERE id = ?`).run(...params);
        }

        if (status === 'COMPLETED' && book.status !== 'COMPLETED') {
          const year = new Date().getFullYear();
          const bookSnap = db.prepare(
            "SELECT title, author, total_pages, mode, cover_url, isbn, publisher, publication_year FROM books WHERE id = ?"
          ).get(id) as any;
          db.prepare(`
            INSERT OR IGNORE INTO goal_completions
              (year, book_id, completed_at, title, author, total_pages, mode, cover_url, isbn, publisher, publication_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            year, id, new Date().toISOString(),
            bookSnap?.title, bookSnap?.author, bookSnap?.total_pages,
            bookSnap?.mode, bookSnap?.cover_url, bookSnap?.isbn,
            bookSnap?.publisher, bookSnap?.publication_year
          );

          const existingReflection = db.prepare("SELECT * FROM reflections WHERE book_id = ?").get(id) as any;
          if (existingReflection) {
            db.prepare(`
              INSERT INTO completion_reflections
                (book_id, title, author, rating, content, learning, application, disagreement, saved_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(book_id) DO UPDATE SET
                rating=excluded.rating, content=excluded.content,
                learning=excluded.learning, application=excluded.application,
                disagreement=excluded.disagreement, saved_at=excluded.saved_at
            `).run(
              id, bookSnap?.title, bookSnap?.author,
              existingReflection.rating, existingReflection.content,
              existingReflection.learning, existingReflection.application,
              existingReflection.disagreement
            );
          }
        }
      })();

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

      // Snapshot reflection into completion_reflections if book is COMPLETED
      const bookStatus = db.prepare("SELECT status, title, author FROM books WHERE id = ?").get(id) as any;
      if (bookStatus?.status === 'COMPLETED') {
        db.prepare(`
          INSERT INTO completion_reflections (book_id, title, author, rating, content, learning, application, disagreement, saved_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(book_id) DO UPDATE SET
            rating=excluded.rating,
            content=excluded.content,
            learning=excluded.learning,
            application=excluded.application,
            disagreement=excluded.disagreement,
            saved_at=excluded.saved_at
        `).run(id, bookStatus.title, bookStatus.author, rating, content, learning, application, disagreement);
      }

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
      // Use UTC date string to match how ISO log timestamps are stored
      const today = now.toISOString().split('T')[0];

      const loggedTodayResult = db.prepare("SELECT SUM(pages_read) as total FROM logs WHERE strftime('%Y-%m-%d', date) = ?").get(today) as any;
      const pagesReadToday = loggedTodayResult?.total || 0;

      // Current focus (most recently updated book)
      const currentFocus = db.prepare("SELECT * FROM books WHERE status = 'IN_PROGRESS' ORDER BY id DESC LIMIT 1").get() as any;

      // Library snapshot
      const totalBooks = db.prepare("SELECT COUNT(*) as count FROM books").get() as any;
      const completedBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE status = 'COMPLETED'").get() as any;

      // Goal completions for current year
      const currentYear = now.getFullYear();
      const goalCompletions = db.prepare("SELECT COUNT(*) as count FROM goal_completions WHERE year = ?").get(currentYear) as any;

      res.json({
        loggedToday: pagesReadToday > 0,
        pagesReadToday,
        currentFocusId: currentFocus?.id || null,
        libraryStats: {
          total: totalBooks?.count || 0,
          completed: completedBooks?.count || 0,
          goalCompletions: goalCompletions?.count || 0
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
      // 1. Total books completed (immutable: from goal_completions)
      const completedBooksCount = (db.prepare("SELECT COUNT(*) as count FROM goal_completions").get() as any).count;

      // 2. Total pages read (immutable: from goal_completions)
      const totalPagesRead = (db.prepare("SELECT COALESCE(SUM(total_pages), 0) as total FROM goal_completions").get() as any).total;

      // 3. Total reflections (immutable: from completion_reflections)
      const totalReflections = (db.prepare("SELECT COUNT(*) as count FROM completion_reflections").get() as any).count;

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

      // 5. Average pages per day (actual pages logged, not total_pages of completed books)
      const totalPagesLogged = (db.prepare("SELECT COALESCE(SUM(pages_read), 0) as total FROM logs").get() as any).total;
      const activeDaysCount = logDates.length || 1;
      const averagePagesPerDay = Math.round(totalPagesLogged / activeDaysCount);

      // 6. Last 35 days trend — single aggregation query, UTC dates
      const now = new Date();
      const trendStart = new Date(now);
      trendStart.setDate(trendStart.getDate() - 34);
      const trendStartStr = trendStart.toISOString().split('T')[0];

      const trendRows = db.prepare(`
        SELECT strftime('%Y-%m-%d', date) AS day, SUM(pages_read) AS total
        FROM logs
        WHERE strftime('%Y-%m-%d', date) >= ?
        GROUP BY day
      `).all(trendStartStr) as { day: string; total: number }[];

      const trendMap = new Map(trendRows.map(r => [r.day, r.total]));

      const last35Days = [];
      for (let i = 34; i >= 0; i--) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last35Days.push({
          day: d.toLocaleDateString(undefined, { weekday: 'short' }),
          pages: trendMap.get(dateStr) || 0,
          fullDate: dateStr,
          dayOfWeek: d.getUTCDay()
        });
      }

      // 7. Recent reflections preview (immutable: from completion_reflections)
      const recentReflections = db.prepare(`
        SELECT content, rating, title, author
        FROM completion_reflections
        ORDER BY saved_at DESC
        LIMIT 3
      `).all();

      // 8. Genre Distribution (Tags — completed books only)
      const genreDistribution = db.prepare(`
        SELECT t.name, COUNT(bt.book_id) as count
        FROM tags t
        JOIN book_tags bt ON t.id = bt.tag_id
        JOIN books b ON bt.book_id = b.id
        WHERE b.status = 'COMPLETED'
        GROUP BY t.id
        ORDER BY count DESC
        LIMIT 6
      `).all();

      // 9. Author Distribution (immutable: from goal_completions)
      const authorDistribution = db.prepare(`
        SELECT author, COUNT(*) as count
        FROM goal_completions
        WHERE author IS NOT NULL AND author != ''
        GROUP BY author
        ORDER BY count DESC
        LIMIT 5
      `).all();

      // 10. Reading Consistency Score (last 30 days, UTC)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];

      const activeDaysResult = db.prepare(`
        SELECT COUNT(DISTINCT strftime('%Y-%m-%d', date)) as activeDays
        FROM logs
        WHERE strftime('%Y-%m-%d', date) >= ?
      `).get(dateLimit) as { activeDays: number };

      const activeDays = activeDaysResult?.activeDays || 0;
      const consistencyScore = Math.round((activeDays / 30) * 100);

      let consistencyLevel = "Wandering";
      if (consistencyScore > 80) consistencyLevel = "Unyielding";
      else if (consistencyScore > 60) consistencyLevel = "Dedicated";
      else if (consistencyScore > 40) consistencyLevel = "Steady";
      else if (consistencyScore > 20) consistencyLevel = "Casual";

      // Goal completions for current year
      const currentYear = new Date().getFullYear();
      const goalCompletionsCount = (db.prepare("SELECT COUNT(*) as count FROM goal_completions WHERE year = ?").get(currentYear) as any).count || 0;

      res.json({
        stats: {
          completedBooks: completedBooksCount,
          goalCompletions: goalCompletionsCount,
          totalPagesRead,
          totalReflections,
          streak,
          averagePagesPerDay,
          consistencyScore,
          consistencyLevel
        },
        trend: last35Days,
        recentReflections,
        genreDistribution,
        authorDistribution
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

    // SPA fallback for dev mode - serve index.html for all non-API routes
    app.use((req, res) => {
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"><\/script>
          </body>
        </html>
      `);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback for production - serve index.html for all non-API/non-static routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
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
