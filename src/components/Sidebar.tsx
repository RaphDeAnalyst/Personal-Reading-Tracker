import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
  currentView: string;
}

export default function Sidebar({ isOpen, onClose, onNavigate, currentView }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Library', icon: 'import_contacts' },
    { id: 'add', label: 'Add New Book', icon: 'add_circle' },
    { id: 'reflection-index', label: 'Reflections', icon: 'auto_stories' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-on-background/20 backdrop-blur-[2px] z-[60] lg:hidden"
            />
            
            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-background border-r border-outline-variant/10 z-[70] shadow-2xl lg:shadow-none flex flex-col"
            >
              <div className="p-6 h-16 flex items-center justify-between border-b border-outline-variant/5">
                <span className="font-headline italic text-xl tracking-tight text-on-surface">Archivist</span>
                <button 
                  onClick={onClose}
                  className="p-2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="flex-1 py-8 px-4 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        onNavigate({ type: item.id });
                        onClose();
                      }
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                      currentView === item.id 
                        ? 'bg-primary/5 text-primary' 
                        : item.disabled 
                          ? 'opacity-40 cursor-not-allowed' 
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span 
                      className="material-symbols-outlined text-[22px]"
                      style={{ fontVariationSettings: currentView === item.id ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    <span className="font-label text-xs uppercase tracking-[0.15em] font-semibold">
                      {item.label}
                    </span>
                    {currentView === item.id && (
                      <motion.div 
                        layoutId="active-pill"
                        className="ml-auto w-1 h-4 bg-primary rounded-full"
                      />
                    )}
                  </button>
                ))}
              </nav>

              <div className="p-6 border-t border-outline-variant/5 bg-surface-container-lowest/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/20">
                    <img 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                      src="https://picsum.photos/seed/archivist/100/100"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label text-xs font-bold text-on-surface">The Archivist</span>
                    <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Master of Tomes</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
