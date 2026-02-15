"use client";

import { PapersTable } from "@/components/papers-table";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/use-favorites";
import { Paper } from "@/lib/types";
import { Check, Pencil, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    favorites,
    loading: favoritesLoading,
    folders,
    renameFolder,
  } = useFavorites();
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get("folderId");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const canRename = useMemo(() => {
    if (!folderIdParam || folderIdParam === "null") return false;
    const fid = parseInt(folderIdParam);
    return !isNaN(fid);
  }, [folderIdParam]);

  const handleRename = async () => {
    if (!editName.trim() || !canRename || !folderIdParam) return;
    const fid = parseInt(folderIdParam);
    await renameFolder(fid, editName);
    setIsEditing(false);
  };

  const filteredFavorites = useMemo(() => {
    if (!folderIdParam) {
      // 全表示の場合は重複排除（同じ論文が複数のフォルダにある場合）
      // favoritesは日付順不同の可能性があるがAPIは日付順
      // Mapを使ってpaperIdごとに最新（または最初）のエントリを残す
      const uniqueMap = new Map();
      favorites.forEach((f) => {
        if (!uniqueMap.has(f.paperId)) {
          uniqueMap.set(f.paperId, f);
        }
      });
      return Array.from(uniqueMap.values());
    }
    if (folderIdParam === "null") {
      return favorites.filter((f) => f.folderId === null);
    }
    const fid = parseInt(folderIdParam);
    if (isNaN(fid)) return favorites;
    return favorites.filter((f) => f.folderId === fid);
  }, [favorites, folderIdParam]);

  const currentFolderName = useMemo(() => {
    if (!folderIdParam) return "すべて";
    if (folderIdParam === "null") return "デフォルト";
    const folder = folders.find((f) => f.id === parseInt(folderIdParam));
    return folder ? folder.name : "不明なフォルダ";
  }, [folders, folderIdParam]);

  if (authLoading || favoritesLoading) {
    return (
      <div className="flex bg-sidebar h-screen w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        お気に入りを表示するにはログインしてください。
      </div>
    );
  }

  // PapersTable expects Paper[]. Favorites are FavoriteWithPaper[].
  // We need to map them to Paper[].
  const papers = filteredFavorites.map(
    (f): Paper => ({
      ...f.paper,
      cosineSimilarity: null,
    })
  );

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center px-4 mb-5 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b justify-between">
        <div className="flex items-center gap-2 w-[120px]">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex-1 flex justify-center h-full items-center font-semibold text-lg">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 w-48 text-center"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={handleRename}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {currentFolderName} ({papers.length})
              {canRename && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditName(currentFolderName);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 w-[120px]">
          <AnimatedThemeToggler />
        </div>
      </header>

      <div className="flex flex-col items-center gap-8 w-full max-w-7xl px-4 mx-auto pb-24">
        {papers.length > 0 ? (
          <PapersTable
            papers={papers}
            selectedPapers={new Set()}
            message=""
            readOnly={false}
            showSimilarity={false}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">
            このフォルダにお気に入りは登録されていません。
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
