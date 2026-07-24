import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2, Calendar, IndianRupee, Scissors, Globe, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TourStep {
  title: string;
  description: string;
  targetId?: string;
  icon: React.ElementType;
  badge?: string;
  actionText?: string;
  link?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Nexora Owner Portal! 👋",
    description: "Manage your salon/shop bookings, staff, revenue, and customer relationships all in one clean place.",
    icon: Compass,
    badge: "Step 1 of 5"
  },
  {
    title: "Key Performance Metrics 📊",
    description: "Monitor your daily bookings, revenue collected, customer count, pending approvals, and wallet balance in real-time.",
    icon: IndianRupee,
    targetId: "kpi-grid",
    badge: "Step 2 of 5"
  },
  {
    title: "Today's Appointment Schedule 🗓️",
    description: "Track upcoming client visits, check-in status, client contact details, and update booking status with a single tap.",
    icon: Calendar,
    targetId: "schedule-section",
    badge: "Step 3 of 5"
  },
  {
    title: "Quick Business Actions ⚡",
    description: "Easily add manual walk-in bookings, publish new haircut/spa services, upload showcase gallery photos, or tweak your customer booking website.",
    icon: Scissors,
    targetId: "quick-actions-section",
    badge: "Step 4 of 5"
  },
  {
    title: "Revenue Insights & Recent Activity 📈",
    description: "Analyze weekly income trends, payout histories, customer reviews, and automated store updates as they happen.",
    icon: Globe,
    targetId: "revenue-section",
    badge: "Step 5 of 5"
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      if (onComplete) onComplete();
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden relative"
        >
          {/* Header decoration */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close Tour"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md">
                {step.badge}
              </span>
              <span className="text-xs text-blue-100 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Interactive Guide
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md shrink-0">
                <step.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-snug">{step.title}</h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-slate-600 leading-relaxed text-base">
              {step.description}
            </p>

            {/* Step indicators */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? 'w-6 bg-blue-600'
                        : idx < currentStep
                        ? 'w-2 bg-blue-300'
                        : 'w-2 bg-slate-200'
                    }`}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-slate-400">
                {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                {isLast ? (
                  <>
                    Get Started <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
