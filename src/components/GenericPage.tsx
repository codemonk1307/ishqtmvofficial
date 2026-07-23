import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface GenericPageProps {
  pageId: string;
}

export default function GenericPage({ pageId }: GenericPageProps) {
  const [content, setContent] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const pageDoc = await getDoc(doc(db, 'pages', pageId));
        if (pageDoc.exists()) {
          setContent(pageDoc.data() as { title: string; body: string });
        } else {
          // Fallback content if not found in db
          if (pageId === 'about') {
            setContent({
              title: 'About Us',
              body: `<p><strong>Ain</strong> (ع), <strong>Sheen</strong> (ش), <strong>Qaf</strong> (ق) are the Arabic/Urdu root letters that combine to form the word <strong>"Ishq" (عشق)</strong>, meaning profound Love.</p><p><strong>Ain</strong> literally means 'eye' or 'essence'—representing "The" ultimate observer. <strong>Sheen</strong> is the scattered secret, a quiet mystery—the "Muted". <strong>Qaf</strong> is the mythical cosmic mountain at the edge of existence—the "Void". Together, they weave <em>The Muted Void</em>.</p><p>All emotions, literature, art, creativity, and everything worth nurturing and nourishing is born out of this Love.</p>`
            });
          } else {
            setContent({
              title: pageId.replace('-', ' ').toUpperCase(),
              body: '<p>Content coming soon. This section is configurable from the database.</p>'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching page:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [pageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-serif text-stone-800 mb-8 pb-4 border-b border-stone-200">
        {content?.title}
      </h1>
      <div 
        className="prose prose-stone font-serif text-stone-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content?.body || '' }}
      />
    </div>
  );
}
