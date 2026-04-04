import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const Header: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 dark:border-white/10 h-[64px] flex items-center bg-[#FAF9F6]/80 dark:bg-[#121212]/80 backdrop-blur-md transition-colors">
      <div className="container mx-auto px-6 max-w-[1200px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="https://obgynx.com" target="_blank" rel="noopener noreferrer" className="flex items-center hover:opacity-70 transition-opacity">
            <span className="text-2xl font-black tracking-tighter">
              <span className="text-black dark:text-white">OBGYN</span>
              <span className="text-[#E6192B] dark:text-[#FF4444]">X</span>
            </span>
          </a>
        </div>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition-all"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
