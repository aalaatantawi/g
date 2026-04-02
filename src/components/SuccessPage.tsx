import React, { useEffect } from 'react';
import { db } from '../../firebase.ts';
import { doc, updateDoc } from 'firebase/firestore';

interface SuccessPageProps {
  user: any;
}

const SuccessPage: React.FC<SuccessPageProps> = ({ user }) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const handleUpgrade = async () => {
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { isPro: true });
          console.log("User upgraded to Pro successfully");
        } catch (err) {
          console.error("Error upgrading user:", err);
        }
        
        timer = setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    handleUpgrade();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="text-center">
        <div className="text-6xl text-green-500 mb-6"><i className="fas fa-check-circle"></i></div>
        <h1 className="text-3xl font-bold text-[#1C1C1E]">Payment successful</h1>
        <p className="text-[#86868b] mt-4">Redirecting to dashboard...</p>
      </div>
    </div>
  );
};

export default SuccessPage;
