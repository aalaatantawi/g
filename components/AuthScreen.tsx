import React from 'react';
import { loginWithGoogle } from '../firebase';

const AuthScreen: React.FC = () => {
  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Failed to sign in with Google', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-[#F2F2F7] dark:bg-[#121212] transition-colors">
      <div className="w-full max-w-md p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-[#1E1E1E] shadow-2xl dark:shadow-none border border-black/5 dark:border-white/10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tighter text-black dark:text-white">
            OBGYN<span className="text-red-600">X</span>
          </h1>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white leading-tight tracking-tight">
            The world-class ultrasound reporting AI assistant for OB-GYNs.
          </h1>
        </div>

        {/* Description */}
        <div className="text-center mb-10">
          <h2 className="text-lg md:text-xl font-bold text-black dark:text-white mb-1 opacity-80">Focus on the Diagnosis.</h2>
          <h2 className="text-lg md:text-xl font-bold text-red-600">We'll Handle the Paperwork.</h2>
        </div>

        {/* Sign In Section */}
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#1E1E1E] px-4 text-gray-500 font-bold tracking-widest">Sign In to your account</span>
            </div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white text-black border border-gray-300 rounded-2xl py-4 px-4 hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
            <span className="font-bold">Continue with Google</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400 mt-10 font-medium uppercase tracking-widest">
          Secure HIPAA-Compliant Infrastructure
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
