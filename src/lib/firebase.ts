import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Client-side Firebase configuration
const firebaseConfig = {
  projectId: "gen-lang-client-0963462151",
  appId: "1:101400443637:web:cb17c2738f66ff5634a3bc",
  apiKey: "AIzaSyBo4Go4pyljqSt6V8nwvCvpYP-l67s3DoA",
  authDomain: "gen-lang-client-0963462151.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ainsheenqafthemu-b393ce92-1c13-494e-957e-9989f5397679",
  storageBucket: "gen-lang-client-0963462151.firebasestorage.app",
  messagingSenderId: "101400443637"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if provided
const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
const auth = getAuth(app);

export { db, auth };

export interface MasterpieceSuggestion {
  id?: string;
  poet: string;
  work: string;
  email: string;
  timestamp: string;
}

// Save suggestion to Firestore
export async function saveSuggestion(poet: string, work: string, email: string) {
  try {
    const docRef = await addDoc(collection(db, "suggestions"), {
      poet,
      work,
      email: email || "anonymous",
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving suggestion to Firestore:", error);
    throw error;
  }
}

// Fetch recent suggestions from Firestore
export async function fetchRecentSuggestions(limitCount: number = 10): Promise<MasterpieceSuggestion[]> {
  try {
    const q = query(
      collection(db, "suggestions"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const suggestions: MasterpieceSuggestion[] = [];
    querySnapshot.forEach((doc) => {
      suggestions.push({
        id: doc.id,
        ...doc.data()
      } as MasterpieceSuggestion);
    });
    return suggestions;
  } catch (error) {
    console.error("Error fetching suggestions from Firestore:", error);
    return [];
  }
}
