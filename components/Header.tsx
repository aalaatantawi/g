import React, { useState, useEffect } from 'react';
import { Crown, Lock, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showModal, setShowModal] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleTabClick = (type: 'branding' | 'history') => {
    if (type === 'branding') {
      setShowModal({
        title: "Unlock Custom Clinic Branding!",
        message: "Upgrade to the Consultant plan to add your own logo, doctor name, and customize report colors."
      });
    } else {
      setShowModal({
        title: "Upgrade to see your patient history",
        message: "Upgrade to access your patient history and review past reports quickly."
      });
    }
  };

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
          <div className="h-6 w-px bg-black/10 dark:bg-white/10 hidden sm:block"></div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight leading-none text-[#E6192B] dark:text-[#FF4444]">
              AI <span className="font-normal text-[#1C1C1E] dark:text-white opacity-60 ml-1 hidden sm:inline">| OBGYN Ultrasound reporting system</span>
            </h1>
          </div>
        </div>
        
        <nav className="flex items-center gap-6">
          <button className="text-sm font-bold text-[#1C1C1E] dark:text-white">Dashboard</button>
          <button onClick={() => handleTabClick('branding')} className="flex items-center gap-2 text-sm font-bold text-[#1C1C1E] dark:text-white">
            Clinic Branding <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="bg-[#D4AF37] text-white text-[10px] px-1.5 py-0.5 rounded">Consultant Only</span>
          </button>
          <button onClick={() => handleTabClick('history')} className="flex items-center gap-2 text-sm font-bold text-[#1C1C1E] dark:text-white">
            Patient History <Lock className="w-4 h-4 text-gray-500" />
            <span className="bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded">Only</span>
          </button>
        </nav>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-2xl max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-gray-500"><X /></button>
            <h3 className="text-xl font-bold mb-4 text-[#1C1C1E] dark:text-white">{showModal.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{showModal.message}</p>
            <button className="w-full py-3 bg-[#E6192B] text-white rounded-xl font-bold">Upgrade Now</button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
