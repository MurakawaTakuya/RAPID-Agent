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

  // フォルダのトグル処理
  const toggleFolder = async (paperId: number, folderId: number | null) => {
    const existing = favorites.find(
      (f) => f.paperId === paperId && f.folderId === folderId
    );

    if (existing) {
      // 既にある場合は削除
      const success = await removeFavorite(existing.id);

      return success;
    } else {
      // ない場合は追加
      return addFavorite(paperId, folderId);
    }
  };

  // 論文IDからお気に入りを削除するヘルパー (全削除)
  const removeFavoriteByPaperId = async (paperId: number) => {
    // この論文に関連する全てのエントリを削除
    const relatedFavorites = favorites.filter((f) => f.paperId === paperId);
    if (relatedFavorites.length === 0) return false;

    const results = await Promise.all(
      relatedFavorites.map((f) => removeFavorite(f.id))
    );
    return results.every((r) => r);
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
