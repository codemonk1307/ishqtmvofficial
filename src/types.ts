/**
 * Types representing literature items and personal scratchpad entries
 */

export type LiteratureCategory = string;

export interface VocabularyWord {
  word: string;
  meaning: string;
  pronunciation?: string; // e.g. "vuhl-suhl"
}

export interface LiteratureItem {
  id: string;
  title: string;
  author: string;
  category: LiteratureCategory;
  originalText: string;     // Can be Urdu/Devanagari/English script
  romanizedText?: string;    // Roman script (Hinglish/Urdu in Latin script)
  hindiText?: string;        // Hindi/Devanagari script transliteration
  alternativeScripts?: Record<string, string>; // Any other scripts (e.g. { 'Persian': '...', 'Arabic': '...' })
  englishTranslation?: string;
  hindiUrduExplanation?: string; // Meaning & context in simple Hindi/Urdu
  vocabulary: VocabularyWord[];
  popularity: 'popular' | 'curated' | 'standard';
  viewsCount: number;
  likesCount: number;
  datePublished: string;     // ISO or readable date
  backgroundStory?: string;  // Context/history of when the poet wrote it
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}
