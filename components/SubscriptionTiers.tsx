import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SubscriptionTiersProps {
  onCheckout: (tier: 'consultant' | 'enterprise', plan: 'monthly' | 'yearly') => void;
  isCheckingOut: string | null;
}

export const SubscriptionTiers: React.FC<SubscriptionTiersProps> = ({ onCheckout, isCheckingOut }) => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 mb-16">
      <div className="text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-black text-[#1C1C1E] mb-4 tracking-tight">Choose the plan that fits your practice.</h2>
        <p className="text-gray-500 text-lg">Save hours of typing every week.</p>
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

      <div className="flex flex-col items-center mb-16">
        <p className="text-gray-500 text-sm font-medium mb-4">Upgrade Now</p>
        <div className="flex gap-4 mb-8">
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <i className="fab fa-apple text-xl"></i><span className="font-bold ml-1 text-lg">Pay</span>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <i className="fab fa-google text-xl text-gray-500"></i><span className="font-bold ml-1 text-gray-500 text-lg">Pay</span>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <i className="fab fa-amazon text-xl"></i>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-500 text-xs font-bold tracking-widest uppercase">
          <i className="fas fa-lock text-[#E6192B] text-lg"></i>
          <span>100% Secure Checkout via Stripe. Cancel Anytime.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
        {/* Starter Tier */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -5 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-md border border-gray-200 flex flex-col h-full transition-shadow mt-8"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-black text-[#1C1C1E] mb-2">Starter</h3>
            <p className="text-gray-500 text-sm">For trial & basic use</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-[#1C1C1E]">$0</span>
              <span className="text-gray-500 text-sm font-medium">USD/forever</span>
            </div>
          </div>

          <button 
            disabled
            className="w-full py-3.5 rounded-2xl font-bold border-2 border-gray-200 text-gray-400 mb-8 cursor-not-allowed"
          >
            Current Plan
          </button>

          <div className="space-y-4 mt-auto">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm">Up to 3 reports per month</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm">Basic AI summaries</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
              <span className="text-gray-600 text-sm">Standard processing speed</span>
            </div>
          </div>
        </motion.div>

        {/* Consultant Tier (Highlighted) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ y: -10 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl border-2 border-[#1C1C1E] flex flex-col h-full relative transition-all"
        >
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FFF0F0] text-[#E6192B] text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap border border-[#ffe0e0]">
            Recommended for Consultants
          </div>

          <div className="mb-6 mt-2">
            <h3 className="text-2xl font-black text-[#1C1C1E] mb-2">Consultant</h3>
            <p className="text-gray-500 text-sm">For independent experts</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-[#1C1C1E]">${isYearly ? '149' : '14.99'}</span>
              <span className="text-gray-500 text-sm font-medium">USD/{isYearly ? 'yr' : 'month'}</span>
            </div>
            {isYearly && <p className="text-gray-500 text-sm font-medium mt-1">${(149/12).toFixed(2)}/month</p>}
          </div>

          <button 
            onClick={() => onCheckout('consultant', isYearly ? 'yearly' : 'monthly')}
            disabled={isCheckingOut !== null}
            className="w-full py-3.5 bg-[#1C1C1E] text-white rounded-2xl font-bold hover:bg-gray-800 transition-all mb-8 shadow-md flex justify-center items-center gap-2"
          >
            {isCheckingOut === `consultant-${isYearly ? 'yearly' : 'monthly'}` ? <i className="fas fa-circle-notch fa-spin"></i> : null}
            Upgrade to Consultant
          </button>

          <div className="space-y-4 mt-auto">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium">AI-Assisted Ultrasound Summaries</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium">Reports with Your Clinic Logo</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium">Up to 100 reports per month</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#E6192B] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm font-medium">Priority processing speed</span>
            </div>
          </div>
        </motion.div>

        {/* Enterprise Tier */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ y: -5 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-md border border-gray-200 flex flex-col h-full relative transition-shadow mt-8"
        >
          <div className="absolute -top-3 right-8 bg-[#F4D03F] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            ELITE
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-black text-[#1C1C1E] mb-2">Enterprise</h3>
            <p className="text-gray-500 text-sm">For large clinics</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-[#1C1C1E]">${isYearly ? '139' : '39.99'}</span>
              <span className="text-gray-500 text-sm font-medium">USD/{isYearly ? 'yr' : 'month'}</span>
            </div>
            {isYearly && <p className="text-gray-500 text-sm font-medium mt-1">${(139/12).toFixed(2)}/month</p>}
          </div>

          <button 
            onClick={() => onCheckout('enterprise', isYearly ? 'yearly' : 'monthly')}
            disabled={isCheckingOut !== null}
            className="w-full py-3.5 bg-white text-[#1C1C1E] border border-gray-300 rounded-2xl font-bold hover:border-gray-400 hover:bg-gray-50 transition-all mb-8 flex justify-center items-center gap-2"
          >
            {isCheckingOut === `enterprise-${isYearly ? 'yearly' : 'monthly'}` ? <i className="fas fa-circle-notch fa-spin"></i> : null}
            Upgrade to Enterprise
          </button>

          <div className="space-y-4 mt-auto">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">Unlimited Fetal Medicine Records</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">Advanced Image Analysis</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">Custom Clinic Workflows</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#F4D03F] shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">Priority 24/7 Support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
