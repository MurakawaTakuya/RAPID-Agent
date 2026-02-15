import { useAuth } from "@/contexts/AuthContext";
import { Favorite, Folder, Paper } from "@/db/schema";
import { useCallback, useEffect, useState } from "react";

export type FavoriteWithPaper = Favorite & {
  paper: Paper;
  folder: Folder | null;
};

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteWithPaper[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritePaperIds, setFavoritePaperIds] = useState<Set<number>>(
    new Set()
  );

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: FavoriteWithPaper[] = await res.json();
        setFavorites(data);
        setFavoritePaperIds(new Set(data.map((f) => f.paperId)));
      }
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    }
  }, [user]);

  const fetchFolders = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/folders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Folder[] = await res.json();
        setFolders(data);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchFavorites(), fetchFolders()]).finally(() =>
        setLoading(false)
      );
    } else {
      setFavorites([]);
      setFolders([]);
      setFavoritePaperIds(new Set());
      setLoading(false);
    }
  }, [user, fetchFavorites, fetchFolders]);

  const addFavorite = async (
    paperId: number,
    folderId?: number | null
  ): Promise<boolean> => {
    if (!user) return false;

    // Optimistic update
    const tempId = Date.now(); // Temporary ID
    // Note: We use dummy data for properites we don't have.
    // This is safe for "isFavorited" checks (based on ID) but listing these optimistically created items
    // might show empty titles until refresh.
    const newFavorite: FavoriteWithPaper = {
      id: tempId,
      userId: user.uid,
      paperId,
      folderId: folderId ?? null,
      createdAt: new Date(),
      paper: {
        id: paperId,
        title: "",
        url: "",
        abstract: null,
        authors: null,
        conferenceName: null,
        conferenceYear: null,
        embedding: null,
        createdAt: new Date(),
      },
      folder: null,
    };

    try {
      const token = await user.getIdToken();

      setFavorites((prev) => [...prev, newFavorite]);
      setFavoritePaperIds((prev) => new Set(prev).add(paperId));

      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paperId, folderId }),
      });
      if (res.ok) {
        await fetchFavorites(); // Refresh to get real data
        return true;
      }

      // Revert on failure
      setFavorites((prev) => prev.filter((f) => f.id !== tempId));
      setFavoritePaperIds((prev) => {
        const next = new Set(prev);
        const count = favorites.filter(
          (f) => f.id !== tempId && f.paperId === paperId
        ).length;
        if (count === 0) next.delete(paperId);
        return next;
      });
      return false;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      // Revert logic
      setFavorites((prev) => prev.filter((f) => f.id !== tempId));
      setFavoritePaperIds((prev) => {
        const next = new Set(prev);
        const count = favorites.filter(
          (f) => f.id !== tempId && f.paperId === paperId
        ).length;
        if (count === 0) next.delete(paperId);
        return next;
      });
      return false;
    }
  };

  const removeFavorite = async (favoriteId: number): Promise<boolean> => {
    if (!user) return false;

    // Snapshot for revert
    const previousFavorites = [...favorites];
    const previousIds = new Set(favoritePaperIds);

    // Optimistic delete
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    // Check if any other entries remain for this paper
    const removedItem = favorites.find((f) => f.id === favoriteId);
    if (removedItem) {
      const remaining = favorites.filter(
        (f) => f.id !== favoriteId && f.paperId === removedItem.paperId
      );
      if (remaining.length === 0) {
        setFavoritePaperIds((prev) => {
          const next = new Set(prev);
          next.delete(removedItem.paperId);
          return next;
        });
      }
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return true;
      }
      // Revert
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      return false;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      return false;
    }
  };

  // フォルダのトグル処理
  const toggleFolder = async (paperId: number, folderId: number | null) => {
    const existing = favorites.find(
      (f) => f.paperId === paperId && f.folderId === folderId
    );

    if (existing) {
      // 既にある場合は削除
      return removeFavorite(existing.id);
    } else {
      // ない場合は追加
      return addFavorite(paperId, folderId);
    }
  };

  // 論文IDからお気に入りを削除するヘルパー (全削除)
  const removeFavoriteByPaperId = async (paperId: number) => {
    // Snapshot
    const previousFavorites = [...favorites];
    const previousIds = new Set(favoritePaperIds);

    // Optimistic delete
    setFavorites((prev) => prev.filter((f) => f.paperId !== paperId));
    setFavoritePaperIds((prev) => {
      const next = new Set(prev);
      next.delete(paperId);
      return next;
    });

    // この論文に関連する全てのエントリを削除 IDs needed for API calls
    const relatedFavorites = favorites.filter((f) => f.paperId === paperId);
    if (relatedFavorites.length === 0) return false;

    // Use Promise.allSettled or just try loop.
    // `removeFavorite` inside here would preserve its own optimistic logic which is confusing.
    // We should call API directly or use a raw remove helper.
    // But `removeFavorite` has the logic.
    // For `removeFavoriteByPaperId` specifically, let's just do the API calls and if any fail, revert ALL.
    // Actually, `removeFavorite` is now optimistic. Calling it multiple times will trigger multiple state updates.
    // That might be messy.
    // Better to implement raw API calls here.

    try {
      const token = await user.getIdToken();
      const results = await Promise.all(
        relatedFavorites.map((f) =>
          fetch(`/api/favorites/${f.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.ok)
        )
      );

      if (results.every((r) => r)) {
        return true;
      } else {
        // Partial failure? Revert all for safety or just re-fetch.
        await fetchFavorites();
        return false;
      }
    } catch (e) {
      console.error("Failed removeFavoriteByPaperId", e);
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      return false;
    }
  };

  const createFolder = async (name: string) => {
    if (!user) return null;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newFolder: Folder = await res.json();
        await fetchFolders(); // Refresh
        return newFolder;
      }
      return null;
    } catch (error) {
      console.error("Failed to create folder:", error);
      return null;
    }
  };

  const renameFolder = async (folderId: number, name: string) => {
    if (!user) return null;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const updatedFolder: Folder = await res.json();
        await fetchFolders(); // Refresh
        return updatedFolder;
      }
      return null;
    } catch (error) {
      console.error("Failed to rename folder:", error);
      return null;
    }
  };

  return {
    favorites,
    folders,
    loading,
    favoritePaperIds,
    addFavorite,
    removeFavorite,
    removeFavoriteByPaperId,
    toggleFolder,
    createFolder,
    renameFolder,
    refreshFavorites: fetchFavorites,
    refreshFolders: fetchFolders,
    // ヘルパー: 特定の論文が所属するフォルダID一覧を取得
    getPaperFolderIds: (paperId: number) => {
      return new Set(
        favorites
          .filter((f) => f.paperId === paperId && f.folderId !== null)
          .map((f) => f.folderId as number)
      );
    },
    // ヘルパー: 特定の論文がデフォルト（未分類）に含まれるか
    isPaperInDefault: (paperId: number) => {
      return favorites.some(
        (f) => f.paperId === paperId && f.folderId === null
      );
    },
  };
}
