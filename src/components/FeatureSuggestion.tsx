import React, { useState } from 'react';
import { MessageSquarePlus, Send, Loader2, PenTool, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

export default function FeatureSuggestion() {
  const { user, signInWithGoogle, updateUserStats } = useAuth();
  const [activeTab, setActiveTab] = useState<'suggestion' | 'submit'>('submit');

  const [feature, setFeature] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

  const [poemTitle, setPoemTitle] = useState('');
  const [poemContent, setPoemContent] = useState('');
  const [poemCategory, setPoemCategory] = useState('ghazal');
  const [isSubmittingPoem, setIsSubmittingPoem] = useState(false);

  const handleFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feature.trim()) {
      toast.error('Feature title is required.');
      return;
    }

    setIsSubmittingFeature(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, message, email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.msg || 'Suggestion sent successfully!');
        setFeature('');
        setMessage('');
        setEmail('');
      } else {
        toast.error(data.error || 'Failed to send suggestion.');
      }
    } catch (err) {
      toast.error('Network error. Failed to reach the void.');
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  const handlePoemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be signed in to submit writings.");
      return;
    }
    if (!poemTitle.trim() || !poemContent.trim()) {
      toast.error('Title and content are required.');
      return;
    }

    setIsSubmittingPoem(true);
    try {
      const submissionId = uuidv4();
      await setDoc(doc(db, 'user_submissions', submissionId), {
        userId: user.uid,
        author: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        title: poemTitle,
        originalText: poemContent,
        category: poemCategory,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      await updateUserStats({ writtenCount: 1, reviewCount: 1 });
      
      toast.success('Your writing has been submitted for review!');
      setPoemTitle('');
      setPoemContent('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmittingPoem(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#bf9b30]/20 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-sm animate-fade-in">
      
      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-stone-100 p-1.5 rounded-xl border border-stone-200/50">
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-serif tracking-wide transition-all flex items-center justify-center gap-2 ${
            activeTab === 'submit' 
              ? 'bg-white shadow-sm text-stone-800 font-bold border border-stone-200/50' 
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <PenTool className="w-4 h-4 text-[#bf9b30]" />
          Submit Writing
        </button>
        <button
          onClick={() => setActiveTab('suggestion')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-serif tracking-wide transition-all flex items-center justify-center gap-2 ${
            activeTab === 'suggestion' 
              ? 'bg-white shadow-sm text-stone-800 font-bold border border-stone-200/50' 
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4 text-[#bf9b30]" />
          App Suggestion
        </button>
      </div>

      {activeTab === 'suggestion' && (
        <form onSubmit={handleFeatureSubmit} className="space-y-4 animate-fade-in">
          <div className="mb-6">
            <h2 className="font-serif text-lg font-semibold text-stone-800">Whisper a Suggestion</h2>
            <p className="text-xs text-stone-500 font-mono mt-0.5">Help us shape the future of The Muted Void</p>
          </div>
          <div>
            <label className="block text-xs font-mono text-stone-500 mb-1">Feature Title *</label>
            <input
              type="text"
              required
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="e.g. Add dark mode, Add Mirza Ghalib collection..."
              className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] focus:ring-1 focus:ring-[#bf9b30]/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-stone-500 mb-1">Detailed Thoughts (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How would this feature improve your experience?"
              rows={4}
              className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] focus:ring-1 focus:ring-[#bf9b30]/50 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-stone-500 mb-1">Email (Optional, for updates)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="wanderer@example.com"
              className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] focus:ring-1 focus:ring-[#bf9b30]/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingFeature || !feature.trim()}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-stone-100 rounded-xl py-3.5 px-4 text-sm font-serif font-medium transition-all flex items-center justify-center gap-2 group"
          >
            {isSubmittingFeature ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            ) : (
              <>
                <span>Send Whisper</span>
                <Send className="w-4 h-4 text-stone-400 group-hover:text-stone-100 group-hover:translate-x-1 transition-all" />
              </>
            )}
          </button>
        </form>
      )}

      {activeTab === 'submit' && (
        <div className="animate-fade-in">
          <div className="mb-6">
            <h2 className="font-serif text-lg font-semibold text-stone-800">Publish Your Art</h2>
            <p className="text-xs text-stone-500 font-mono mt-0.5">Submit your poetic work for review. Once approved by the admin, it will be published in the Mehfil.</p>
          </div>

          {!user ? (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 text-center space-y-4">
              <PenTool className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-serif text-stone-600">Please sign in to submit your writings and track their status.</p>
              <button
                onClick={signInWithGoogle}
                className="mx-auto flex items-center gap-2 bg-[#bf9b30] hover:bg-[#a28021] text-white px-5 py-2.5 rounded-lg text-sm font-medium font-serif transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Google
              </button>
            </div>
          ) : (
            <form onSubmit={handlePoemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-stone-500 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={poemTitle}
                  onChange={(e) => setPoemTitle(e.target.value)}
                  placeholder="The Silent Echo"
                  className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] focus:ring-1 focus:ring-[#bf9b30]/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-500 mb-1">Category *</label>
                <select
                  value={poemCategory}
                  onChange={(e) => setPoemCategory(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] focus:ring-1 focus:ring-[#bf9b30]/50 transition-all"
                >
                  <option value="ghazal">Ghazal</option>
                  <option value="nazm">Nazm</option>
                  <option value="sher">Sher</option>
                  <option value="rubai">Rubai</option>
                  <option value="doha">Doha</option>
                  <option value="english-poetry">English Poetry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-500 mb-1">Your Words *</label>
                <textarea
                  required
                  value={poemContent}
                  onChange={(e) => setPoemContent(e.target.value)}
                  placeholder="Write your verses here..."
                  rows={8}
                  className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] focus:ring-1 focus:ring-[#bf9b30]/50 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPoem || !poemTitle.trim() || !poemContent.trim()}
                className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-stone-100 rounded-xl py-3.5 px-4 text-sm font-serif font-medium transition-all flex items-center justify-center gap-2 group mt-2"
              >
                {isSubmittingPoem ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                ) : (
                  <>
                    <span>Submit for Review</span>
                    <Send className="w-4 h-4 text-stone-400 group-hover:text-stone-100 group-hover:translate-x-1 transition-all" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
