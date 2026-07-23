import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, ExternalLink, Globe, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';

interface EnglishPoem {
  title: string;
  author: string;
  lines: string[];
  linecount: string;
}

export default function GlobalExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceType, setSourceType] = useState<'rekhta-ai' | 'poetrydb'>('rekhta-ai');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Results
  const [aiPoetResult, setAiPoetResult] = useState<string>('');
  const [englishPoems, setEnglishPoems] = useState<EnglishPoem[]>([]);
  const [selectedEnglishPoem, setSelectedEnglishPoem] = useState<EnglishPoem | null>(null);

  const quickSuggestionsUrdu = ['Mirza Ghalib', 'Jaun Elia', 'Faiz Ahmed Faiz', 'Kabir Das', 'Allama Iqbal'];
  const quickSuggestionsEnglish = ['John Keats', 'Lord Byron', 'Emily Dickinson', 'Edgar Allan Poe', 'William Wordsworth'];

  const handleSearch = async (queryText: string) => {
    const term = queryText.trim();
    if (!term) return;

    setIsLoading(true);
    setErrorMsg('');
    setAiPoetResult('');
    setEnglishPoems([]);
    setSelectedEnglishPoem(null);

    if (sourceType === 'rekhta-ai') {
      try {
        const response = await fetch('/api/literature-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'search-adab',
            text: term
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = `Server error (Status ${response.status})`;
          try {
            const parsed = JSON.parse(errorText);
            errorMsg = parsed.error || errorMsg;
          } catch (e) {
            if (errorText) errorMsg = errorText.length > 150 ? `${errorText.slice(0, 150)}...` : errorText;
          }
          setErrorMsg(errorMsg);
          return;
        }

        const data = await response.json();
        if (data.success && data.answer) {
          setAiPoetResult(data.answer);
        } else {
          setErrorMsg(data.error || 'The archives of the void remain quiet for this search.');
        }
      } catch (err: any) {
        console.error('API Error:', err);
        setErrorMsg(`Unable to consult our literary matrix right now: ${err.message || ''}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // PoetryDB live API
      try {
        const response = await fetch(`https://poetrydb.org/author/${encodeURIComponent(term)}`);
        if (!response.ok) {
          throw new Error('PoetryDB query failed');
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setEnglishPoems(data.slice(0, 15)); // Limit to first 15 poems for beautiful interface density
        } else {
          // Try searching by title instead of author as fallback
          const fallbackResponse = await fetch(`https://poetrydb.org/title/${encodeURIComponent(term)}`);
          const fallbackData = await fallbackResponse.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            setEnglishPoems(fallbackData.slice(0, 15));
          } else {
            setErrorMsg('No matches found in the live PoetryDB index. Try "Keats" or "Byron".');
          }
        }
      } catch (err) {
        console.error('PoetryDB error:', err);
        setErrorMsg('The live PoetryDB server appears to be unreachable at the moment.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getRekhtaSearchUrl = (term: string) => {
    return `https://www.rekhta.org/search?q=${encodeURIComponent(term)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="global-explorer-root">
      {/* Search Console */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-sm">
        <div className="max-w-xl mx-auto text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 bg-[#bf9b30]/10 text-[#a28021] text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full">
            <Globe className="w-3.5 h-3.5" />
            <span>Universal Literature Portal</span>
          </div>
          <h3 className="font-serif text-xl md:text-2xl text-stone-800 font-medium">Explore the Universal Void</h3>
          <p className="text-xs text-stone-500 font-serif max-w-md mx-auto">
            Access hundreds of classic English works live via PoetryDB, or summon authentic Urdu-Hindi shers & translations backed by direct Rekhta integration.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}
          className="max-w-2xl mx-auto space-y-4"
        >
          {/* Source Selector */}
          <div className="flex justify-center gap-4 border-b border-stone-100 pb-4">
            <button
              id="source-rekhta"
              type="button"
              onClick={() => { setSourceType('rekhta-ai'); setEnglishPoems([]); setAiPoetResult(''); }}
              className={`flex items-center gap-2 pb-2 text-xs font-serif border-b-2 transition-all ${
                sourceType === 'rekhta-ai'
                  ? 'border-[#bf9b30] text-[#a28021] font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#bf9b30]" />
              <span>Urdu, Hindi & Sanskrit (Rekhta & AI Portal)</span>
            </button>
            <button
              id="source-poetrydb"
              type="button"
              onClick={() => { setSourceType('poetrydb'); setEnglishPoems([]); setAiPoetResult(''); }}
              className={`flex items-center gap-2 pb-2 text-xs font-serif border-b-2 transition-all ${
                sourceType === 'poetrydb'
                  ? 'border-[#bf9b30] text-[#a28021] font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-500" />
              <span>Classic English Poetry (Live API)</span>
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              id="global-poet-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={sourceType === 'rekhta-ai' ? 'Search shayar (e.g., Ghalib, Jaun Elia, Faiz, Kabir)...' : 'Search English poet or poem (e.g., Keats, Byron, Shelley)...'}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-32 py-3 text-sm font-serif text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#bf9b30] focus:border-[#bf9b30]"
            />
            <button
              id="btn-global-search"
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-stone-100 text-xs font-serif font-medium px-5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>Search</span>
              )}
            </button>
          </div>

          {/* Quick recommendations */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-stone-400 font-mono text-[10px] uppercase tracking-wider">Try:</span>
            {sourceType === 'rekhta-ai' ? (
              quickSuggestionsUrdu.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSearchQuery(s); handleSearch(s); }}
                  className="bg-stone-100 hover:bg-[#bf9b30]/10 hover:text-[#a28021] px-2.5 py-1 rounded-lg text-stone-600 transition-colors"
                >
                  {s}
                </button>
              ))
            ) : (
              quickSuggestionsEnglish.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSearchQuery(s); handleSearch(s); }}
                  className="bg-stone-100 hover:bg-[#bf9b30]/10 hover:text-[#a28021] px-2.5 py-1 rounded-lg text-stone-600 transition-colors"
                >
                  {s}
                </button>
              ))
            )}
          </div>
        </form>
      </div>

      {/* Loading & State screens */}
      {isLoading && (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#bf9b30] animate-spin mx-auto" />
          <h4 className="font-serif text-stone-800 font-medium">Summoning the verses...</h4>
          <p className="text-xs text-stone-400 font-serif max-w-xs mx-auto">
            {sourceType === 'rekhta-ai' 
              ? 'Consulting the deep literary matrices of classical Urdu-Hindi archives.' 
              : 'Fetching real-time responses directly from the open PoetryDB server.'}
          </p>
        </div>
      )}

      {errorMsg && !isLoading && (
        <div className="bg-white border border-red-100 rounded-2xl p-10 text-center space-y-2">
          <p className="text-xs text-red-500 font-serif">{errorMsg}</p>
          <p className="text-[10px] text-stone-400 font-serif">Try searching for a different literary figure or check your spelling.</p>
        </div>
      )}

      {/* RESULT 1: AI REKHTA GATEWAY (URDU/HINDI) */}
      {aiPoetResult && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="markdown-body">
              <Markdown>{aiPoetResult}</Markdown>
            </div>
          </div>

          {/* Sidebar Rekhta Helper */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#FAF8F5] border border-[#bf9b30]/30 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[#a28021] mb-2">
                <Globe className="w-4 h-4" />
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Rekhta Integration</span>
              </div>
              <h4 className="font-serif text-sm font-semibold text-stone-800 mb-2">Dive Deeper on Rekhta</h4>
              <p className="text-xs text-stone-600 font-serif leading-relaxed mb-4">
                To access Rekhta's premium catalogs, biographies, and audio streams of master vocalists reciting this poet, click below:
              </p>
              
              <a
                id="external-rekhta-poet"
                href={getRekhtaSearchUrl(searchQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#bf9b30] hover:bg-[#a28021] text-stone-900 hover:text-white font-serif text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm"
              >
                <span>Read on Rekhta Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 text-[11px] font-serif text-stone-400 italic leading-relaxed">
              *Rekhta is a registered portal dedicated to the preservation of Urdu language. This search provides a beautifully synthesized literary breakdown and refers you to Rekhta for primary resources.
            </div>
          </div>
        </div>
      )}

      {/* RESULT 2: POETRYDB LIVE API (ENGLISH) */}
      {englishPoems.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Poem Selection List */}
          <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-4 max-h-[600px] overflow-y-auto space-y-2">
            <h4 className="font-serif text-xs font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
              Poems found ({englishPoems.length})
            </h4>
            {englishPoems.map((p, idx) => (
              <button
                key={idx}
                id={`english-poem-tab-${idx}`}
                onClick={() => setSelectedEnglishPoem(p)}
                className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1 ${
                  selectedEnglishPoem?.title === p.title
                    ? 'bg-[#bf9b30]/10 border-[#bf9b30]/40 shadow-sm'
                    : 'bg-stone-50 hover:bg-stone-100 border-transparent'
                }`}
              >
                <span className="font-serif text-xs font-bold text-stone-800 line-clamp-1">{p.title}</span>
                <span className="font-mono text-[9px] text-stone-400">Lines: {p.linecount}</span>
              </button>
            ))}
          </div>

          {/* Poem Reader Display */}
          <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6 md:p-8 min-h-[400px] flex flex-col justify-between">
            {selectedEnglishPoem ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-xl md:text-2xl text-stone-800 font-semibold">{selectedEnglishPoem.title}</h3>
                  <p className="text-xs text-[#a28021] font-serif italic mt-1">by {selectedEnglishPoem.author}</p>
                </div>
                
                <div className="border-l-2 border-[#bf9b30]/30 pl-4 py-1 space-y-1.5 max-h-[400px] overflow-y-auto">
                  {selectedEnglishPoem.lines.map((line, idx) => (
                    <p key={idx} className="font-serif text-xs md:text-sm text-stone-700 leading-relaxed min-h-[1.25rem]">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="m-auto text-center space-y-2 p-8">
                <BookOpen className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="font-serif text-sm text-stone-500 font-medium">Select a Poem</h4>
                <p className="text-xs text-stone-400 font-serif max-w-xs">
                  Click on any poem from the live database index on the left to read its complete verses.
                </p>
              </div>
            )}

            <div className="border-t border-stone-100 pt-4 mt-6 flex justify-between items-center text-[10px] font-mono text-stone-400">
              <span>Source: PoetryDB Open API</span>
              <span>Classic Literature Index</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
