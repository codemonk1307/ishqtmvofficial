import React, { useState, useEffect } from 'react';
import { DiaryEntry } from '../types';
import { Plus, Trash2, Save, Edit3, Feather, Sparkles, BookOpen } from 'lucide-react';
import Markdown from 'react-markdown';

export default function PersonalDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Shayari');

  // AI Assistant State
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('asq-muted-void-diary');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEntries(parsed);
        if (parsed.length > 0) {
          setSelectedEntry(parsed[0]);
        }
      } catch (e) {
        console.error('Error parsing saved diary entries', e);
      }
    } else {
      // Seed an initial entry
      const seed: DiaryEntry = {
        id: 'seed-1',
        title: 'Mera Pehla Sher (My First Couplet)',
        content: 'सन्नाटों की गूंज में बहता रहा है दिल मेरा,\nखामोशियों की गोद में सोया रहा है दिल मेरा।',
        category: 'Shayari',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setEntries([seed]);
      setSelectedEntry(seed);
      localStorage.setItem('asq-muted-void-diary', JSON.stringify([seed]));
    }
  }, []);

  // Calculate Streak
  const calculateStreak = () => {
    if (entries.length === 0) return 0;
    
    const dates = entries
      .map(e => new Date(e.createdAt).toISOString().split('T')[0])
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const uniqueDates = Array.from(new Set(dates));
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Check if wrote today or yesterday to continue streak
    const firstDate = new Date(uniqueDates[0]);
    firstDate.setHours(0, 0, 0, 0);
    const diffDays = (currentDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);

    if (diffDays > 1) return 0; // Streak broken

    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i]);
      d.setHours(0, 0, 0, 0);
      const expected = new Date(currentDate);
      expected.setDate(currentDate.getDate() - streak - (diffDays === 1 ? 1 : 0));
      
      if (d.getTime() === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    return streak === 0 ? 1 : streak;
  };

  const currentStreak = calculateStreak();

  // Sync state to form when selectedEntry changes
  useEffect(() => {
    if (selectedEntry) {
      setTitle(selectedEntry.title);
      setContent(selectedEntry.content);
      setCategory(selectedEntry.category);
      setAiFeedback('');
    } else {
      setTitle('');
      setContent('');
      setCategory('Shayari');
      setAiFeedback('');
    }
  }, [selectedEntry]);

  const saveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    let updatedList: DiaryEntry[] = [];
    const timestamp = new Date().toISOString();

    if (selectedEntry && selectedEntry.id !== 'new') {
      // Editing existing
      updatedList = entries.map(item => {
        if (item.id === selectedEntry.id) {
          return {
            ...item,
            title,
            content,
            category,
            updatedAt: timestamp
          };
        }
        return item;
      });
    } else {
      // Adding new
      const newEntry: DiaryEntry = {
        id: 'diary-' + Math.random().toString(36).substr(2, 9),
        title,
        content,
        category,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      updatedList = [newEntry, ...entries];
      setSelectedEntry(newEntry);
    }

    setEntries(updatedList);
    localStorage.setItem('asq-muted-void-diary', JSON.stringify(updatedList));
  };

  const startNewEntry = () => {
    const newDraft: DiaryEntry = {
      id: 'new',
      title: 'Untilted Nazm',
      content: '',
      category: 'Shayari',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedEntry(newDraft);
    setTitle('');
    setContent('');
    setCategory('Shayari');
    setAiFeedback('');
  };

  const deleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = entries.filter(item => item.id !== id);
    setEntries(updated);
    localStorage.setItem('asq-muted-void-diary', JSON.stringify(updated));
    
    if (selectedEntry?.id === id) {
      setSelectedEntry(updated.length > 0 ? updated[0] : null);
    }
  };

  // Ask Nukta to assist on custom draft
  const handleConsultNukta = async () => {
    if (!content.trim()) return;
    setAiLoading(true);
    setAiFeedback('');

    try {
      const response = await fetch('/api/literature-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          text: content.trim()
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
        setAiFeedback(`Failed to get feedback: ${errorMsg}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAiFeedback(data.answer);
      } else {
        setAiFeedback(data.error || 'Nukta had a moment of silence. Please rewrite slightly and check your meter again.');
      }
    } catch (err: any) {
      console.error(err);
      setAiFeedback(`Failed to reach Nukta: ${err.message || 'Ensure your server is active and the API key is set.'}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-50 border border-stone-200 rounded-2xl p-4 md:p-6 shadow-md animate-fade-in">
      {/* LEFT PANEL: Saved Drafts Index */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-stone-200 pb-4 md:pb-0 md:pr-4 flex flex-col gap-4">
        
        {/* Soul Journey / Streak UI */}
        <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${currentStreak > 0 ? 'bg-orange-100 text-orange-600' : 'bg-stone-200 text-stone-500'}`}>
              <Feather className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Soul Journey</p>
              <p className="font-serif text-sm font-semibold text-stone-800">
                {currentStreak > 0 ? `${currentStreak} Day${currentStreak > 1 ? 's' : ''} Writing` : 'Start your streak'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#bf9b30]" />
            <h4 className="font-serif text-sm font-semibold text-stone-800">My Drafts & Nazms</h4>
          </div>
          <button
            id="btn-new-draft"
            onClick={startNewEntry}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded text-stone-700 transition-colors flex items-center gap-1 text-[11px] font-mono"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Scrollable List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <p className="text-xs font-serif text-stone-400 italic text-center py-6">Your inkwell is empty.</p>
          ) : (
            entries.map(item => (
              <div
                id={`draft-${item.id}`}
                key={item.id}
                onClick={() => setSelectedEntry(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                  selectedEntry?.id === item.id
                    ? 'bg-[#bf9b30]/10 border-[#bf9b30]/40 shadow-sm'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#a28021] bg-[#bf9b30]/10 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                  <h5 className="font-serif text-xs font-semibold text-stone-800 truncate mt-1">
                    {item.title}
                  </h5>
                  <p className="text-[10px] text-stone-400 font-serif truncate mt-0.5">
                    {item.content || 'Blank page...'}
                  </p>
                </div>
                <button
                  id={`btn-delete-draft-${item.id}`}
                  onClick={(e) => deleteEntry(item.id, e)}
                  className="text-stone-400 hover:text-red-500 p-1 rounded hover:bg-stone-100 transition-all"
                  title="Delete draft"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Writing Canvas */}
      <div className="md:col-span-8 flex flex-col justify-between space-y-4">
        {selectedEntry ? (
          <form onSubmit={saveEntry} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Title Input */}
              <div className="sm:col-span-8">
                <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">Piece Title</label>
                <input
                  id="draft-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Ghazal-e-Muted-Void"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] shadow-sm"
                  required
                />
              </div>

              {/* Genre Selector */}
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">Form / Genre</label>
                <select
                  id="draft-genre"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-[#bf9b30] shadow-sm"
                >
                  <option value="Shayari">Sher / Shayari</option>
                  <option value="Ghazal">Ghazal</option>
                  <option value="Nazm">Nazm (Poem)</option>
                  <option value="Doha">Doha</option>
                  <option value="Diary">Diary Log</option>
                </select>
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1">
                Poetic Lines (Write your heart here)
              </label>
              <textarea
                id="draft-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rethink, write, and feel the void..."
                rows={6}
                className="w-full bg-white border border-stone-300 rounded-xl p-4 text-base font-serif text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#bf9b30] focus:border-[#bf9b30] resize-none shadow-sm"
                required
              />
            </div>

            {/* Actions Panel */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3">
              <button
                id="btn-consult-nukta"
                type="button"
                onClick={handleConsultNukta}
                disabled={!content.trim() || aiLoading}
                className={`py-2 px-4 rounded-xl text-xs font-serif font-medium border flex items-center gap-1.5 transition-all ${
                  content.trim() && !aiLoading
                    ? 'bg-[#bf9b30]/10 border-[#bf9b30]/30 text-[#a28021] hover:bg-[#bf9b30]/20'
                    : 'border-stone-200 text-stone-300 bg-stone-50 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Let Nukta Help Complete My Draft</span>
              </button>

              <button
                id="btn-save-draft"
                type="submit"
                className="bg-stone-800 hover:bg-stone-900 text-white rounded-xl py-2 px-5 text-xs font-serif font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
            <Feather className="w-8 h-8 text-stone-300 mb-2" />
            <p className="text-xs font-serif">Create a new draft or select one from the catalog to write.</p>
          </div>
        )}

        {/* AI Suggestions Display */}
        {aiLoading && (
          <div className="bg-white/50 border border-stone-200 rounded-xl p-4 flex items-center gap-3 animate-pulse">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#bf9b30] border-t-transparent" />
            <p className="text-xs font-serif italic text-stone-500">Nukta is listening to the rhythm of your words...</p>
          </div>
        )}

        {aiFeedback && (
          <div className="bg-[#FAF8F5] border border-[#bf9b30]/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#bf9b30]" />
              <h6 className="font-serif text-xs font-semibold text-[#a28021]">Nukta's Poetic Council</h6>
            </div>
            <div className="text-xs font-serif text-stone-700 leading-relaxed markdown-body">
              <Markdown>{aiFeedback}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
