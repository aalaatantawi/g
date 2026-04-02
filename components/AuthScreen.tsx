import React from 'react';
import { loginWithGoogle } from '../firebase';

interface AuthScreenProps {
  isDarkMode?: boolean;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ isDarkMode }) => {
  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Failed to sign in with Google', err);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#121212]' : 'bg-[#F2F2F7]'}`}>
      <div className={`w-full max-w-md p-8 rounded-3xl ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'} shadow-sm`}>
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter text-black dark:text-white">
            OBGYN<span className="text-red-600">X</span>
          </h1>
          <p className="text-sm text-gray-400 tracking-widest uppercase">AI SYSTEMS</p>
        </div>

        {/* Headline (was Description) */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            The world-class ultrasound reporting AI assistant for OB-GYNs.
          </h1>
        </div>

        {/* Description (was Headline) */}
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold text-black dark:text-white mb-1">Focus on the Diagnosis.</h2>
          <h2 className="text-xl font-bold text-red-600">We'll Handle the Paperwork.</h2>
        </div>

        {/* Sign In Text */}
        <p className="text-center font-bold text-black dark:text-white mb-6">Sign In to your account</p>

        {/* Google Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black border border-gray-300 rounded-full py-3 px-4 mb-6 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
          <span className="font-medium">Continue with Google</span>
        </button>

        {/* Email Link */}
        <div className="text-center mb-10">
          <a href="#" className="text-gray-500 underline text-sm">Or sign in with email</a>
        </div>

        {/* Sign Up Footer */}
        <div className="text-center text-gray-500 text-sm">
          Don't have an account? <a href="#" className="text-black dark:text-white font-bold underline">Sign Up</a>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
