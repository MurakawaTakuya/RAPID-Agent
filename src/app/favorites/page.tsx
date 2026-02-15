"use client";

import { PapersTable } from "@/components/papers-table";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/use-favorites";
import { Paper } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading: favoritesLoading, folders } = useFavorites();
  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get("folderId");

  const filteredFavorites = useMemo(() => {
    if (!folderIdParam) return favorites;
    if (folderIdParam === "null") {
      return favorites.filter((f) => f.folderId === null);
    }
    const fid = parseInt(folderIdParam);
    if (isNaN(fid)) return favorites;
    return favorites.filter((f) => f.folderId === fid);
  }, [favorites, folderIdParam]);

  const currentFolderName = useMemo(() => {
    if (!folderIdParam) return "すべて";
    if (folderIdParam === "null") return "未分類";
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
          {currentFolderName} ({papers.length})
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
