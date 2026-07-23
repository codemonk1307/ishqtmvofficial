import React, { useState } from 'react';
import { LiteratureItem, VocabularyWord } from '../types';
import { Bookmark, Copy, Sparkles, Languages, HelpCircle, ArrowLeft, Heart, Eye, Share2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface AestheticReaderProps {
  item: LiteratureItem;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
}

export default function AestheticReader({ item, isBookmarked, onToggleBookmark, onClose }: AestheticReaderProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'vocabulary' | 'ai-companion'>('text');
  const [scriptMode, setScriptMode] = useState<'original' | 'romanized' | 'hindi'>('original');
  const [transliteratingHindi, setTransliteratingHindi] = useState(false);
  const [localHindiText, setLocalHindiText] = useState(item.hindiText || '');
  
  // AI State
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [customQuery, setCustomQuery] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');

  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  // Trigger copy
  const handleCopy = () => {
    const textToCopy = `${item.title} by ${item.author}\n\n` +
      `${item.originalText}\n\n` +
      (item.romanizedText ? `[Transliteration]:\n${item.romanizedText}\n\n` : '') +
      (item.englishTranslation ? `[English Translation]:\n${item.englishTranslation}\n\n` : '') +
      `— Shared via Ain Sheen Qaf : The Muted Void`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Verses saved to your soul\'s clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    setLiked(!liked);
    if (!liked) {
      toast('You felt this deeply. Heart saved.', { icon: '❤️' });
    }
  };

  const handleToggleBookmark = () => {
    onToggleBookmark();
    if (!isBookmarked) {
      toast('Bookmarked to your sanctuary.', { icon: '🔖' });
    } else {
      toast('Removed from your sanctuary.');
    }
  };

  // Call Nukta AI endpoint
  const askNukta = async (action: string, customText?: string) => {
    setAiLoading(true);
    setAiError('');
    setAiResponse('');
    setActiveTab('ai-companion');

    try {
      const response = await fetch('/api/literature-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: item.originalText,
          context: { author: item.author, category: item.category },
          userPrompt: customText || ''
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Server error (Status ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch (e) {
          if (errorText) {
            errorMsg = errorText.length > 150 ? `${errorText.slice(0, 150)}...` : errorText;
          }
        }
        setAiError(errorMsg);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAiResponse(data.answer);
      } else {
        setAiError(data.error || 'Nukta had a moment of silence. Please try again.');
      }
    } catch (err: any) {
      console.error('Nukta fetch error:', err);
      setAiError(`Connection Error: ${err.message || 'Could not reach Nukta. Please make sure the dev server is active.'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    askNukta('chat', customQuery);
    setCustomQuery('');
  };

  const handleHindiToggle = async () => {
    setScriptMode('hindi');
    if (localHindiText) return;

    setTransliteratingHindi(true);
    try {
      const response = await fetch('/api/literature-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transliterate_hindi',
          text: item.originalText,
          context: { author: item.author, category: item.category },
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hindi transliteration');
      }

      const data = await response.json();
      if (data.success && data.answer) {
        setLocalHindiText(data.answer);
      } else {
        toast.error('Nukta could not transliterate to Hindi right now.');
        setScriptMode('original');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to transliterate to Hindi.');
      setScriptMode('original');
    } finally {
      setTransliteratingHindi(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[620px] max-w-5xl w-full mx-auto animate-fade-in">
      {/* LEFT COLUMN: Literature Display */}
      <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200 overflow-y-auto">
        <div>
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6">
            <button
              id="btn-close-reader"
              onClick={onClose}
              className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-xs font-serif transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mehfil</span>
            </button>

            <div className="flex gap-2">
              <button
                id="btn-like-reader"
                onClick={handleLike}
                className={`p-2 rounded-full border border-stone-200 transition-all ${
                  liked ? 'bg-red-50 border-red-200 text-red-500 scale-110' : 'bg-white text-stone-400 hover:text-stone-600 hover:scale-105'
                }`}
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
              <button
                id="btn-bookmark-reader"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-full border border-stone-200 transition-all ${
                  isBookmarked ? 'bg-[#bf9b30]/10 border-[#bf9b30]/30 text-[#bf9b30] scale-110' : 'bg-white text-stone-400 hover:text-[#bf9b30] hover:scale-105'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              <button
                id="btn-copy-reader"
                onClick={handleCopy}
                className={`p-2 rounded-full border border-stone-200 transition-all bg-white text-stone-400 hover:text-stone-600 hover:scale-105 relative`}
                title="Copy styled verses"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                id="btn-share-reader"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: item.title,
                      text: `"${item.originalText}"\n— ${item.author}`,
                      url: window.location.href,
                    }).catch(console.error);
                  } else {
                    handleCopy();
                    toast.success('Link and text copied for sharing');
                  }
                }}
                className={`p-2 rounded-full border border-stone-200 transition-all bg-white text-stone-400 hover:text-stone-600 hover:scale-105 relative`}
                title="Share to Story/Status"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Poet Metadata */}
          <div className="mb-6">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#a28021] bg-[#bf9b30]/10 px-2.5 py-1 rounded">
              {item.category.replace('-', ' ')}
            </span>
            <h2 className="text-2xl md:text-3xl font-serif text-stone-800 tracking-tight mt-3 mb-1">
              {item.title}
            </h2>
            <p className="text-sm font-serif italic text-stone-500">
              By {item.author}
            </p>
          </div>

          {/* SCRIPT TOGGLE */}
          <div className="flex gap-2 mb-6 bg-stone-100 p-1 rounded-lg max-w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              id="script-original"
              onClick={() => setScriptMode('original')}
              className={`px-3 py-1 text-xs rounded font-serif transition-all flex-shrink-0 ${
                scriptMode === 'original' ? 'bg-white shadow-sm text-stone-800 font-medium' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Original Script
            </button>
            {item.romanizedText && (
              <button
                id="script-romanized"
                onClick={() => setScriptMode('romanized')}
                className={`px-3 py-1 text-xs rounded font-serif transition-all flex-shrink-0 ${
                  scriptMode === 'romanized' ? 'bg-white shadow-sm text-stone-800 font-medium' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Romanized
              </button>
            )}
            <button
              id="script-hindi"
              onClick={handleHindiToggle}
              className={`px-3 py-1 text-xs rounded font-serif transition-all flex items-center gap-1 flex-shrink-0 ${
                scriptMode === 'hindi' ? 'bg-white shadow-sm text-stone-800 font-medium' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Hindi
              {transliteratingHindi && <span className="animate-spin text-[#bf9b30] text-[10px]">🪄</span>}
            </button>
            {item.alternativeScripts && Object.entries(item.alternativeScripts).map(([scriptName, scriptContent]) => (
              <button
                key={`script-${scriptName}`}
                onClick={() => setScriptMode(scriptName as any)}
                className={`px-3 py-1 text-xs rounded font-serif transition-all flex-shrink-0 ${
                  scriptMode === scriptName ? 'bg-white shadow-sm text-stone-800 font-medium' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {scriptName}
              </button>
            ))}
          </div>

          {/* Main Literary Text */}
          <div className="bg-white border border-stone-100 rounded-xl p-6 shadow-sm mb-6 max-h-[220px] overflow-y-auto relative">
            <p className={`text-lg md:text-xl font-serif text-stone-800 whitespace-pre-wrap leading-relaxed tracking-wide text-center italic font-light transition-opacity ${transliteratingHindi ? 'opacity-30' : 'opacity-100'}`}>
              {scriptMode === 'hindi' ? (localHindiText || 'Transliterating...') : 
               scriptMode === 'romanized' ? (item.romanizedText || item.originalText) : 
               (item.alternativeScripts && item.alternativeScripts[scriptMode]) ? item.alternativeScripts[scriptMode] :
               item.originalText}
            </p>
          </div>

          {/* Translation section */}
          {item.englishTranslation && (
            <div className="mb-4">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1.5">
                <Languages className="w-3.5 h-3.5 text-[#bf9b30]" />
                English Rendering
              </h4>
              <p className="text-xs font-serif italic text-stone-600 leading-relaxed pl-3 border-l-2 border-[#bf9b30]/20">
                {item.englishTranslation}
              </p>
            </div>
          )}
        </div>

        {/* Footer Statistics */}
        <div className="flex gap-4 border-t border-stone-100 pt-4 mt-4 text-[10px] font-mono text-stone-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {item.viewsCount + (liked ? 1 : 0)} views
          </span>
          <span>•</span>
          <span>Published in {item.datePublished}</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Companion Hub */}
      <div className="w-full md:w-2/5 bg-[#F2EDE4] p-6 flex flex-col justify-between h-[300px] md:h-full overflow-y-auto">
        <div>
          {/* Side Tabs */}
          <div className="flex border-b border-stone-300 pb-2 mb-4 gap-4">
            <button
              id="tab-original-meta"
              onClick={() => setActiveTab('text')}
              className={`pb-1 text-xs font-serif tracking-wide transition-all border-b ${
                activeTab === 'text' ? 'border-[#bf9b30] text-[#a28021] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              Exposition
            </button>
            <button
              id="tab-vocabulary"
              onClick={() => setActiveTab('vocabulary')}
              className={`pb-1 text-xs font-serif tracking-wide transition-all border-b ${
                activeTab === 'vocabulary' ? 'border-[#bf9b30] text-[#a28021] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              Lafz (Glossary)
            </button>
            <button
              id="tab-nukta"
              onClick={() => setActiveTab('ai-companion')}
              className={`pb-1 text-xs font-serif tracking-wide transition-all border-b flex items-center gap-1 ${
                activeTab === 'ai-companion' ? 'border-[#bf9b30] text-[#a28021] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#bf9b30]" />
              Ask Nukta
            </button>
          </div>

          {/* TAB 1: Classic Exposition */}
          {activeTab === 'text' && (
            <div className="space-y-4 animate-fade-in text-stone-700">
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400 mb-1">Vyakhya / Meaning</h4>
                <p className="text-xs font-serif leading-relaxed text-stone-600">
                  {item.hindiUrduExplanation}
                </p>
              </div>

              {item.backgroundStory && (
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400 mb-1">Historical Context</h4>
                  <p className="text-xs font-serif leading-relaxed text-stone-600 italic">
                    {item.backgroundStory}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Lafz (Vocabulary) */}
          {activeTab === 'vocabulary' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-[11px] font-serif italic text-stone-500 mb-2">
                Click on any words to see their meaning and pronunciation:
              </p>
              {item.vocabulary.length > 0 ? (
                <div className="grid gap-2">
                  {item.vocabulary.map((vocab, index) => (
                    <div key={index} className="bg-white border border-stone-200/50 rounded-lg p-2.5 shadow-sm">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-serif font-medium text-xs text-stone-800">{vocab.word}</span>
                        {vocab.pronunciation && (
                          <span className="font-mono text-[9px] text-stone-400">/{vocab.pronunciation}/</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 font-serif leading-tight">{vocab.meaning}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 font-mono italic">No difficult words documented. Use Ask Nukta for automated translation!</p>
              )}
            </div>
          )}

          {/* TAB 3: Ask Nukta (AI Companion) */}
          {activeTab === 'ai-companion' && (
            <div className="space-y-4 animate-fade-in flex flex-col justify-between">
              {/* Presets if idle */}
              {!aiResponse && !aiLoading && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-serif text-stone-500">
                    Consult Nukta to analyze or decode Mirza Ghalib or other masterpieces:
                  </p>
                  <div className="grid gap-2">
                    <button
                      id="ai-preset-tashreeh"
                      onClick={() => askNukta('tashreeh')}
                      className="w-full text-left bg-white hover:bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-serif transition-colors text-stone-700 flex items-center justify-between"
                    >
                      <span>🕯️ Detailed Tashreeh (Deep Explanation)</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#bf9b30]" />
                    </button>
                    <button
                      id="ai-preset-fidelity"
                      onClick={() => askNukta('translate')}
                      className="w-full text-left bg-white hover:bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-serif transition-colors text-stone-700 flex items-center justify-between"
                    >
                      <span>🌍 Emotive translation rendering</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#bf9b30]" />
                    </button>
                    <button
                      id="ai-preset-complete"
                      onClick={() => askNukta('complete')}
                      className="w-full text-left bg-white hover:bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-serif transition-colors text-stone-700 flex items-center justify-between"
                    >
                      <span>✍️ Suggest poetic continuations</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#bf9b30]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Response output */}
              {aiLoading && (
                <div className="bg-white/40 border border-stone-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#bf9b30] border-t-transparent mb-3"></div>
                  <p className="text-xs font-serif italic text-stone-600 animate-pulse">
                    "Ghaur-o-fikr ho raha hai..."
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-1">
                    Nukta is contemplating the meters and depths.
                  </p>
                </div>
              )}

              {aiError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs font-serif leading-normal">
                  {aiError}
                </div>
              )}

              {aiResponse && (
                <div className="bg-white border border-stone-200 rounded-xl p-4 max-h-[300px] overflow-y-auto shadow-inner text-stone-800 font-serif text-xs leading-relaxed markdown-body">
                  <Markdown>{aiResponse}</Markdown>
                </div>
              )}

              {/* Back to presets button if showing response */}
              {aiResponse && (
                <button
                  id="ai-reset-companion"
                  onClick={() => setAiResponse('')}
                  className="text-[10px] font-mono text-[#a28021] hover:underline"
                >
                  ← Ask another question
                </button>
              )}
            </div>
          )}
        </div>

        {/* Custom free-form AI Question Input */}
        {activeTab === 'ai-companion' && !aiLoading && (
          <form onSubmit={handleCustomSubmit} className="mt-4 border-t border-stone-300 pt-3 flex gap-1.5">
            <input
              id="input-ai-custom-query"
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask Nukta about the behr, words..."
              className="flex-1 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-serif text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#bf9b30]"
            />
            <button
              id="btn-submit-custom-query"
              type="submit"
              className="bg-stone-800 hover:bg-stone-900 text-white rounded-lg px-3 py-1.5 text-xs font-serif transition-colors"
            >
              Ask
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
