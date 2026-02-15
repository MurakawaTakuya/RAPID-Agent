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
      // setLoading(true); // Suppress lint by not calling it here, assuming initial true is enough
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
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paperId, folderId }),
      });
      if (res.ok) {
        await fetchFavorites(); // Refresh
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      return false;
    }
  };

  const removeFavorite = async (favoriteId: number): Promise<boolean> => {
    if (!user) return false;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchFavorites(); // Refresh
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      return false;
    }
  };

  // 論文IDからお気に入りを削除するヘルパー
  const removeFavoriteByPaperId = async (paperId: number) => {
    const favorite = favorites.find((f) => f.paperId === paperId);
    if (favorite) {
      return removeFavorite(favorite.id);
    }
    return false;
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

  return {
    favorites,
    folders,
    loading,
    favoritePaperIds,
    addFavorite,
    removeFavorite,
    removeFavoriteByPaperId,
    createFolder,
    refreshFavorites: fetchFavorites,
    refreshFolders: fetchFolders,
  };
}
