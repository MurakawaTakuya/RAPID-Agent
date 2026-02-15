"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Folder } from "@/db/schema";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

interface FavoritesContextType {
  folders: Folder[];
  favoritePaperIds: Set<number>;
  loading: boolean;
  refreshFolders: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  addFavorite: (
    paperId: number,
    folderId?: number | null,
    customFolderName?: string
  ) => Promise<boolean>;
  removeFavorite: (favoriteId: number) => Promise<boolean>;
  removeFavoriteByPaperId: (paperId: number) => Promise<boolean>;
  toggleFolder: (
    paperId: number,
    folderId: number | null,
    customFolderName?: string
  ) => Promise<boolean>;
  createFolder: (name: string) => Promise<Folder | null>;
  renameFolder: (folderId: number, name: string) => Promise<Folder | null>;
  deleteFolder: (
    folderId: number,
    options?: { silent?: boolean }
  ) => Promise<boolean>;
  addGroupToFolder: (
    paperIds: number[],
    folderName: string
  ) => Promise<boolean>;
  getPaperFolderIds: (paperId: number) => Set<number>;
  isPaperInDefault: (paperId: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

// APIから返ってくる軽量なお気に入り型
interface FavoriteIdItem {
  id: number;
  paperId: number;
  folderId: number | null;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  // 全てのお気に入りIDとフォルダの紐付けを持つ
  const [favoriteItems, setFavoriteItems] = useState<FavoriteIdItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 派生ステータス: お気に入り登録されている論文IDのセット
  const favoritePaperIds = new Set(favoriteItems.map((f) => f.paperId));

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

  const fetchFavoritesIds = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      // idsOnly=true で軽量データを取得
      const res = await fetch("/api/favorites?idsOnly=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: FavoriteIdItem[] = await res.json();
        setFavoriteItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch favorites ids:", error);
    }
  }, [user]);

  // Data fetching effect
  useEffect(() => {
    if (authLoading || !user) return;

    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchFolders(), fetchFavoritesIds()]);
      if (mounted) {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, fetchFolders, fetchFavoritesIds]);

  // State reset effect
  useEffect(() => {
    if (!authLoading && !user) {
      // Avoid synchronous setState warning by pushing to next tick
      const timer = setTimeout(() => {
        setFolders((prev) => (prev.length ? [] : prev));
        setFavoriteItems((prev) => (prev.length ? [] : prev));
        setLoading((prev) => (prev ? false : prev));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  const addFavorite = async (
    paperId: number,
    folderId?: number | null,
    customFolderName?: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Snapshot
    const prevItems = [...favoriteItems];

    // Optimistic update
    const tempId = Date.now();
    const newItem: FavoriteIdItem = {
      id: tempId,
      paperId,
      folderId: folderId ?? null,
    };
    setFavoriteItems((prev) => [...prev, newItem]);

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
        // 成功したらIDを正規のものにするために再取得するのが確実だが
        // ここではAPIのレスポンスを使って更新することも可能
        // いったん再取得
        await fetchFavoritesIds();

        // メッセージ表示
        let folderName = "デフォルト";
        if (folderId) {
          const folder = folders.find((f) => f.id === folderId);
          if (folder) folderName = folder.name;
          else if (customFolderName) folderName = customFolderName;
        }
        toast.success(`「${folderName}」に保存しました`);
        return true;
      }

      // Revert
      setFavoriteItems(prevItems);
      toast.error("保存に失敗しました");
      return false;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      setFavoriteItems(prevItems);
      toast.error("保存に失敗しました");
      return false;
    }
  };

  const removeFavorite = async (favoriteId: number): Promise<boolean> => {
    // NOTE: favoriteId is needed to delete specific entry.
    if (!user) return false;

    const prevItems = [...favoriteItems];
    const targetItem = favoriteItems.find((f) => f.id === favoriteId);

    // Optimistic delete
    setFavoriteItems((prev) => prev.filter((f) => f.id !== favoriteId));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        let folderName = "デフォルト";
        if (targetItem?.folderId) {
          const folder = folders.find((f) => f.id === targetItem.folderId);
          if (folder) folderName = folder.name;
        }
        toast.success(`「${folderName}」から削除しました`);
        // await fetchFavoritesIds(); // Optional, local state should be fine
        return true;
      }

      setFavoriteItems(prevItems);
      toast.error("削除に失敗しました");
      return false;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      setFavoriteItems(prevItems);
      toast.error("削除に失敗しました");
      return false;
    }
  };

  const removeFavoriteByPaperId = async (paperId: number) => {
    if (!user) return false;
    const prevItems = [...favoriteItems];

    // Optimistic
    setFavoriteItems((prev) => prev.filter((f) => f.paperId !== paperId));

    const relatedItems = favoriteItems.filter((f) => f.paperId === paperId);
    if (relatedItems.length === 0) return false;

    try {
      const token = await user.getIdToken();
      // Delete all
      const results = await Promise.all(
        relatedItems.map((f) =>
          fetch(`/api/favorites/${f.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.ok)
        )
      );

      if (results.every((r) => r)) {
        toast.success("すべてのお気に入りから削除しました");
        return true;
      } else {
        // Partial failure
        await fetchFavoritesIds();
        toast.error("一部の削除に失敗しました");
        return false;
      }
    } catch (e) {
      console.error("Failed removeFavoriteByPaperId", e);
      setFavoriteItems(prevItems);
      toast.error("削除に失敗しました");
      return false;
    }
  };

  const toggleFolder = async (
    paperId: number,
    folderId: number | null,
    customFolderName?: string
  ) => {
    // Find existing entry
    const existing = favoriteItems.find(
      (f) => f.paperId === paperId && f.folderId === folderId
    );
    if (existing) {
      return removeFavorite(existing.id);
    } else {
      return addFavorite(paperId, folderId, customFolderName);
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
        setFolders((prev) => [...prev, newFolder]);
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
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updatedFolder : f))
        );
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

  const deleteFolder = async (
    folderId: number,
    options?: { silent?: boolean }
  ) => {
    if (!user) return false;
    const folder = folders.find((f) => f.id === folderId);
    const folderName = folder?.name ?? "フォルダ";

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        // Also need to refresh favorites because items in that folder might be moved to default (null) or deleted depending on backend logic.
        // Backend currently says: "Folder deleted" -> items.folderId becomes null (set null).
        // user needs to refresh favoriteItems to reflect that change (folderId: id -> null).
        await fetchFavoritesIds();
        if (!options?.silent) {
          toast.success(`フォルダ「${folderName}」を削除しました`);
        }
        return true;
      }
      if (!options?.silent) {
        toast.error("フォルダの削除に失敗しました");
      }
      return false;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      if (!options?.silent) {
        toast.error("フォルダの削除に失敗しました");
      }
      return false;
    }
  };

  const addGroupToFolder = async (
    paperIds: number[],
    folderName: string
  ): Promise<boolean> => {
    if (!user || paperIds.length === 0) return false;

    try {
      // Create folder
      const newFolder = await createFolder(folderName);
      if (!newFolder) return false;

      // Batch add
      const token = await user.getIdToken();
      const res = await fetch("/api/favorites/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paperIds, folderId: newFolder.id }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchFavoritesIds(); // Refresh to see new favorites
        toast.success(`${data.added}件の論文を「${folderName}」に保存しました`);
        return true;
      } else {
        // Rollback
        try {
          await deleteFolder(newFolder.id, { silent: true });
        } catch (e) {
          console.error("Failed to rollback", e);
        }
        toast.error("グループの保存に失敗しました");
        return false;
      }
    } catch (error) {
      console.error("Failed to add group to folder:", error);
      toast.error("グループの保存に失敗しました");
      return false;
    }
  };

  // Helpers
  const getPaperFolderIds = (paperId: number) => {
    return new Set(
      favoriteItems
        .filter((f) => f.paperId === paperId && f.folderId !== null)
        .map((f) => f.folderId as number)
    );
  };

  const isPaperInDefault = (paperId: number) => {
    return favoriteItems.some(
      (f) => f.paperId === paperId && f.folderId === null
    );
  };

  return (
    <FavoritesContext.Provider
      value={{
        folders,
        favoritePaperIds,
        loading,
        refreshFolders: fetchFolders,
        refreshFavorites: fetchFavoritesIds,
        addFavorite,
        removeFavorite,
        removeFavoriteByPaperId,
        toggleFolder,
        createFolder,
        renameFolder,
        deleteFolder,
        addGroupToFolder,
        getPaperFolderIds,
        isPaperInDefault,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
