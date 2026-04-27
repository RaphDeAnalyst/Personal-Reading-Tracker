# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Archivist** is a full-stack personal reading tracker that combines quantitative tracking (pages read) with qualitative synthesis (reflections). The app supports both physical books and digital PDFs with an integrated reader, structured reflection system, and analytics dashboard.

## Running the Project

### Prerequisites
- Node.js (v18+)
- GEMINI_API_KEY in `.env.local` or environment

### Development Commands
```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Build for production
npm run preview               # Preview production build locally
npm run clean                 # Remove dist directory
npm run lint                  # Run TypeScript type checking
```

The dev server runs `tsx server.ts`, which starts an Express server with Vite HMR for React hot-reloading.

## Architecture

### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Framer Motion
- **Backend:** Node.js/Express (ES modules), TypeScript
- **Database:** SQLite3 (better-sqlite3)
- **File Storage:** Local filesystem (uploads/)
- **PDF Handling:** pdfjs-dist
- **API Integration:** Google Gemini AI

### Key Files & Structure

#### Backend (server.ts)
- Express server with Vite dev middleware
- SQLite database setup and migrations
- RESTful API endpoints for books, logs, reflections, tags, and reading goals
- Multer file upload handling for PDFs and cover images
- Database path configurable via `DATABASE_URL` env var (default: `reading_tracker.db`)

#### Frontend (src/)
- **App.tsx:** Main component routing between views (Dashboard, Insights, AddBook, BookDetail, etc.)
- **types.ts:** TypeScript interfaces for Book, Reflection, ReadingLog, Tag, ReadingGoal, BookDetail
- **components/:** Reusable view components
  - **Dashboard.tsx:** Overview with stats, progress bars, and trend visualization
  - **InsightsView.tsx:** Advanced analytics (35-day trends, reading consistency)
  - **AddBook.tsx:** Book creation with metadata, tags, PDF/cover uploads
  - **BookDetailView.tsx:** Book details, reading logs, tag management
  - **ReflectionView.tsx:** Reflection editor with learning/application/disagreement fields
  - **ReflectionIndexView.tsx:** List of all reflections
  - **LogProgressView.tsx:** Reading log tracking interface
  - **PDFReader.tsx:** Integrated PDF viewer with page sync
  - **Sidebar.tsx:** Navigation menu

### Database Schema

**books** table:
- Core fields: id, title, author, total_pages, current_page, status, mode, created_at
- Metadata: isbn, description, publisher, publication_year
- Media: cover_url, pdf_file_path
- Status values: NOT_STARTED | IN_PROGRESS | COMPLETED
- Mode values: PHYSICAL | DIGITAL

**logs** table:
- Daily reading progress: id, book_id, date, pages_read, created_at
- Foreign key to books(id)

**reflections** table:
- User reflection per book (1:1): id, book_id, content, rating, created_at
- Rating: 1-5 scale
- Foreign key to books(id) UNIQUE

**tags** table:
- id, name (TEXT UNIQUE)

**book_tags** junction table:
- Relates books to tags: book_id, tag_id
- CASCADE DELETE on both sides

**reading_goals** table:
- Annual goals: id, year, target_value, created_at

## Development Workflow

### Adding API Endpoints
1. Define endpoint in server.ts (Express route)
2. Update frontend types in src/types.ts if needed
3. Add fetch call in React component
4. Test with browser DevTools Network tab or curl

### Adding React Components
1. Create .tsx file in src/components/
2. Use TypeScript for type safety
3. Import from lucide-react for icons, motion for animations
4. Style with Tailwind utilities (no separate CSS files)
5. Update App.tsx routing/navigation if needed

### Database Changes
- Migrations run automatically on server start (server.ts lines 49-126)
- Add new migrations to the db.exec() block before ALTER TABLE statements
- Use PRAGMA table_info() checks to make migrations idempotent

### File Uploads
- PDF and cover images stored in uploads/ (auto-created if missing)
- Multer configured with timestamp + random suffix naming
- Uploaded file path stored in books.pdf_file_path or cover_url

## Implementation Phases

**Phase 1 (Complete):** Foundation with tags, enriched metadata (ISBN, description, publisher, publication_year)

**Phase 2 (In Progress):** Automated metadata fetching, reading goals system, structured reflection prompts

**Phase 3 (Planned):** Genre/author distribution, reading consistency scores, robust search & filtering

See IMPLEMENTATION_STATUS.md for detailed progress tracking.

## Notes

- TypeScript path alias `@/*` resolves to repo root
- `process.env.DISABLE_HMR=true` disables Vite HMR (set by AI Studio)
- No test suite currently; validate manually in browser or via API
- Gemini API integration present in some components but not fully documented
- Database must be initialized before API calls; all tables created on first run
