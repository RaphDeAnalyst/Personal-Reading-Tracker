// Map Material Symbols icon names to Lucide React icon components
import {
  Plus, PlusCircle, ArrowLeft, ChevronDown, ChevronUp, ArrowRight,
  BookOpen, Book, CheckCircle, ChevronLeft, ChevronRight, X,
  Trash2, Edit, Calendar, Quote, HelpCircle, Clock,
  Download, Info, Landscape, Lock, Menu, FileText,
  Brain, Search, SearchX, Settings, Star, Target, TrendingUp, Upload,
  Zap, MoreVertical
} from 'lucide-react';

export const iconMap: Record<string, any> = {
  add: Plus,
  add_circle: PlusCircle,
  arrow_back: ArrowLeft,
  arrow_drop_down: ChevronDown,
  arrow_drop_up: ChevronUp,
  arrow_forward: ArrowRight,
  auto_stories: BookOpen,
  book: Book,
  check_circle: CheckCircle,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  delete: Trash2,
  edit: Edit,
  edit_note: Edit,
  event_note: Calendar,
  format_quote: Quote,
  help: HelpCircle,
  history_edu: Clock,
  import_contacts: Download,
  info: Info,
  landscape: Landscape,
  lock_open: Lock,
  menu: Menu,
  menu_book: BookOpen,
  picture_as_pdf: FileText,
  psychology: Brain,
  search: Search,
  search_off: SearchX,
  settings: Settings,
  star: Star,
  target: Target,
  trending_up: TrendingUp,
  upload_file: Upload,
  // Fallback for any missing icons
  default: Zap,
};

export function getIcon(name: string) {
  return iconMap[name] || iconMap.default;
}
