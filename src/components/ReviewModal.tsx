import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Wand2, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewModal({ submission, onClose, onApprove, creatorPassword }: { submission: any, onClose: () => void, onApprove: (data: any) => void, creatorPassword: string }) {
  const [data, setData] = useState({
    title: submission.title || '',
    author: submission.author || '',
    category: submission.category || 'poetry',
    originalText: submission.originalText || '',
    romanizedText: '',
    englishTranslation: '',
    vocabulary: [] as { word: string; meaning: string }[]
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-nukta-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalText: data.originalText,
          author: data.author,
          creatorPassword
        })
      });
      const resData = await res.json();
      if (resData.success && resData.metadata) {
        setData(prev => ({
          ...prev,
          romanizedText: resData.metadata.romanizedText || prev.romanizedText,
          englishTranslation: resData.metadata.englishTranslation || prev.englishTranslation,
          vocabulary: resData.metadata.vocabulary || prev.vocabulary
        }));
        toast.success('Metadata generated successfully');
      } else {
        throw new Error(resData.error || 'Failed to generate');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error generating metadata');
    } finally {
      setIsGenerating(false);
    }
  };

  const addVocab = () => {
    setData(prev => ({
      ...prev,
      vocabulary: [...prev.vocabulary, { word: '', meaning: '' }]
    }));
  };

  const updateVocab = (index: number, field: 'word' | 'meaning', value: string) => {
    const newVocab = [...data.vocabulary];
    newVocab[index][field] = value;
    setData(prev => ({ ...prev, vocabulary: newVocab }));
  };

  const removeVocab = (index: number) => {
    const newVocab = [...data.vocabulary];
    newVocab.splice(index, 1);
    setData(prev => ({ ...prev, vocabulary: newVocab }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-stone-200 bg-stone-50">
          <h3 className="font-serif font-bold text-stone-800">Review Submission: {submission.title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full transition-colors text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Title</label>
              <input value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-serif" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Author</label>
              <input value={data.author} onChange={e => setData({...data, author: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-serif" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Original Text (Urdu/Hindi)</label>
            <textarea value={data.originalText} onChange={e => setData({...data, originalText: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-serif h-24" />
          </div>

          <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#bf9b30]/30 relative">
            <div className="absolute -top-3 right-4">
              <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-1.5 bg-[#bf9b30] hover:bg-[#a28021] text-white px-3 py-1 rounded-full text-[10px] font-mono shadow-sm transition-colors disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Auto-Fill Nukta Data
              </button>
            </div>
            
            <div className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">Romanized Text</label>
                <textarea value={data.romanizedText} onChange={e => setData({...data, romanizedText: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-serif h-24" placeholder="Generated transliteration..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">English Translation</label>
                <textarea value={data.englishTranslation} onChange={e => setData({...data, englishTranslation: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-serif h-24" placeholder="Generated translation..." />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">Vocabulary (Lafz)</label>
                <div className="space-y-2">
                  {data.vocabulary.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={v.word} onChange={e => updateVocab(i, 'word', e.target.value)} placeholder="Word" className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-serif" />
                      <span className="text-stone-400 text-xs">-</span>
                      <input value={v.meaning} onChange={e => updateVocab(i, 'meaning', e.target.value)} placeholder="Meaning" className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-serif" />
                      <button onClick={() => removeVocab(i)} className="p-1.5 text-red-400 hover:text-red-600 bg-white border border-stone-200 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addVocab} className="text-xs font-medium text-[#bf9b30] flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Add Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-bold font-serif transition-colors">
            Cancel
          </button>
          <button onClick={() => onApprove(data)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold font-serif shadow-sm transition-colors">
            Approve & Publish to Curated Mehfil
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
