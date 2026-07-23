import React, { useState, useEffect } from 'react';
import { LiteratureItem } from '../types';
import { Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PoetryRitualProps {
  literature: LiteratureItem[];
  onClose: () => void;
  onReadItem: (item: LiteratureItem) => void;
}

export default function PoetryRitual({ literature, onClose, onReadItem }: PoetryRitualProps) {
  const [step, setStep] = useState(0);
  const [ritualItems, setRitualItems] = useState<LiteratureItem[]>([]);

  useEffect(() => {
    if (literature.length >= 3) {
      // Pick 3 random items for the ritual
      const shuffled = [...literature].sort(() => 0.5 - Math.random());
      setRitualItems(shuffled.slice(0, 3));
    } else {
      setRitualItems(literature);
    }
  }, [literature]);

  const handleNext = () => {
    if (navigator.vibrate) navigator.vibrate(100);
    
    if (step < ritualItems.length - 1) {
      setStep(prev => prev + 1);
    } else {
      toast.success('Ritual complete. Your soul is nourished.', { icon: '🌌' });
      onClose();
    }
  };

  const handleDeepRead = () => {
    if (ritualItems[step]) {
      onReadItem(ritualItems[step]);
    }
  };

  if (ritualItems.length === 0) {
    return (
      <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-8 text-center animate-fade-in">
        <p className="font-serif text-stone-600">The void is empty today. No ritual available.</p>
        <button onClick={onClose} className="mt-4 text-[#bf9b30] hover:underline font-serif text-sm">Close</button>
      </div>
    );
  }

  const currentItem = ritualItems[step];

  return (
    <div className="bg-[#1C1917] text-stone-200 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden animate-fade-in border border-[#bf9b30]/20 max-w-4xl mx-auto">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#bf9b30] rounded-full blur-3xl mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-stone-500 rounded-full blur-3xl mix-blend-screen"></div>
      </div>

      <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors z-10 text-stone-400 hover:text-white">
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 text-center space-y-8">
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-6 h-6 text-[#bf9b30]" />
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-light tracking-wide text-white">Daily Poetry Ritual</h2>
          <p className="text-xs font-mono text-stone-400 tracking-widest uppercase">
            Step {step + 1} of {ritualItems.length}
          </p>
        </div>

        <div className="min-h-[200px] flex flex-col justify-center items-center max-w-2xl mx-auto bg-white/5 p-8 rounded-2xl backdrop-blur-sm border border-white/10 transition-all duration-500">
          <p className="font-serif text-lg md:text-xl text-stone-300 leading-relaxed italic mb-6">
            "{currentItem.originalText}"
          </p>
          <p className="font-serif text-sm text-[#bf9b30]">
            — {currentItem.author}
          </p>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={handleDeepRead}
            className="px-6 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-serif text-sm transition-all"
          >
            Study this Verse
          </button>
          
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-[#bf9b30] hover:bg-[#a28021] text-white font-serif text-sm transition-all flex items-center gap-2"
          >
            {step < ritualItems.length - 1 ? (
              <>Breathe & Continue <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Complete Ritual <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
