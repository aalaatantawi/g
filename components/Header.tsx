import React, { useState, useEffect } from 'react';
import { Crown, Lock, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      </div>
    </header>
  );
};

export default Header;
