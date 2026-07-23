import React, { useState, useEffect } from 'react';
import { LiteratureItem, LiteratureCategory } from './types';
import { CURATED_LITERATURE } from './data/literature';
import AudioAmbience from './components/AudioAmbience';
import AestheticReader from './components/AestheticReader';
import NuktaCompanion from './components/NuktaCompanion';
import PersonalDiary from './components/PersonalDiary';
import ChannelHub from './components/ChannelHub';
import GlobalExplorer from './components/GlobalExplorer';
import FeatureSuggestion from './components/FeatureSuggestion';
import PoetryRitual from './components/PoetryRitual';
import GenericPage from './components/GenericPage';
import BlogView from './components/BlogView';
import StoreView from './components/StoreView';
import OrdersView from './components/OrdersView';
import { Search, Feather, Package, BookOpen, Sparkles, HelpCircle, Heart, Bookmark, Eye, Star, Info, Menu, X, ArrowUpRight, Globe, MessageSquarePlus, LogIn, LogOut, Flame, Instagram, Youtube, Mail, Twitter, Linkedin } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const { user, profile, loading, signInWithGoogle, logout, updateStreak, updateUserBookmarks } = useAuth();

  // Navigation Tabs
  const [activeWorkspace, setActiveWorkspace] = useState<'library' | 'nukta' | 'diary' | 'hub' | 'explorer' | 'suggest' | 'favorites' | 'page' | 'blog' | 'store' | 'orders'>('library');
  const [activePageId, setActivePageId] = useState<string>('about');
  const [activeStoreCategory, setActiveStoreCategory] = useState<string>('literature');

  const openPage = (pageId: string) => {
    setActivePageId(pageId);
    setActiveWorkspace('page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openStore = (category: string) => {
    setActiveStoreCategory(category);
    setActiveWorkspace('store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ritual State
  const [isRitualActive, setIsRitualActive] = useState(false);

  // Library States
  const [selectedCategory, setSelectedCategory] = useState<LiteratureCategory | 'all'>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortFilter, setSortFilter] = useState<'default' | 'popular' | 'recent'>('default');
  const [moodFilter, setMoodFilter] = useState<'all' | 'dopamine' | 'melancholy' | 'sufi'>('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Active Reader
  const [selectedItem, setSelectedItem] = useState<LiteratureItem | null>(null);

  // Bookmarks persistence
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.bookmarks) {
      setBookmarks(profile.bookmarks);
    }
  }, [profile?.bookmarks]);

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic literature state from database API
  const [literature, setLiterature] = useState<LiteratureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLiterature = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/literature');
      const data = await response.json();
      if (data.success && data.items) {
        setLiterature(data.items);
      } else {
        setLiterature(CURATED_LITERATURE);
      }
    } catch (err) {
      console.error('Failed to fetch literature from API, falling back to local:', err);
      setLiterature(CURATED_LITERATURE);
    } finally {
      setIsLoading(false);
    }
  };

  // Load bookmarks and literature on mount
  useEffect(() => {
    loadLiterature();
    if (!profile) {
      const saved = localStorage.getItem('asq-muted-void-bookmarks');
      if (saved) {
        try {
          setBookmarks(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading bookmarks', e);
        }
      }
    }
  }, [profile]);

  // Toggle bookmark function
  const handleToggleBookmark = (id: string) => {
    let updated: string[] = [];
    if (bookmarks.includes(id)) {
      updated = bookmarks.filter(b => b !== id);
    } else {
      updated = [...bookmarks, id];
    }
    setBookmarks(updated);
    if (profile) {
      updateUserBookmarks(updated);
    } else {
      localStorage.setItem('asq-muted-void-bookmarks', JSON.stringify(updated));
    }
  };

  // Get distinct authors for the filter list
  const allAuthors = Array.from(new Set(literature.map(item => item.author)));

  // Filter & Sort Literature list
  const filteredLiterature = literature.filter(item => {
    // Category match
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    
    // Author match
    const authorMatch = selectedAuthor === 'all' || item.author === selectedAuthor;
    
    // Search match
    const searchLower = searchQuery.toLowerCase();
    const searchMatch = !searchLower || 
      item.title.toLowerCase().includes(searchLower) || 
      item.author.toLowerCase().includes(searchLower) || 
      item.originalText.toLowerCase().includes(searchLower) ||
      (item.romanizedText && item.romanizedText.toLowerCase().includes(searchLower));

    // Mood match (heuristic)
    let moodMatch = true;
    if (moodFilter !== 'all') {
      const text = (item.title + ' ' + item.originalText + ' ' + (item.romanizedText || '') + ' ' + (item.englishTranslation || '')).toLowerCase();
      if (moodFilter === 'dopamine') {
        moodMatch = text.includes('ishq') || text.includes('junoon') || text.includes('love') || text.includes('passion') || text.includes('dil');
      } else if (moodFilter === 'melancholy') {
        moodMatch = text.includes('dard') || text.includes('gham') || text.includes('pain') || text.includes('tears') || text.includes('judai');
      } else if (moodFilter === 'sufi') {
        moodMatch = text.includes('khuda') || text.includes('rab') || text.includes('soul') || text.includes('divine') || text.includes('rooh');
      }
    }

    // Bookmarks match
    const bookmarkMatch = (!showBookmarksOnly && activeWorkspace !== 'favorites') || bookmarks.includes(item.id);

    return categoryMatch && authorMatch && searchMatch && moodMatch && bookmarkMatch;
  }).sort((a, b) => {
    if (sortFilter === 'popular') {
      return b.viewsCount - a.viewsCount;
    }
    if (sortFilter === 'recent') {
      return b.datePublished.localeCompare(a.datePublished);
    }
    return 0; // Default ordering
  });

  const handleSelectLiterature = async (item: LiteratureItem) => {
    setSelectedItem(item);
    
    // Check if the device supports haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50); // Light haptic feedback
    }

    if (user) {
      updateStreak();
    }

    // Check if it exists in Firebase and increment views
    if (item.id && !item.id.startsWith('local-')) {
      try {
        const docRef = doc(db, 'literature', item.id);
        await updateDoc(docRef, {
          viewsCount: increment(1)
        });
        
        // Optimistically update local state
        setLiterature(prev => prev.map(l => l.id === item.id ? { ...l, viewsCount: l.viewsCount + 1 } : l));
      } catch (err) {
        console.error("Failed to increment views", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-stone-800 font-serif selection:bg-[#bf9b30]/20 selection:text-[#a28021]">
      
      {/* 1. TOP AESTHETIC BANNER & NAVIGATION */}
      <header className="border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo & Call Sign */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-stone-900 text-stone-100 p-2 rounded-xl border border-stone-800 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="font-serif text-sm font-semibold tracking-wider text-[#bf9b30]">عشق</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-serif font-medium tracking-wide text-stone-900 whitespace-nowrap">
                Ain Sheen Qaf <span className="font-light text-stone-500 font-sans text-xs hidden lg:inline">: The Muted Void</span>
              </h1>
              <p className="text-[9px] font-mono tracking-widest text-[#a28021] uppercase leading-none mt-0.5">
                By @ishqtmvofficial
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex flex-nowrap overflow-x-auto no-scrollbar gap-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200/50 flex-1 mx-4 lg:mx-6 items-center justify-center max-w-4xl">
            <button
              id="nav-library"
              onClick={() => { setActiveWorkspace('library'); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif tracking-wide transition-all whitespace-nowrap ${
                activeWorkspace === 'library' 
                  ? 'bg-white shadow-sm text-stone-800 font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Curated Mehfil
            </button>
            <button
              id="nav-nukta"
              onClick={() => { setActiveWorkspace('nukta'); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif tracking-wide transition-all flex items-center gap-1 whitespace-nowrap ${
                activeWorkspace === 'nukta' 
                  ? 'bg-white shadow-sm text-stone-800 font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#bf9b30]" />
              Ask Nukta
            </button>
            <button
              id="nav-diary"
              onClick={() => { setActiveWorkspace('diary'); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif tracking-wide transition-all whitespace-nowrap ${
                activeWorkspace === 'diary' 
                  ? 'bg-white shadow-sm text-stone-800 font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Personal Inkwell
            </button>
            <button
              id="nav-hub"
              onClick={() => { setActiveWorkspace('hub'); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif tracking-wide transition-all whitespace-nowrap ${
                activeWorkspace === 'hub' 
                  ? 'bg-white shadow-sm text-stone-800 font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Creator Mehfil
            </button>
            <button
              id="nav-explorer"
              onClick={() => { setActiveWorkspace('explorer'); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif tracking-wide transition-all flex items-center gap-1 whitespace-nowrap ${
                activeWorkspace === 'explorer' 
                  ? 'bg-white shadow-sm text-stone-800 font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Globe className="w-3 h-3 text-[#bf9b30]" />
              Universal Explorer
            </button>
            <button
              id="nav-suggest"
              onClick={() => { setActiveWorkspace('suggest'); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif tracking-wide transition-all flex items-center gap-1 whitespace-nowrap ${
                activeWorkspace === 'suggest' 
                  ? 'bg-white shadow-sm text-stone-800 font-bold' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <MessageSquarePlus className="w-3 h-3 text-[#bf9b30]" />
              Whisper
            </button>
          </nav>

          {/* Right Header Side: External Link & Mobile Menu toggle */}
          <div className="flex items-center gap-3">
            {!loading && (
              user ? (
                <div className="flex items-center gap-2 mr-1 flex-shrink-0">
                  <div className="hidden md:flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-xl px-2.5 py-1 text-xs font-serif shadow-sm">
                    <span className="font-medium text-stone-800 max-w-[120px] truncate" title={profile?.displayName || user.email || ''}>
                      {profile?.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                    <span className="w-px h-3 bg-stone-300"></span>
                    <div className="flex items-center gap-1" title={`${profile?.writtenCount || 0} written, ${profile?.publishedCount || 0} published`}>
                      <Flame className={`w-3 h-3 ${profile?.currentStreak && profile.currentStreak > 0 ? 'text-orange-600' : 'text-stone-400'}`} />
                      <span className={`font-mono ${profile?.currentStreak && profile.currentStreak > 0 ? 'text-orange-600' : 'text-stone-400'}`}>
                        {profile?.currentStreak || 0}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveWorkspace('orders')}
                    className="p-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 text-stone-600 transition-colors shadow-sm flex-shrink-0"
                    title="Track Orders"
                  >
                    <Package className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 text-stone-600 transition-colors shadow-sm flex-shrink-0"
                    title="Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 text-xs font-serif font-medium bg-[#bf9b30] hover:bg-[#a28021] text-white px-3 py-1.5 rounded-lg transition-colors mr-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )
            )}

            <a
              id="link-header-instagram"
              href="https://www.instagram.com/ishqtmvofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center bg-white border border-stone-200 hover:bg-stone-50 hover:border-pink-300 p-2 rounded-lg transition-colors shadow-sm"
              title="Follow on Instagram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="url(#instagram-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            <button
              id="btn-toggle-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-stone-200 bg-white rounded-lg text-stone-600 hover:text-stone-800 md:hidden transition-all"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-[#FAF8F5] p-4 space-y-2 flex flex-col shadow-inner animate-fade-in">
            <button
              id="mobile-nav-library"
              onClick={() => { setActiveWorkspace('library'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif ${
                activeWorkspace === 'library' ? 'bg-[#bf9b30]/10 text-[#a28021] font-bold' : 'text-stone-600'
              }`}
            >
              Curated Sanctuary
            </button>
            <button
              id="mobile-nav-nukta"
              onClick={() => { setActiveWorkspace('nukta'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif flex items-center gap-1 ${
                activeWorkspace === 'nukta' ? 'bg-[#bf9b30]/10 text-[#a28021] font-bold' : 'text-stone-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#bf9b30]" />
              Ask Nukta (AI Helper)
            </button>
            <button
              id="mobile-nav-diary"
              onClick={() => { setActiveWorkspace('diary'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif ${
                activeWorkspace === 'diary' ? 'bg-[#bf9b30]/10 text-[#a28021] font-bold' : 'text-stone-600'
              }`}
            >
              Personal Inkwell
            </button>
            <button
              id="mobile-nav-hub"
              onClick={() => { setActiveWorkspace('hub'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif ${
                activeWorkspace === 'hub' ? 'bg-[#bf9b30]/10 text-[#a28021] font-bold' : 'text-stone-600'
              }`}
            >
              Creator Sanctuary
            </button>
            <button
              id="mobile-nav-explorer"
              onClick={() => { setActiveWorkspace('explorer'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif flex items-center gap-1.5 ${
                activeWorkspace === 'explorer' ? 'bg-[#bf9b30]/10 text-[#a28021] font-bold' : 'text-stone-600'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#bf9b30]" />
              Universal Explorer
            </button>
            <button
              id="mobile-nav-suggest"
              onClick={() => { setActiveWorkspace('suggest'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif flex items-center gap-1.5 ${
                activeWorkspace === 'suggest' ? 'bg-[#bf9b30]/10 text-[#a28021] font-bold' : 'text-stone-600'
              }`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-[#bf9b30]" />
              Whisper a Suggestion
            </button>
            <button
              id="mobile-nav-favorites"
              onClick={() => { setActiveWorkspace('favorites'); setSelectedItem(null); setMobileMenuOpen(false); }}
              className={`text-left py-2 px-3 rounded-lg text-sm font-serif flex items-center gap-1.5 ${
                activeWorkspace === 'favorites' ? 'bg-rose-500/10 text-rose-600 font-bold' : 'text-stone-600'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Favorites
            </button>

            <a
              id="mobile-link-instagram"
              href="https://www.instagram.com/ishqtmvofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-left py-2 px-3 rounded-lg text-sm font-mono text-[#a28021] hover:underline"
            >
              Instagram @ishqtmvofficial →
            </a>
          </div>
        )}
      </header>

      {/* 2. MAIN GRID AND LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {isRitualActive ? (
          <div className="py-2">
            <PoetryRitual 
              literature={filteredLiterature.length > 3 ? filteredLiterature : literature} 
              onClose={() => setIsRitualActive(false)} 
              onReadItem={(item) => {
                setIsRitualActive(false);
                handleSelectLiterature(item);
              }}
            />
          </div>
        ) : selectedItem ? (
          <div className="py-2">
            <AestheticReader
              item={selectedItem}
              isBookmarked={bookmarks.includes(selectedItem.id)}
              onToggleBookmark={() => handleToggleBookmark(selectedItem.id)}
              onClose={() => setSelectedItem(null)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT SIDE: Active Workspace Area */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* TAB WORKSPACE 1: LIBRARY SANCTUARY OR FAVORITES */}
              {(activeWorkspace === 'library' || activeWorkspace === 'favorites') && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FAF8F5] border border-[#bf9b30]/20 rounded-2xl p-5 shadow-sm">
                    <div>
                      <h4 className="font-serif text-lg font-semibold text-stone-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#bf9b30]" />
                        The Cosmic Oracle
                      </h4>
                      <p className="text-xs text-stone-500 font-serif mt-1">Let the void choose a verse meant for your soul today.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsRitualActive(true)}
                        className="whitespace-nowrap px-6 py-2.5 bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 rounded-xl font-serif text-sm font-medium tracking-wide transition-all shadow-sm flex items-center gap-2"
                      >
                        Start Daily Ritual
                      </button>
                      <button
                        onClick={() => {
                          if (literature.length > 0) {
                            const randomItem = literature[Math.floor(Math.random() * literature.length)];
                            handleSelectLiterature(randomItem);
                            toast.success('A verse has chosen you.', { icon: '🌌' });
                          }
                        }}
                        className="whitespace-nowrap px-6 py-2.5 bg-stone-900 text-[#bf9b30] hover:bg-stone-800 rounded-xl font-serif text-sm font-medium tracking-wide transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ask for a Sign
                      </button>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="bg-white border border-stone-200/80 rounded-2xl p-3 md:p-4 shadow-sm flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full">
                    
                    {/* Search Field */}
                    <div className="relative w-full sm:w-auto sm:flex-1 min-w-[150px]">
                      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        id="library-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search poets, terms..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-serif text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#bf9b30] focus:border-[#bf9b30]"
                      />
                    </div>

                    {/* Sort order Selector */}
                    <select
                      id="select-sort-order"
                      value={sortFilter}
                      onChange={(e) => setSortFilter(e.target.value as any)}
                      className="w-full sm:w-auto flex-1 min-w-[130px] bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-serif text-stone-700 focus:outline-none focus:border-[#bf9b30]"
                    >
                      <option value="default">Catalogue Order</option>
                      <option value="popular">Most Popular</option>
                      <option value="recent">Recently Published</option>
                    </select>

                    {/* Mood Selector */}
                    <select
                      id="select-mood-filter"
                      value={moodFilter}
                      onChange={(e) => setMoodFilter(e.target.value as any)}
                      className="w-full sm:w-auto flex-1 min-w-[130px] bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-serif text-stone-700 focus:outline-none focus:border-[#bf9b30]"
                    >
                      <option value="all">Any Mood</option>
                      <option value="dopamine">Dopamine Rush</option>
                      <option value="melancholy">Melancholy</option>
                      <option value="sufi">Sufi</option>
                    </select>

                    {/* Author Selector */}
                    <select
                      id="select-author-filter"
                      value={selectedAuthor}
                      onChange={(e) => setSelectedAuthor(e.target.value)}
                      className="w-full sm:w-auto flex-1 min-w-[130px] bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-serif text-stone-700 focus:outline-none focus:border-[#bf9b30]"
                    >
                      <option value="all">All Shayars</option>
                      {allAuthors.map((author, index) => (
                        <option key={index} value={author}>{author}</option>
                      ))}
                    </select>

                    {/* Bookmark toggle */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        id="btn-toggle-bookmarks"
                        onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-serif flex justify-center items-center gap-1.5 transition-all ${
                          showBookmarksOnly
                            ? 'bg-[#bf9b30]/15 border-[#bf9b30] text-[#a28021] font-bold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Bookmarks ({bookmarks.length})</span>
                      </button>

                      {/* Favorites View toggle */}
                      <button
                        id="btn-nav-favorites-icon"
                        onClick={() => { 
                          if (activeWorkspace === 'favorites') {
                            setActiveWorkspace('library');
                          } else {
                            setActiveWorkspace('favorites');
                          }
                          setSelectedItem(null); 
                        }}
                        className={`flex-none px-3 py-2.5 rounded-xl border flex justify-center items-center transition-all ${
                          activeWorkspace === 'favorites'
                            ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-inner'
                            : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-rose-400 hover:bg-stone-100'
                        }`}
                        title="View Favorites"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-Category Slider */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200">
                    {(() => {
                      // Dynamically collect all genres present in the database to allow infinite flexibility!
                      const uniqueCategories = Array.from(new Set(literature.map(item => item.category.toLowerCase()))).filter(Boolean);
                      const staticCategories = ['all', 'ghazal', 'nazm', 'sher', 'doha', 'rubai', 'idioms', 'hindi-sahitya', 'upanyas', 'english-poetry'];
                      // Merge them to ensure classic defaults show even if not seeded yet, while custom categories appear seamlessly
                      const mergedCategories = Array.from(new Set([...staticCategories, ...uniqueCategories]));
                      
                      return mergedCategories.map((cat) => (
                        <button
                          id={`cat-filter-${cat}`}
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-1.5 rounded-full text-xs font-serif whitespace-nowrap border transition-all ${
                            selectedCategory === cat
                              ? 'bg-stone-900 border-stone-900 text-stone-100 font-medium'
                              : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-600'
                          }`}
                        >
                          {cat === 'all' ? 'All Genres' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Literature Catalogue Grid */}
                  {filteredLiterature.length === 0 ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
                      <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <h4 className="font-serif text-stone-700 font-semibold mb-1">Silence of the Void</h4>
                      <p className="text-xs text-stone-400 font-serif">No literary works matched your filters. Try clearing filters or search query.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredLiterature.map((item) => (
                        <div
                          id={`literature-card-${item.id}`}
                          key={item.id}
                          onClick={() => handleSelectLiterature(item)}
                          className="bg-white border border-stone-200/80 rounded-2xl p-5 hover:border-stone-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] uppercase font-mono tracking-wider text-[#a28021] bg-[#bf9b30]/10 px-2 py-0.5 rounded">
                                {item.category.replace('-', ' ')}
                              </span>
                              
                              {/* Small star indicator if views are high */}
                              {item.viewsCount > 20000 && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                              )}
                            </div>

                            <h3 className="font-serif text-base font-semibold text-stone-800 group-hover:text-[#a28021] transition-colors mt-3 line-clamp-1">
                              {item.title}
                            </h3>
                            <p className="text-[11px] font-serif italic text-stone-400 mb-4">
                              By {item.author}
                            </p>

                            <p className="text-xs font-serif text-stone-600 line-clamp-3 italic whitespace-pre-line leading-relaxed pl-2.5 border-l border-stone-200 mb-4">
                              {item.originalText}
                            </p>
                          </div>

                          <div className="flex justify-between items-center border-t border-stone-100 pt-3 text-[10px] font-mono text-stone-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {item.viewsCount} views
                            </span>
                            <span className="text-[#a28021] font-serif hover:underline text-[10px]">
                              Read Verses →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB WORKSPACE 2: NUKTA COMPANION */}
              {activeWorkspace === 'nukta' && <NuktaCompanion />}

              {/* TAB WORKSPACE 3: PERSONAL DIARY */}
              {activeWorkspace === 'diary' && <PersonalDiary />}

              {/* TAB WORKSPACE 4: CHANNEL HUB */}
              {activeWorkspace === 'hub' && <ChannelHub onRefreshLiterature={loadLiterature} />}

              {/* TAB WORKSPACE 5: UNIVERSAL LITERARY EXPLORER */}
              {activeWorkspace === 'explorer' && <GlobalExplorer />}

              {/* TAB WORKSPACE 6: WHISPER A SUGGESTION */}
              {activeWorkspace === 'suggest' && <FeatureSuggestion />}

              {/* NEW TABS */}
              {activeWorkspace === 'page' && <GenericPage pageId={activePageId} />}
              {activeWorkspace === 'blog' && <BlogView />}
              {activeWorkspace === 'store' && <StoreView category={activeStoreCategory} />}
              {activeWorkspace === 'orders' && <OrdersView />}
            </div>

            {/* RIGHT SIDE: Audio Ambient & Channel Context Info */}
            <aside className="lg:col-span-3 space-y-6">
              
              {/* Synthesized Ambiance */}
              <AudioAmbience />

              {/* Channel Meta Sidebar Card */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[#bf9b30]" />
                  <span className="font-serif text-xs font-semibold tracking-wider uppercase text-stone-700">Mehfil Ethos</span>
                </div>
                <p className="text-xs font-serif text-stone-600 leading-relaxed mb-3">
                  This applet is a curated expansion of Sachin Pandit's channels <strong>Ain Sheen Qaf : The Muted Void</strong> and <strong>@ishqtmvofficial</strong>.
                </p>
                <p className="text-xs font-serif text-stone-500 leading-relaxed italic">
                  Explore literary history, dissect Urdu metrical compositions, write your original work, and connect with fellow readers of the void.
                </p>
                
                {/* Embedded quick request trigger */}
                <button
                  id="btn-trigger-suggest-sidebar"
                  onClick={() => setActiveWorkspace('hub')}
                  className="w-full mt-4 text-center border border-stone-300 hover:border-stone-800 text-stone-700 hover:text-stone-900 py-2 rounded-lg text-xs font-serif transition-colors"
                >
                  Submit Poet Request
                </button>
              </div>

            </aside>

          </div>
        )}

      </main>

      {/* Global Footer */}
      <footer className="w-full bg-[#FAF8F5] border-t border-stone-200 py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            {/* Column 1: Branding */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg text-stone-800 tracking-wide flex flex-wrap items-baseline gap-2">
                Ain Sheen Qaf <span className="text-stone-400 font-sans text-sm">— The Muted Void</span>
              </h3>
              <p className="font-serif italic text-stone-500 text-sm">
                "For the absolute love of adab."
              </p>
            </div>

            {/* Column 2: Organisation */}
            <div className="space-y-4">
              <h4 className="font-mono text-xs font-semibold text-stone-800 uppercase tracking-wider">Organisation</h4>
              <ul className="space-y-3 text-xs font-serif text-stone-500">
                <li><button onClick={() => openPage('about')} className="hover:text-stone-800 hover:underline transition-all">About Us</button></li>
                <li><button onClick={() => openPage('careers')} className="hover:text-stone-800 hover:underline transition-all">Careers</button></li>
                <li><button onClick={() => openPage('contact')} className="hover:text-stone-800 hover:underline transition-all">Contact Us</button></li>
                <li><button onClick={() => setActiveWorkspace('blog')} className="hover:text-stone-800 hover:underline transition-all">Blog</button></li>
              </ul>
            </div>

            {/* Column 3: Products */}
            <div className="space-y-4">
              <h4 className="font-mono text-xs font-semibold text-stone-800 uppercase tracking-wider">Products</h4>
              <ul className="space-y-3 text-xs font-serif text-stone-500">
                <li><button onClick={() => openStore('literature')} className="hover:text-stone-800 hover:underline transition-all">Volumes</button></li>
                <li><button onClick={() => openStore('aesthetics')} className="hover:text-stone-800 hover:underline transition-all">Aesthetics</button></li>
                <li><button onClick={() => openStore('decor')} className="hover:text-stone-800 hover:underline transition-all">Decor Items</button></li>
                <li><button onClick={() => setActiveWorkspace('orders')} className="hover:text-stone-800 hover:underline transition-all">Track Orders</button></li>
              </ul>
            </div>

            {/* Column 4: Follow Us */}
            <div className="space-y-4">
              <h4 className="font-mono text-xs font-semibold text-stone-800 uppercase tracking-wider">Follow Us</h4>
              <div className="flex flex-col gap-4 text-xs font-serif text-stone-500">
                <a href="https://www.instagram.com/ishqtmvofficial" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-stone-800 transition-colors group" title="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="url(#insta-grad-footer)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                    <defs>
                      <linearGradient id="insta-grad-footer" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>Instagram</span>
                </a>
                <a href="https://www.youtube.com/@ishqtmvofficial" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-stone-800 transition-colors group" title="YouTube">
                  <Youtube className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                  <span>YouTube</span>
                </a>
                <a href="https://x.com/ishqtmvofficial" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-stone-800 transition-colors group" title="X (Twitter)">
                  <Twitter className="w-4 h-4 text-stone-700 group-hover:scale-110 transition-transform" />
                  <span>X (Twitter)</span>
                </a>
                <a href="https://www.linkedin.com/company/ishqtmvofficial/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-stone-800 transition-colors group" title="LinkedIn">
                  <Linkedin className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform" />
                  <span>LinkedIn</span>
                </a>
                <a href="mailto:ishqtmvofficial@gmail.com" className="flex items-center gap-3 hover:text-stone-800 transition-colors group" title="Email: ishqtmvofficial@gmail.com">
                  <Mail className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>ishqtmvofficial@gmail.com</span>
                </a>
              </div>
            </div>

          </div>

          {/* Center: Quote & Copyright */}
          <div className="border-t border-stone-200 pt-8 flex flex-col items-center justify-center space-y-4">
            <p className="italic text-[#a28021] font-serif text-[11px] md:text-xs text-center max-w-2xl">
              "Love is the one thing we're capable of perceiving that transcends dimensions of time and space." — Interstellar
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-stone-400 text-[10px] font-mono">
              <p>© 2026 Ain Sheen Qaf : The Muted Void</p>
              <span className="hidden sm:inline text-stone-300">•</span>
              <button onClick={() => openPage('privacy')} className="hover:text-stone-600 transition-colors">Privacy Policy</button>
              <span className="hidden sm:inline text-stone-300">•</span>
              <button onClick={() => openPage('terms')} className="hover:text-stone-600 transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Toaster for Notifications */}
      <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: 'serif', fontSize: '14px' } }} />
    </div>
  );
}
