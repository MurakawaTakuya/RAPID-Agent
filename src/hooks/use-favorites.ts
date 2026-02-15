import { useAuth } from "@/contexts/AuthContext";
import { Favorite, Folder, Paper } from "@/db/schema";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
      const fetchData = async () => {
        setLoading(true);
        try {
          await Promise.all([fetchFavorites(), fetchFolders()]);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setFavorites([]);
      setFolders([]);
      setFavoritePaperIds(new Set());
      setLoading(false);
    }
  }, [user, fetchFavorites, fetchFolders]);

  const addFavorite = async (
    paperId: number,
    folderId?: number | null,
    customFolderName?: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Snapshot for revert
    const previousFavorites = [...favorites];
    const previousIds = new Set(favoritePaperIds);

    // Optimistic update
    const tempId = Date.now(); // Temporary ID
    // Note: We use dummy data for properties we don't have.
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
        // Find folder name if folderId is provided
        let folderName = "デフォルト";
        if (folderId) {
          const folder = folders.find((f) => f.id === folderId);
          if (folder) {
            folderName = folder.name;
          } else if (customFolderName) {
            folderName = customFolderName;
          }
        }
        toast.success(`「${folderName}」に保存しました`);
        await fetchFavorites(); // Refresh to get real data
        return true;
      }

      // Revert on failure
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      toast.error("保存に失敗しました");
      return false;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      // Revert logic
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      toast.error("保存に失敗しました");
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
        // Find folder name if exists (using snapshot)
        let folderName = "デフォルト";
        const removedFavorite = previousFavorites.find(
          (f) => f.id === favoriteId
        );
        if (removedFavorite?.folderId) {
          const folder = folders.find((f) => f.id === removedFavorite.folderId);
          if (folder) folderName = folder.name;
        }

        toast.success(`「${folderName}」から削除しました`);
        return true;
      }
      // Revert
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      toast.error("削除に失敗しました");
      return false;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      toast.error("削除に失敗しました");
      return false;
    }
  };

  // フォルダのトグル処理
  // フォルダのトグル処理
  const toggleFolder = async (
    paperId: number,
    folderId: number | null,
    customFolderName?: string
  ) => {
    const existing = favorites.find(
      (f) => f.paperId === paperId && f.folderId === folderId
    );

    if (existing) {
      // 既にある場合は削除
      return removeFavorite(existing.id);
    } else {
      // ない場合は追加
      return addFavorite(paperId, folderId, customFolderName);
    }
  };

  // 論文IDからお気に入りを削除するヘルパー (全削除)
  const removeFavoriteByPaperId = async (paperId: number) => {
    if (!user) return false;

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
        toast.success("すべてのお気に入りから削除しました");
        return true;
      } else {
        // Partial failure? Revert all for safety or just re-fetch.
        await fetchFavorites();
        toast.error("一部の削除に失敗しました");
        return false;
      }
    } catch (e) {
      console.error("Failed removeFavoriteByPaperId", e);
      setFavorites(previousFavorites);
      setFavoritePaperIds(previousIds);
      toast.error("削除に失敗しました");
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
        toast.success(`フォルダ「${name}」を作成しました`);
        return newFolder;
      }
      return null;
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("フォルダの作成に失敗しました");
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
        toast.success(`フォルダ名を「${name}」に変更しました`);
        return updatedFolder;
      }
      return null;
    } catch (error) {
      console.error("Failed to rename folder:", error);
      toast.error("フォルダ名の変更に失敗しました");
      return null;
    }
  };

  const deleteFolder = async (folderId: number) => {
    if (!user) return false;

    // フォルダ名を取得（トースト用）
    const folder = folders.find((f) => f.id === folderId);
    const folderName = folder?.name ?? "フォルダ";

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await Promise.all([fetchFolders(), fetchFavorites()]);
        toast.success(`フォルダ「${folderName}」を削除しました`);
        return true;
      }
      toast.error("フォルダの削除に失敗しました");
      return false;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast.error("フォルダの削除に失敗しました");
      return false;
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
    deleteFolder,
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
