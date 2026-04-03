import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SubscriptionTiersProps {
  onCheckout: (tier: 'specialist' | 'consultant', plan: 'monthly' | 'yearly') => void;
  isCheckingOut: string | null;
  currentTier?: 'specialist' | 'consultant' | 'starter';
}

export const SubscriptionTiers: React.FC<SubscriptionTiersProps> = ({ onCheckout, isCheckingOut, currentTier = 'starter' }) => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 mb-16">
      <div className="text-center my-12">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1C1C1E] mb-6 tracking-tight">Choose the plan that fits your practice.</h2>
        <p className="text-gray-500 text-lg">Save hours of typing every week.</p>
      </div>

      <div className="flex flex-col items-center mb-16">
        <p className="text-gray-900 text-lg font-extrabold mb-4">Upgrade now with one click</p>
        <div className="flex gap-4 mb-8">
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <i className="fab fa-apple text-xl text-black"></i><span className="font-bold ml-1 text-lg text-black">Pay</span>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.3-4.74 3.3-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="font-bold text-lg text-[#5f6368]">Pay</span>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <i className="fab fa-amazon text-xl text-[#FF9900]"></i>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-500 text-xs font-bold tracking-widest uppercase">
          <i className="fas fa-lock text-[#E6192B] text-lg"></i>
          <span>100% Secure Checkout via Stripe. Cancel Anytime.</span>
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="flex justify-center items-center mb-12">
        <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 flex items-center gap-4">
          <span className={`text-sm font-bold pl-4 ${!isYearly ? 'text-[#1C1C1E]' : 'text-gray-500'}`}>Monthly</span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none ${isYearly ? 'bg-[#1C1C1E]' : 'bg-gray-200'}`}
          >
            <motion.div 
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm"
              animate={{ x: isYearly ? 28 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-bold pr-4 flex items-center gap-2 ${isYearly ? 'text-[#1C1C1E]' : 'text-gray-500'}`}>
            Yearly <span className="text-[#E6192B] text-xs font-bold">(Save ~17%)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
        {/* Starter Tier */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -5 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col h-full transition-all mt-8"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#1C1C1E] mb-2">Starter</h3>
            <p className="text-gray-500 text-sm">For trial & basic ultrasound reporting</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#1C1C1E]">$0</span>
              <span className="text-gray-500 text-sm font-medium">USD/forever</span>
            </div>
          </div>

          <button 
            disabled
            className={`w-full py-3.5 rounded-2xl font-bold border-2 mb-8 cursor-not-allowed ${currentTier === 'starter' ? 'border-[#1C1C1E] text-[#1C1C1E]' : 'border-gray-200 text-gray-400'}`}
          >
            {currentTier === 'starter' ? 'Current Plan' : 'Free Forever'}
          </button>

          <div className="space-y-4 mt-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm leading-5">Basic AI-Assisted Ultrasound</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm leading-5">Standard reporting templates</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm leading-5">OBGYNX Watermark on reports</span>
            </div>
          </div>
        </motion.div>

        {/* Specialist Tier (Highlighted) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ y: -10 }}
          className="bg-white rounded-2xl p-5 shadow-lg border-2 border-[#1C1C1E] flex flex-col h-full relative transition-all"
        >
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FFF0F0] text-[#E6192B] text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap border border-[#ffe0e0]">
            Most Popular
          </div>

          <div className="mb-6 mt-2">
            <h3 className="text-2xl font-bold text-[#1C1C1E] mb-2">Specialist</h3>
            <p className="text-gray-500 text-sm">For daily practice & independent clinics</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#1C1C1E]">${isYearly ? '150' : '15'}</span>
              <span className="text-gray-500 text-sm font-medium">USD/{isYearly ? 'year' : 'month'}</span>
            </div>
          </div>

          <button 
            onClick={() => onCheckout('specialist', isYearly ? 'yearly' : 'monthly')}
            disabled={isCheckingOut !== null || currentTier === 'specialist'}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all mb-8 shadow-md flex justify-center items-center gap-2 ${currentTier === 'specialist' ? 'bg-gray-100 text-gray-500 border-2 border-gray-200 cursor-not-allowed' : 'bg-[#1C1C1E] text-white hover:bg-gray-800'}`}
          >
            {isCheckingOut === `specialist-${isYearly ? 'yearly' : 'monthly'}` ? <i className="fas fa-circle-notch fa-spin"></i> : null}
            {currentTier === 'specialist' ? 'Current Plan' : 'Upgrade to Specialist'}
          </button>

          <div className="space-y-4 mt-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium leading-5">Everything in Starter +</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium leading-5">Advanced AI analysis tools</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium leading-5">Save patient history</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium leading-5">Standard OBGYNX Branding</span>
            </div>
          </div>
        </motion.div>

        {/* Consultant Tier */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ y: -5 }}
          className="bg-white rounded-2xl p-5 shadow-sm border-2 border-[#D4AF37] flex flex-col h-full relative transition-all mt-8"
        >
          <div className="absolute -top-3 right-8 bg-[#F4D03F] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            ELITE
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#1C1C1E] mb-2">Consultant</h3>
            <p className="text-gray-500 text-sm">For advanced cases & premium branding</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#1C1C1E]">${isYearly ? '300' : '30'}</span>
              <span className="text-gray-500 text-sm font-medium">USD/{isYearly ? 'year' : 'month'}</span>
            </div>
          </div>

          <button 
            onClick={() => onCheckout('consultant', isYearly ? 'yearly' : 'monthly')}
            disabled={isCheckingOut !== null || currentTier === 'consultant'}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all mb-8 flex justify-center items-center gap-2 ${currentTier === 'consultant' ? 'bg-gray-100 text-gray-500 border-2 border-gray-200 cursor-not-allowed' : 'bg-[#D4AF37] text-white hover:bg-[#b8962f]'}`}
          >
            {isCheckingOut === `consultant-${isYearly ? 'yearly' : 'monthly'}` ? <i className="fas fa-circle-notch fa-spin"></i> : null}
            {currentTier === 'consultant' ? 'Current Plan' : 'Upgrade to Consultant'}
          </button>

          <div className="space-y-4 mt-auto">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm leading-5">Everything in Specialist +</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-bold text-[#D4AF37] leading-5">Custom Clinic Branding</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm leading-5">Multi-device synchronization</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm leading-5">Priority customer support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
