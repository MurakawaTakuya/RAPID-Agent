"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface SearchHistoryItem {
  id: number;
  userId: string;
  keyword: string;
  conferences: string | null;
  createdAt: string;
}

interface SearchHistoryContextType {
  history: SearchHistoryItem[];
  loading: boolean;
  addHistory: (keyword: string, conferences: string[]) => Promise<void>;
}

const SearchHistoryContext = createContext<SearchHistoryContextType | null>(
  null
);

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/search-history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch search history:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addHistory = useCallback(
    async (keyword: string, conferences: string[]) => {
      if (!user) return;

      // Optimistic update: add to list immediately
      const tempId = Date.now();
      const optimisticItem: SearchHistoryItem = {
        id: tempId,
        userId: user.uid,
        keyword: keyword.trim(),
        conferences: JSON.stringify(conferences),
        createdAt: new Date().toISOString(),
      };
      setHistory((prev) => [optimisticItem, ...prev].slice(0, 30));

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/search-history", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keyword, conferences }),
        });

        if (response.ok) {
          const saved = await response.json();
          // Replace temp item with real one from DB
          setHistory((prev) =>
            prev.map((item) => (item.id === tempId ? saved : item))
          );
        } else {
          // Rollback on failure
          setHistory((prev) => prev.filter((item) => item.id !== tempId));
        }
      } catch (err) {
        console.error("Failed to add search history:", err);
        // Rollback on error
        setHistory((prev) => prev.filter((item) => item.id !== tempId));
      }
    },
    [user]
  );

  return (
    <SearchHistoryContext.Provider value={{ history, loading, addHistory }}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  const context = useContext(SearchHistoryContext);
  if (!context) {
    throw new Error(
      "useSearchHistory must be used within a SearchHistoryProvider."
    );
  }
  return context;
}
