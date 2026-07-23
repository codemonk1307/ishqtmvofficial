import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Loader2, Calendar, X, Filter, Clock, ArrowDownUp } from 'lucide-react';

export default function BlogView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [timeFilter, setTimeFilter] = useState<'all' | 'lastWeek' | 'lastMonth' | 'last3Months' | 'last6Months' | 'last1Year'>('all');

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(fetched);
      } catch (err) {
        console.error('Error fetching blogs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const truncateHtml = (html: string, limit: number) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    if (text.length <= limit) return html;
    return `<p>${text.slice(0, limit)}...</p>`;
  };

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts];

    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (timeFilter) {
        case 'lastWeek':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'lastMonth':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'last3Months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'last6Months':
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case 'last1Year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      result = result.filter(post => {
        if (!post.createdAt?.toDate) return true; // keep if no date
        return post.createdAt.toDate() >= cutoffDate;
      });
    }

    result.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [posts, sortOrder, timeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (selectedPost) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-stone-50 overflow-y-auto animate-fade-in flex flex-col">
        <div className="min-h-screen flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <button 
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-serif text-sm"
            >
              <X className="w-5 h-5" /> Back to Log
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
              <Calendar className="w-4 h-4" />
              <span>{selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent'}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12">
          <h2 className="text-3xl md:text-5xl font-serif text-stone-900 mb-10 leading-tight">{selectedPost.title}</h2>
          <div 
            className="prose prose-lg md:prose-xl prose-stone font-serif text-stone-700 leading-relaxed max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedPost.content }}
          />
        </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in relative">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif text-stone-800 mb-4">The Muted Log</h1>
        <p className="font-serif italic text-stone-500">Occasional thoughts and updates from the void.</p>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="text-sm font-serif text-stone-600 font-medium">
          Showing {filteredAndSortedPosts.length} {filteredAndSortedPosts.length === 1 ? 'entry' : 'entries'}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-400" />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-stone-50 border border-stone-200 text-stone-700 text-xs rounded-lg focus:ring-1 focus:ring-stone-400 focus:border-stone-400 block p-2 outline-none cursor-pointer font-sans"
            >
              <option value="all">All time</option>
              <option value="lastWeek">Last Week</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
              <option value="last1Year">Last 1 Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-stone-400" />
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="bg-stone-50 border border-stone-200 text-stone-700 text-xs rounded-lg focus:ring-1 focus:ring-stone-400 focus:border-stone-400 block p-2 outline-none cursor-pointer font-sans"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {filteredAndSortedPosts.length === 0 ? (
        <div className="text-center text-stone-400 font-serif italic py-12 border border-dashed border-stone-200 rounded-xl">
          No entries found matching your filters.
        </div>
      ) : (
        <div className="space-y-8">
          {filteredAndSortedPosts.map(post => {
            const contentLimit = 300;
            const isLong = post.content.length > contentLimit;
            const displayContent = isLong ? truncateHtml(post.content, contentLimit) : post.content;

            return (
              <article key={post.id} className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-2xl font-serif text-stone-800 mb-2">{post.title}</h2>
                <div className="flex items-center gap-2 text-xs font-mono text-stone-400 mb-6">
                  <Calendar className="w-3 h-3" />
                  <span>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}</span>
                </div>
                <div 
                  className="prose prose-stone font-serif text-stone-600 leading-relaxed max-w-none overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                />
                {isLong && (
                  <button 
                    onClick={() => setSelectedPost(post)}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-xs font-serif rounded-full hover:bg-stone-800 transition-colors"
                  >
                    Read full entry
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}
