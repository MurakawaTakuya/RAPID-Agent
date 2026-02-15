"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";

export interface SearchHistoryItem {
  id: number;
  userId: string;
  keyword: string;
  conferences: string | null;
  createdAt: string;
}

export function useSearchHistory() {
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
          // Refresh history after adding
          await fetchHistory();
        }
      } catch (err) {
        console.error("Failed to add search history:", err);
      }
    },
    [user, fetchHistory]
  );

  return { history, loading, addHistory };
}
