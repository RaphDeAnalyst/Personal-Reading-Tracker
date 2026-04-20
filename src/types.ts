export type BookStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ReadingMode = 'PHYSICAL' | 'DIGITAL';

export interface Tag {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: BookStatus;
  mode: ReadingMode;
  cover_url?: string;
  pdf_file_path?: string;
  isbn?: string;
  description?: string;
  publisher?: string;
  publication_year?: number;
  created_at: string;
  has_reflection?: boolean;
  is_full_reflection?: boolean;
}

export interface ReadingLog {
  id: number;
  book_id: number;
  date: string;
  pages_read: number;
  current_page: number;
  created_at: string;
}

export type Log = ReadingLog;

export interface Reflection {
  id: number;
  book_id: number;
  content: string;
  rating: number;
  learning?: string;
  application?: string;
  disagreement?: string;
}

export interface BookDetail extends Book {
  logs: Log[];
  reflection: Reflection | null;
  tags?: Tag[];
}
