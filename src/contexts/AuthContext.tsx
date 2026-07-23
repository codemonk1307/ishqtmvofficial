import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  lastReadDate?: string;
  currentStreak?: number;
  longestStreak?: number;
  bookmarks?: string[];
  writtenCount?: number;
  publishedCount?: number;
  reviewCount?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateStreak: () => Promise<void>;
  updateUserBookmarks: (bookmarks: string[]) => Promise<void>;
  updateUserStats: (stats: { writtenCount?: number; publishedCount?: number; reviewCount?: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: 'user',
            currentStreak: 0,
            longestStreak: 0,
            bookmarks: [],
            writtenCount: 0,
            publishedCount: 0,
            reviewCount: 0
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateStreak = async () => {
    if (!user || !profile) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastRead = profile.lastReadDate;
    
    if (lastRead === today) return; // Already updated today

    let newStreak = (profile.currentStreak || 0) + 1;
    
    if (lastRead) {
      const lastDate = new Date(lastRead);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 1) {
        newStreak = 1; // reset streak
      }
    }

    const newLongest = Math.max(newStreak, profile.longestStreak || 0);

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      lastReadDate: today,
      currentStreak: newStreak,
      longestStreak: newLongest
    });

    setProfile({
      ...profile,
      lastReadDate: today,
      currentStreak: newStreak,
      longestStreak: newLongest
    });
  };

  const updateUserBookmarks = async (bookmarks: string[]) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { bookmarks });
    setProfile({ ...profile, bookmarks });
  };

  const updateUserStats = async (stats: { writtenCount?: number; publishedCount?: number; reviewCount?: number }) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    
    const updates: any = {};
    if (stats.writtenCount !== undefined) updates.writtenCount = (profile.writtenCount || 0) + stats.writtenCount;
    if (stats.publishedCount !== undefined) updates.publishedCount = (profile.publishedCount || 0) + stats.publishedCount;
    if (stats.reviewCount !== undefined) updates.reviewCount = (profile.reviewCount || 0) + stats.reviewCount;
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
      setProfile({ ...profile, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, updateStreak, updateUserBookmarks, updateUserStats }}>
      {children}
    </AuthContext.Provider>
  );
};
