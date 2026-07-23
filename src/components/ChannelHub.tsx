import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Youtube, Instagram, MessageSquareCode, Send, Heart, Loader2, Sparkles, User, 
  Play, Eye, EyeOff, X, Film, Sparkle, Plus, Trash2, Check, RefreshCw, FileText, 
  FolderPlus, Lock, Unlock, HelpCircle 
} from 'lucide-react';
import { saveSuggestion, fetchRecentSuggestions, MasterpieceSuggestion, db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'sonner';

import ReviewModal from './ReviewModal';

function QueueManager({ onApprove, creatorPassword }: { onApprove?: () => void, creatorPassword?: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingSub, setReviewingSub] = useState<any | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const q = query(collection(db, 'user_submissions'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const subs: any[] = [];
      querySnapshot.forEach((doc) => {
        subs.push({ id: doc.id, ...doc.data() });
      });
      setSubmissions(subs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (updatedData: any, originalSub: any) => {
    try {
      const newItemId = uuidv4();
      await setDoc(doc(db, 'literature', newItemId), {
        title: updatedData.title,
        author: updatedData.author,
        category: updatedData.category,
        originalText: updatedData.originalText,
        romanizedText: updatedData.romanizedText || '',
        englishTranslation: updatedData.englishTranslation || '',
        vocabulary: updatedData.vocabulary || [],
        datePublished: new Date().toISOString(),
        popularity: 'standard',
        viewsCount: 0,
        likesCount: 0
      });

      await updateDoc(doc(db, 'user_submissions', originalSub.id), { status: 'approved' });
      
      if (originalSub.userId) {
        await updateDoc(doc(db, 'users', originalSub.userId), {
          publishedCount: increment(1),
          reviewCount: increment(-1)
        });
      }

      toast.success('Submission approved and published!');
      setSubmissions(prev => prev.filter(s => s.id !== originalSub.id));
      setReviewingSub(null);
      if (onApprove) onApprove();
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve submission.');
    }
  };

  const handleReject = async (subId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'user_submissions', subId), { status: 'rejected' });
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          reviewCount: increment(-1)
        });
      }
      toast.success('Submission rejected.');
      setSubmissions(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject submission.');
    }
  };

  if (loading) return <div className="p-4 text-center text-stone-500 font-serif text-sm">Loading queue...</div>;

  if (submissions.length === 0) return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 text-center text-stone-500 font-serif text-xs">
      <Check className="w-6 h-6 text-stone-400 mx-auto mb-2" />
      <h5 className="font-semibold text-stone-700">All Caught Up!</h5>
      <p className="mt-1">There are no pending submissions in the queue.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {reviewingSub && (
        <ReviewModal 
          submission={reviewingSub} 
          onClose={() => setReviewingSub(null)} 
          onApprove={(data) => handleApprove(data, reviewingSub)}
          creatorPassword={creatorPassword || ''}
        />
      )}
      {submissions.map(sub => (
        <div key={sub.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[9px] uppercase font-mono tracking-wider text-[#a28021] bg-[#bf9b30]/10 px-2 py-0.5 rounded mr-2">
                {sub.category}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">By User ID: {sub.userId}</span>
            </div>
          </div>
          <h4 className="font-serif text-base font-semibold text-stone-800">{sub.title}</h4>
          <p className="text-xs font-serif italic text-stone-500 mb-3">By {sub.author}</p>
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4">
            <p className="text-xs font-serif text-stone-700 whitespace-pre-wrap">{sub.originalText}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReviewingSub(sub)} className="flex-1 bg-stone-900 hover:bg-stone-800 text-[#bf9b30] py-1.5 rounded-lg text-xs font-medium border border-stone-800">
              Review & Enhance
            </button>
            <button onClick={() => handleReject(sub.id, sub.userId)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-1.5 rounded-lg text-xs font-medium">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MediaItem {
  id: string;
  title: string;
  type: 'youtube' | 'instagram';
  embedId: string;
  description: string;
  thumbnailUrl?: string;
  url?: string;
  timestamp?: string;
}

interface ChannelHubProps {
  onRefreshLiterature?: () => void;
}

export default function ChannelHub({ onRefreshLiterature }: ChannelHubProps) {
  // Suggestions State
  const [requestPoet, setRequestPoet] = useState('');
  const [requestWork, setRequestWork] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRequests, setRecentRequests] = useState<MasterpieceSuggestion[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Broadcasts State
  const [broadcasts, setBroadcasts] = useState<MediaItem[]>([]);
  const [isLoadingBroadcasts, setIsLoadingBroadcasts] = useState(true);
  const [isMediaVisible, setIsMediaVisible] = useState(true);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  // Creator Sanctum (Admin Panel) State
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [creatorTab, setCreatorTab] = useState<'literature' | 'media' | 'queue'>('literature');
  const [creatorPass, setCreatorPass] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('asq-creator-unlocked') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [passError, setPassError] = useState('');
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);

  const handleUnlockCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorPass.trim()) return;

    setIsVerifyingPass(true);
    setPassError('');

    try {
      const response = await fetch('/api/verify-creator-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: creatorPass.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setIsUnlocked(true);
        sessionStorage.setItem('asq-creator-unlocked', 'true');
        setCreatorPass('');
      } else {
        setPassError(data.error || 'Incorrect passcode. Access denied.');
      }
    } catch (err: any) {
      setPassError('Network error. Failed to reach the password verification gate.');
    } finally {
      setIsVerifyingPass(false);
    }
  };

  const handleLockCreator = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('asq-creator-unlocked');
  };

  // 1. Literature Upload Form State
  const [litTitle, setLitTitle] = useState('');
  const [litAuthor, setLitAuthor] = useState('');
  const [litCategory, setLitCategory] = useState('Ghazal');
  const [customCategory, setCustomCategory] = useState('');
  const [litOriginalText, setLitOriginalText] = useState('');
  const [litRomanizedText, setLitRomanizedText] = useState('');
  const [litEnglishTranslation, setLitEnglishTranslation] = useState('');
  const [litExplanation, setLitExplanation] = useState('');
  const [litBackgroundStory, setLitBackgroundStory] = useState('');
  const [litVocabulary, setLitVocabulary] = useState<{ word: string; meaning: string; pronunciation: string }[]>([]);
  
  // Vocabulary temp inputs
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [vocabPron, setVocabPron] = useState('');

  // 2. Media Metadata Auto-Fetcher State
  const [mediaUrl, setMediaUrl] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState<MediaItem | null>(null);
  const [metaError, setMetaError] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch recent requests from Firebase
  const loadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchRecentSuggestions(6);
      setRecentRequests(data);
    } catch (e) {
      console.error('Failed to load curation requests', e);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Fetch broadcasts from Firestore
  const loadBroadcasts = async () => {
    setIsLoadingBroadcasts(true);
    try {
      const response = await fetch('/api/broadcasts');
      const data = await response.json();
      if (data.success && data.items) {
        setBroadcasts(data.items);
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
    } finally {
      setIsLoadingBroadcasts(false);
    }
  };

  useEffect(() => {
    loadRequests();
    loadBroadcasts();
    
    // Load preference for media visibility
    const stored = localStorage.getItem('asq-media-panel-visible');
    if (stored !== null) {
      setIsMediaVisible(stored === 'true');
    }
  }, []);

  const handleToggleMediaVisibility = () => {
    const nextVal = !isMediaVisible;
    setIsMediaVisible(nextVal);
    localStorage.setItem('asq-media-panel-visible', String(nextVal));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestPoet.trim() || !requestWork.trim()) return;

    setIsSubmitting(true);
    try {
      await saveSuggestion(requestPoet.trim(), requestWork.trim(), userEmail.trim());
      setSubmitted(true);
      setRequestPoet('');
      setRequestWork('');
      setUserEmail('');
      await loadRequests();
      setTimeout(() => setSubmitted(false), 6000);
    } catch (error) {
      alert("Unable to reach the sanctuary database right now. Please try again soon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add vocab item to the list
  const handleAddVocab = () => {
    if (!vocabWord.trim() || !vocabMeaning.trim()) return;
    setLitVocabulary([
      ...litVocabulary,
      {
        word: vocabWord.trim(),
        meaning: vocabMeaning.trim(),
        pronunciation: vocabPron.trim()
      }
    ]);
    setVocabWord('');
    setVocabMeaning('');
    setVocabPron('');
  };

  const handleRemoveVocab = (index: number) => {
    setLitVocabulary(litVocabulary.filter((_, i) => i !== index));
  };

  // Submit new literature entry to backend API
  const handlePublishLiterature = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryToSave = litCategory === 'Custom' ? customCategory.trim() : litCategory;
    
    if (!litTitle.trim() || !litAuthor.trim() || !categoryToSave || !litOriginalText.trim()) {
      setUploadError("Please fill in all mandatory fields: Title, Author, Genre, and Original Verses.");
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const literatureItem = {
        title: litTitle.trim(),
        author: litAuthor.trim(),
        category: categoryToSave.toLowerCase(),
        originalText: litOriginalText.trim(),
        romanizedText: litRomanizedText.trim() || undefined,
        englishTranslation: litEnglishTranslation.trim() || undefined,
        hindiUrduExplanation: litExplanation.trim() || undefined,
        backgroundStory: litBackgroundStory.trim() || undefined,
        vocabulary: litVocabulary,
        datePublished: new Date().toISOString().split('T')[0],
        viewsCount: Math.floor(Math.random() * 500) + 120, // aesthetic initial views
        likesCount: 0,
        popularity: 'curated'
      };

      const response = await fetch('/api/literature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(literatureItem)
      });

      const data = await response.json();
      if (data.success) {
        setUploadSuccess(true);
        // Reset form
        setLitTitle('');
        setLitAuthor('');
        setLitOriginalText('');
        setLitRomanizedText('');
        setLitEnglishTranslation('');
        setLitExplanation('');
        setLitBackgroundStory('');
        setLitVocabulary([]);
        if (onRefreshLiterature) onRefreshLiterature();
      } else {
        setUploadError(data.error || "Failed to publish item to the void.");
      }
    } catch (err: any) {
      setUploadError(`Network error: ${err.message || 'Could not connect'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Meta URL Fetcher
  const handleFetchMediaMeta = async () => {
    if (!mediaUrl.trim()) return;
    setIsFetchingMeta(true);
    setMetaError('');
    setFetchedMeta(null);

    try {
      const response = await fetch('/api/fetch-media-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mediaUrl.trim() })
      });

      const data = await response.json();
      if (data.success && data.meta) {
        setFetchedMeta(data.meta);
      } else {
        setMetaError(data.error || "Unsupported URL format. Please paste a valid YouTube or Instagram link.");
      }
    } catch (err: any) {
      setMetaError(`Failed to fetch metadata: ${err.message}`);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Save the fetched and generated metadata as a live broadcast item
  const handlePublishBroadcast = async () => {
    if (!fetchedMeta) return;
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchedMeta)
      });

      const data = await response.json();
      if (data.success) {
        setUploadSuccess(true);
        setMediaUrl('');
        setFetchedMeta(null);
        await loadBroadcasts();
      } else {
        setUploadError(data.error || "Failed to save broadcast to DB.");
      }
    } catch (err: any) {
      setUploadError(`Failed to publish: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 bg-stone-50 border border-stone-200 rounded-2xl p-4 md:p-8 shadow-md animate-fade-in">
      {/* Header and Brand */}
      <div className="text-center max-w-xl mx-auto pb-6 border-b border-stone-200 relative flex flex-col items-center">
        <h3 className="font-serif text-2xl md:text-3xl text-stone-800 font-light tracking-wide">
          عین شین قاف : The Muted Void
        </h3>
        <p className="text-[#a28021] text-xs font-mono tracking-widest uppercase mt-2">
          @ishqtmvofficial
        </p>
        <p className="text-xs text-stone-500 font-serif leading-relaxed mt-4 italic mb-4">
          "Ain Sheen Qaf represents the letters of Ishq (Love) — a sacred alphabet of the silent soul, 
          resonating in the depths of Hindi, English, and Urdu literature."
        </p>

        {/* Dynamic Creator Sanctum Entry Toggle */}
        <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 w-full max-w-lg mt-4 space-y-3">
          <div className="text-center space-y-1">
            <p className="text-[11px] leading-relaxed text-stone-600 font-serif">
              This is for the Admin to enter new excerpts, verses, or literary pieces, and to publish user submissions after adding meanings and refinement.
            </p>
            <p className="text-[9px] text-stone-400 font-mono uppercase tracking-wider">
              Admin: sachin pandit aka kaadil akhtar khan
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              id="btn-toggle-creator-sanctum"
              onClick={() => {
                if (isCreatorMode && creatorTab !== 'queue') setIsCreatorMode(false);
                else { setIsCreatorMode(true); setCreatorTab('literature'); }
              }}
              className={`px-4 py-1.5 rounded-full border text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                isCreatorMode && creatorTab !== 'queue'
                  ? isUnlocked 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-inner'
                    : 'bg-amber-50 border-amber-300 text-amber-800 font-semibold shadow-inner'
                  : 'bg-white hover:bg-stone-100 text-stone-500 border-stone-200'
              }`}
              title="Publish live literature and reels"
            >
              {isCreatorMode && creatorTab !== 'queue' && isUnlocked ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-[#bf9b30]" />}
              <span>{isCreatorMode && creatorTab !== 'queue' ? isUnlocked ? "Sanctum Unlocked" : "Sanctum Locked" : "Enter Creator Mode"}</span>
            </button>
  
            <button
              id="btn-toggle-review-queue"
              onClick={() => {
                if (isCreatorMode && creatorTab === 'queue') setIsCreatorMode(false);
                else { setIsCreatorMode(true); setCreatorTab('queue'); }
              }}
              className={`px-4 py-1.5 rounded-full border text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                isCreatorMode && creatorTab === 'queue'
                  ? isUnlocked 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-inner'
                    : 'bg-amber-50 border-amber-300 text-amber-800 font-semibold shadow-inner'
                  : 'bg-white hover:bg-stone-100 text-stone-500 border-stone-200'
              }`}
              title="Review user submissions"
            >
              {isCreatorMode && creatorTab === 'queue' && isUnlocked ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-[#bf9b30]" />}
              <span>{isCreatorMode && creatorTab === 'queue' ? isUnlocked ? "Queue Unlocked" : "Queue Locked" : "Review Queue"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CREATOR SANCTUM - PASSWORD CHECK */}
      {isCreatorMode && !isUnlocked && (
        <div className="bg-[#FAF8F5] border-2 border-stone-200 rounded-2xl p-6 md:p-8 shadow-md text-center max-w-md mx-auto space-y-4 animate-fade-in">
          <div className="mx-auto bg-stone-100 text-[#bf9b30] w-12 h-12 rounded-full flex items-center justify-center border border-stone-200">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-stone-800">Sacred Portal Locked</h4>
            <p className="text-[11px] text-stone-500 font-serif leading-relaxed mt-1">
              "The silence of Ain Sheen Qaf is guarded. Speak the key of Ishq to reveal the publisher sanctum."
            </p>
          </div>
          
          <form onSubmit={handleUnlockCreator} className="space-y-3">
            <input
              id="input-creator-passcode"
              type="password"
              required
              value={creatorPass}
              onChange={(e) => setCreatorPass(e.target.value)}
              placeholder="Enter Sanctum Passcode..."
              className="w-full bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-center text-xs font-mono tracking-widest text-stone-800 focus:outline-none focus:border-[#bf9b30]"
              disabled={isVerifyingPass}
            />
            {passError && (
              <p className="text-[10px] font-mono text-red-600 animate-pulse">
                ⚠️ {passError}
              </p>
            )}
            <button
              id="btn-submit-unlock-portal"
              type="submit"
              disabled={isVerifyingPass || !creatorPass.trim()}
              className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white rounded-xl py-2 px-4 text-xs font-serif transition-colors flex items-center justify-center gap-1.5"
            >
              {isVerifyingPass ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isVerifyingPass ? "Unlocking Portal..." : "Unlock Portal"}</span>
            </button>
          </form>
        </div>
      )}

      {/* CREATOR SANCTUM - DYNAMIC PUBLISHER DASHBOARD */}
      {isCreatorMode && isUnlocked && (
        <div className="bg-[#FAF8F5] border-2 border-[#bf9b30]/30 rounded-2xl p-5 md:p-6 shadow-md space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-200 pb-4 gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#bf9b30] animate-spin" />
              <div>
                <h4 className="font-serif text-base font-semibold text-stone-800 flex items-center gap-1.5">
                  <span>The Void Publisher</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-light">Live</span>
                </h4>
                <p className="text-[10px] text-stone-500 font-mono">Mobile-Friendly Live Database Writer</p>
              </div>
            </div>

            {/* Selector Tabs & Lock */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/50 flex-1 sm:flex-initial">
                <button
                  id="btn-creator-tab-literature"
                  onClick={() => { setCreatorTab('literature'); setUploadSuccess(false); setUploadError(''); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-serif transition-all flex items-center justify-center gap-1.5 ${
                    creatorTab === 'literature' ? 'bg-white shadow-sm text-stone-800 font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#bf9b30]" />
                  <span>Publish Literature</span>
                </button>
                <button
                  id="btn-creator-tab-media"
                  onClick={() => { setCreatorTab('media'); setUploadSuccess(false); setUploadError(''); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-serif transition-all flex items-center justify-center gap-1.5 ${
                    creatorTab === 'media' ? 'bg-white shadow-sm text-stone-800 font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-[#bf9b30]" />
                  <span>Broadcast Reel</span>
                </button>
                <button
                  id="btn-creator-tab-queue"
                  onClick={() => { setCreatorTab('queue'); setUploadSuccess(false); setUploadError(''); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-serif transition-all flex items-center justify-center gap-1.5 ${
                    creatorTab === 'queue' ? 'bg-white shadow-sm text-stone-800 font-bold' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 text-[#bf9b30]" />
                  <span>Approval Queue</span>
                </button>
              </div>

              <button
                id="btn-lock-sanctum-instantly"
                onClick={handleLockCreator}
                className="text-[11px] font-mono text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 justify-center w-full sm:w-auto"
                title="Lock Sanctum Instantly"
              >
                <Lock className="w-3 h-3" />
                <span>Lock</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {uploadSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-xs font-serif text-center animate-fade-in shadow-inner">
              <Check className="w-5 h-5 text-emerald-600 mx-auto mb-1 animate-bounce" />
              <strong>Published to the Void!</strong> Your entry has been saved live into Firestore and is instantly readable.
            </div>
          )}

          {uploadError && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl text-xs font-mono text-center animate-fade-in">
              <strong>Publishing Error:</strong> {uploadError}
            </div>
          )}

          {/* 1. PUBLISH LITERATURE TAB */}
          {creatorTab === 'literature' && (
            <form onSubmit={handlePublishLiterature} className="space-y-4 font-serif text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">Title *</label>
                  <input
                    id="input-lit-title"
                    type="text"
                    required
                    value={litTitle}
                    onChange={(e) => setLitTitle(e.target.value)}
                    placeholder="e.g., Shayad Mujhe Kisi Se"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30]"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">Shayar / Author *</label>
                  <input
                    id="input-lit-author"
                    type="text"
                    required
                    value={litAuthor}
                    onChange={(e) => setLitAuthor(e.target.value)}
                    placeholder="e.g., Jaun Elia"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30]"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">Genre / Category *</label>
                  <div className="flex gap-1">
                    <select
                      id="select-lit-category"
                      value={litCategory}
                      onChange={(e) => setLitCategory(e.target.value)}
                      className="bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-[#bf9b30] flex-1"
                    >
                      <option value="Ghazal">Ghazal</option>
                      <option value="Nazm">Nazm</option>
                      <option value="Sher">Sher</option>
                      <option value="Doha">Doha</option>
                      <option value="Rubai">Rubai</option>
                      <option value="Idioms">Idioms</option>
                      <option value="Hindi-Sahitya">Hindi Sahitya</option>
                      <option value="English-Poetry">English Poetry</option>
                      <option value="Custom">Custom Category...</option>
                    </select>

                    {litCategory === 'Custom' && (
                      <input
                        id="input-custom-category"
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g., Avadhi Accent"
                        className="w-2/5 bg-white border border-stone-300 rounded-xl px-2 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Original Verses */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Original Verses (Full Ghazal/Poem Script) *
                </label>
                <textarea
                  id="textarea-lit-original"
                  required
                  rows={4}
                  value={litOriginalText}
                  onChange={(e) => setLitOriginalText(e.target.value)}
                  placeholder="شاید مجھے کسی سے محبت نہیں ہوئی..."
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30] leading-relaxed text-center font-serif text-sm italic"
                />
              </div>

              {/* Romanized Text */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Romanized Transliteration
                </label>
                <textarea
                  id="textarea-lit-romanized"
                  rows={2}
                  value={litRomanizedText}
                  onChange={(e) => setLitRomanizedText(e.target.value)}
                  placeholder="Shayad mujhe kisi se mohabbat nahi hui..."
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30] leading-relaxed text-center font-serif text-xs italic"
                />
              </div>

              {/* English Translation */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  English Translation / Rendering
                </label>
                <textarea
                  id="textarea-lit-english"
                  rows={2}
                  value={litEnglishTranslation}
                  onChange={(e) => setLitEnglishTranslation(e.target.value)}
                  placeholder="Perhaps I have never truly been in love..."
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30] leading-relaxed text-center font-serif text-xs italic"
                />
              </div>

              {/* Vyakhya / Meaning / Explanation */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Vyakhya / Hindi-Urdu Meaning & Explanation
                </label>
                <textarea
                  id="textarea-lit-explanation"
                  rows={3}
                  value={litExplanation}
                  onChange={(e) => setLitExplanation(e.target.value)}
                  placeholder="इस शेर में जौन अपनी गहरी सच्चाई बयां करते हुए कहते हैं..."
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30] leading-relaxed"
                />
              </div>

              {/* Historical Context / Background Story */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Historical Context / Poet's Background
                </label>
                <textarea
                  id="textarea-lit-context"
                  rows={2}
                  value={litBackgroundStory}
                  onChange={(e) => setLitBackgroundStory(e.target.value)}
                  placeholder="Written during Jaun's quiet, reflective years in Karachi, encapsulating his raw existential dread."
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#bf9b30] leading-relaxed italic"
                />
              </div>

              {/* Glossary / Lafz Adder */}
              <div className="border border-stone-200 bg-white rounded-xl p-4 space-y-3">
                <h5 className="font-serif text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-[#bf9b30]" />
                  <span>Document Difficult Vocabulary (Glossary)</span>
                </h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    id="input-vocab-word"
                    type="text"
                    value={vocabWord}
                    onChange={(e) => setVocabWord(e.target.value)}
                    placeholder="Word (e.g., Mohabbat)"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#bf9b30]"
                  />
                  <input
                    id="input-vocab-pron"
                    type="text"
                    value={vocabPron}
                    onChange={(e) => setVocabPron(e.target.value)}
                    placeholder="Pronunciation (e.g., mo-hab-bat)"
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#bf9b30]"
                  />
                  <div className="flex gap-1.5">
                    <input
                      id="input-vocab-meaning"
                      type="text"
                      value={vocabMeaning}
                      onChange={(e) => setVocabMeaning(e.target.value)}
                      placeholder="Meaning (e.g., Love)"
                      className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#bf9b30] flex-1"
                    />
                    <button
                      id="btn-add-vocab-list"
                      type="button"
                      onClick={handleAddVocab}
                      className="bg-stone-800 hover:bg-stone-900 text-white rounded-xl px-3 py-1 text-xs font-serif transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Saved vocab list */}
                {litVocabulary.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
                    {litVocabulary.map((v, idx) => (
                      <span key={idx} className="bg-[#bf9b30]/10 text-[#a28021] text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono">
                        <strong>{v.word}</strong>: {v.meaning} {v.pronunciation && `(/${v.pronunciation}/)`}
                        <button
                          id={`btn-remove-vocab-${idx}`}
                          type="button"
                          onClick={() => handleRemoveVocab(idx)}
                          className="hover:text-red-500 font-bold ml-1 text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <div className="text-right">
                <button
                  id="btn-submit-lit-publish"
                  type="submit"
                  disabled={isUploading}
                  className="bg-[#bf9b30] hover:bg-[#a28021] disabled:bg-stone-400 text-stone-900 font-bold rounded-xl py-2 px-6 transition-colors flex items-center gap-2 ml-auto shadow-sm"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-900" />
                  ) : (
                    <Send className="w-4 h-4 text-stone-900" />
                  )}
                  <span>{isUploading ? "Publishing to Void..." : "Publish to Mehfil"}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. BROADCAST REEL TAB */}
          {creatorTab === 'media' && (
            <div className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                <label className="block text-[11px] font-serif font-semibold text-stone-700">
                  Provide YouTube Video/Shorts or Instagram Reel URL:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="input-media-fetch-url"
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/C-pS3pbyh9g/ or https://youtu.be/eUOnB3l2Gxs"
                    className="bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-[#bf9b30] flex-1"
                  />
                  <button
                    id="btn-fetch-media-meta"
                    type="button"
                    disabled={isFetchingMeta || !mediaUrl.trim()}
                    onClick={handleFetchMediaMeta}
                    className="bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white rounded-xl px-5 py-2 text-xs font-serif transition-all flex items-center justify-center gap-1.5"
                  >
                    {isFetchingMeta ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isFetchingMeta ? "Fetching Meta..." : "Verify & Fetch with Gemini"}</span>
                  </button>
                </div>

                {metaError && (
                  <p className="text-[10px] font-mono text-red-500 mt-1">
                    ⚠️ {metaError}
                  </p>
                )}
              </div>

              {/* Fetched Preview and AI generated Description Review */}
              {fetchedMeta && (
                <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <h5 className="text-xs font-mono text-stone-400 uppercase tracking-widest border-b border-stone-100 pb-2">
                    Review Metadata & AI Generated Description
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Thumbnail preview if available */}
                    {fetchedMeta.thumbnailUrl && (
                      <div className="md:col-span-4 rounded-lg overflow-hidden border border-stone-100 bg-stone-100 flex items-center justify-center max-h-36">
                        <img 
                          src={fetchedMeta.thumbnailUrl} 
                          alt="Thumbnail" 
                          className="w-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Metadata review fields */}
                    <div className={`${fetchedMeta.thumbnailUrl ? "md:col-span-8" : "md:col-span-12"} space-y-3`}>
                      <div>
                        <span className="text-[9px] font-mono uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded mr-2">
                          {fetchedMeta.type}
                        </span>
                        <span className="text-[9px] font-mono text-stone-400">ID: {fetchedMeta.embedId}</span>
                      </div>

                      {/* Title review */}
                      <div>
                        <label className="block text-[9px] font-mono text-stone-400 uppercase">Aesthetic Title</label>
                        <input
                          id="review-media-title"
                          type="text"
                          value={fetchedMeta.title}
                          onChange={(e) => setFetchedMeta({ ...fetchedMeta, title: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-serif text-stone-800"
                        />
                      </div>

                      {/* Description review */}
                      <div>
                        <label className="block text-[9px] font-mono text-stone-400 uppercase">
                          AI-Sculpted Poetic Description
                        </label>
                        <textarea
                          id="review-media-desc"
                          rows={2}
                          value={fetchedMeta.description}
                          onChange={(e) => setFetchedMeta({ ...fetchedMeta, description: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-serif text-stone-700 leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="text-right pt-2 border-t border-stone-100">
                    <button
                      id="btn-confirm-publish-broadcast"
                      type="button"
                      disabled={isUploading}
                      onClick={handlePublishBroadcast}
                      className="bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white rounded-xl py-2 px-5 text-xs font-serif transition-colors flex items-center gap-1.5 ml-auto"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{isUploading ? "Uploading..." : "Confirm & Broadcast to Void"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. APPROVAL QUEUE TAB */}
          {creatorTab === 'queue' && (
            <QueueManager onApprove={onRefreshLiterature} />
          )}
        </div>
      )}

      {/* Social Platforms Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Instagram Card */}
        <a
          id="link-instagram"
          href="https://www.instagram.com/ishqtmvofficial"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white hover:bg-stone-50 border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow transition-all group flex items-start gap-4"
        >
          <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white p-3 rounded-lg group-hover:scale-105 transition-transform">
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-stone-800">Instagram Mehfil</h4>
            <p className="text-xs text-[#a28021] font-mono mt-0.5">@ishqtmvofficial</p>
            <p className="text-xs text-stone-500 font-serif leading-relaxed mt-2">
              Explore aesthetic video snippets, recited couplets, and handwritten shayari cards that breathe life into forgotten pages of adab.
            </p>
          </div>
        </a>

        {/* YouTube Card */}
        <a
          id="link-youtube"
          href="https://www.youtube.com/@ishqtmvofficial"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white hover:bg-stone-50 border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow transition-all group flex items-start gap-4"
        >
          <div className="bg-red-600 text-white p-3 rounded-lg group-hover:scale-105 transition-transform">
            <Youtube className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-stone-800">YouTube Recitations</h4>
            <p className="text-xs text-[#a28021] font-mono mt-0.5">Ain Sheen Qaf : The Muted Void</p>
            <p className="text-xs text-stone-500 font-serif leading-relaxed mt-2">
              Listen to slow, deep audio recitations, ghazal breakdowns, and immersive essays on Hindi, Urdu, and English master poets.
            </p>
          </div>
        </a>
      </div>

      {/* Media Broadcast Center */}
      <div className="border border-stone-200 bg-white rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#bf9b30]" />
            <div>
              <h4 className="font-serif text-sm font-semibold text-stone-800">Broadcasts & Reels</h4>
              <p className="text-[10px] text-stone-400 font-sans">Aesthetic recitations & handwritten scrolls</p>
            </div>
          </div>
          <button
            id="btn-toggle-media-view"
            type="button"
            onClick={handleToggleMediaVisibility}
            className="flex items-center gap-1 text-[11px] font-mono text-[#a28021] bg-[#bf9b30]/10 hover:bg-[#bf9b30]/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isMediaVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Media Board</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Media Board</span>
              </>
            )}
          </button>
        </div>

        {isMediaVisible ? (
          isLoadingBroadcasts ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#bf9b30]" />
              <span className="text-xs font-serif">Tuning broadcasts feed...</span>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs font-serif italic border border-stone-100 rounded-xl bg-stone-50">
              No broadcasts mapped yet. Enter Creator Mode above to link the first Reel or YouTube video!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
              {broadcasts.map((media) => (
                <div
                  key={media.id}
                  id={`media-card-${media.id}`}
                  onClick={() => setActiveMedia(media)}
                  className="group relative bg-stone-50 hover:bg-stone-100 border border-stone-200/60 hover:border-stone-400 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between overflow-hidden shadow-sm"
                >
                  {/* Decorative Type tag */}
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded tracking-wider ${
                      media.type === 'youtube'
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-purple-50 text-purple-600 border border-purple-100'
                    }`}>
                      {media.type === 'youtube' ? 'YouTube' : 'IG Reel'}
                    </span>
                    <Play className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#bf9b30] group-hover:scale-110 transition-all" />
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-serif text-xs font-bold text-stone-800 leading-snug group-hover:text-[#a28021] transition-colors">
                      {media.title}
                    </h5>
                    <p className="text-[11px] font-serif text-stone-500 line-clamp-2 leading-relaxed">
                      {media.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-stone-200/40 text-[9px] font-mono text-stone-400 flex items-center justify-between">
                    <span>Stream here</span>
                    <span className="text-[#a28021] opacity-0 group-hover:opacity-100 transition-opacity font-serif">
                      Launch Theater →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="py-6 text-center bg-stone-50 border border-dashed border-stone-200 rounded-xl">
            <p className="text-xs text-stone-400 font-serif italic">
              Broadcast board is hidden. Use the toggle above to explore video and reel previews.
            </p>
          </div>
        )}
      </div>

      {/* Cinematic Studio Theater Overlay */}
      {activeMedia && createPortal(
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden max-w-xl w-full shadow-2xl relative flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-[#bf9b30] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                  {activeMedia.type === 'youtube' ? 'YouTube Broadcast' : 'Instagram Reel'}
                </span>
              </div>
              <button
                id="btn-close-theater"
                onClick={() => setActiveMedia(null)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
                title="Close Theater"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Embed container */}
            <div className="relative bg-black flex items-center justify-center" style={{ minHeight: '340px' }}>
              {activeMedia.type === 'youtube' ? (
                <iframe
                  className="w-full h-80 sm:h-96 border-0"
                  src={`https://www.youtube.com/embed/${activeMedia.embedId}?autoplay=1&rel=0`}
                  title={activeMedia.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <iframe
                  className="w-full h-80 sm:h-96 border-0"
                  src={`https://www.instagram.com/reel/${activeMedia.embedId}/embed`}
                  title={activeMedia.title}
                  allow="autoplay"
                ></iframe>
              )}
            </div>

            {/* Description */}
            <div className="p-5 bg-stone-950 text-stone-300 border-t border-stone-800 space-y-1">
              <h4 className="font-serif text-sm font-bold text-white">{activeMedia.title}</h4>
              <p className="font-serif text-xs text-stone-400 leading-relaxed">{activeMedia.description}</p>
              
              <div className="pt-3 flex items-center justify-between text-[10px] font-mono text-stone-500">
                <span>By @ishqtmvofficial</span>
                <a
                  href={
                    activeMedia.type === 'youtube'
                      ? `https://www.youtube.com/watch?v=${activeMedia.embedId}`
                      : `https://www.instagram.com/reel/${activeMedia.embedId}/`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#bf9b30] hover:underline flex items-center gap-1"
                >
                  <span>Open directly</span>
                  <X className="w-2.5 h-2.5 rotate-45" />
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Recitation Requests / Audience Suggestions */}
      <div className="bg-[#FAF8F5] border border-stone-200/60 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareCode className="w-5 h-5 text-[#bf9b30]" />
          <h4 className="font-serif text-base font-semibold text-stone-800">Suggest a Masterpiece</h4>
        </div>
        <p className="text-xs text-stone-500 font-serif leading-relaxed mb-6">
          Is there a specific Ghazal, Nazm, Doha, or English poem that captures your heart? Or a writer you want explored on the channel? 
          Submit your recommendation below and we will include it in our curation schedule. Your request is saved live in our database.
        </p>

        {submitted ? (
          <div className="bg-stone-900 text-stone-100 rounded-xl p-5 text-center text-xs font-serif leading-relaxed border border-[#bf9b30]/30 animate-fade-in shadow-inner">
            <span className="text-[#bf9b30] block font-semibold mb-1 text-sm">🌿 Aarz Kiya Hai...</span>
            "Your suggestion has been written in our shared diary of the void." Thank you for enriching Ain Sheen Qaf.
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">Poet / Shayar</label>
              <input
                id="request-poet-name"
                type="text"
                value={requestPoet}
                onChange={(e) => setRequestPoet(e.target.value)}
                placeholder="e.g., Faiz Ahmed Faiz"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30]"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">Ghazal Title or Verse</label>
              <input
                id="request-work-title"
                type="text"
                value={requestWork}
                onChange={(e) => setRequestWork(e.target.value)}
                placeholder="e.g., Mujhse Pehli Si Mohabbat"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30]"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">Your Email (Optional)</label>
              <input
                id="request-user-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="poet@void.com"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30]"
                disabled={isSubmitting}
              />
            </div>

            <div className="sm:col-span-12 text-right">
              <button
                id="btn-submit-suggestion"
                type="submit"
                disabled={isSubmitting}
                className="bg-stone-800 hover:bg-stone-900 disabled:bg-stone-600 text-white rounded-xl py-2 px-6 text-xs font-serif font-medium transition-colors flex items-center gap-1.5 ml-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSubmitting ? 'Recording...' : 'Send Suggestion'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Real-time Community Suggestions List */}
      <div className="border border-stone-200 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#bf9b30]" />
            <h4 className="font-serif text-sm font-semibold text-stone-800">Scribbles in the Void</h4>
          </div>
          <span className="text-[10px] font-mono text-[#a28021] bg-[#bf9b30]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Live Database
          </span>
        </div>

        {isLoadingRequests ? (
          <div className="py-8 text-center flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#bf9b30]" />
            <span className="text-xs font-serif">Consulting the archive...</span>
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs font-serif italic">
            The board is clean. Submit the first suggestion to write upon it!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col justify-between hover:border-stone-200 transition-colors"
              >
                <div>
                  <h5 className="font-serif text-xs font-bold text-stone-800 line-clamp-1">
                    "{req.work}"
                  </h5>
                  <p className="text-[10px] font-serif text-stone-500 italic mt-1">
                    by {req.poet}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-3 border-t border-stone-200/50 pt-2 text-[9px] font-mono text-stone-400">
                  <User className="w-2.5 h-2.5 text-[#a28021]" />
                  <span className="truncate">{req.email && req.email !== 'anonymous' ? req.email.split('@')[0] : 'A Reader'}</span>
                  <span className="ml-auto text-stone-300">
                    {req.timestamp ? new Date(req.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Ethos Quotes */}
      <div className="flex items-center justify-center gap-2 text-xs text-stone-400 font-serif pt-2">
        <Heart className="w-3 h-3 text-red-500 fill-current" />
        <span>For the absolute love of literature and adab.</span>
      </div>
    </div>
  );
}
