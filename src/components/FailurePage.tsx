import React, { useEffect } from 'react';

const FailurePage: React.FC = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="text-center">
        <div className="text-6xl text-red-500 mb-6"><i className="fas fa-times-circle"></i></div>
        <h1 className="text-3xl font-bold text-[#1C1C1E]">Payment cancelled</h1>
        <p className="text-[#86868b] mt-4">Redirecting to dashboard...</p>
      </div>
    </div>
  );
};

export default FailurePage;
