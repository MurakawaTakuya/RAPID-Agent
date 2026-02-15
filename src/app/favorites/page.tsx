"use client";

import { PapersTable } from "@/components/papers-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Favorite, Folder } from "@/db/schema";
import { Paper } from "@/lib/types";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// FavoriteWithPaper type definition for local use
type FavoriteWithPaper = Favorite & {
  paper: Paper;
  folder: Folder | null;
};

export default function FavoritesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex bg-sidebar h-screen w-full items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <FavoritesContent />
    </Suspense>
  );
}

function FavoritesContent() {
  const { user, loading: authLoading } = useAuth();
  const {
    folders,
    loading: contextLoading,
    renameFolder,
    deleteFolder,
  } = useFavorites();

  const searchParams = useSearchParams();
  const router = useRouter();
  const folderIdParam = searchParams.get("folderId");

  // Local state for full favorite papers
  const [favorites, setFavorites] = useState<FavoriteWithPaper[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const papers = useMemo(() => {
    const uniqueMap = new Map<number, Paper>();
    favorites.forEach((f) => {
      if (!uniqueMap.has(f.paperId)) {
        uniqueMap.set(f.paperId, {
          ...f.paper,
          cosineSimilarity: null,
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [favorites]);

  // Fetch favorites when folderIdParam changes
  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      setFavoritesLoading(true);
      try {
        const token = await user.getIdToken();
        const url = new URL("/api/favorites", window.location.href);
        if (folderIdParam) {
          url.searchParams.set("folderId", folderIdParam);
        }

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          // 「すべて」表示の際は、論文が重複しないようにクライアント側でユニークにする
          if (!folderIdParam) {
            const uniqueMap = new Map<number, FavoriteWithPaper>();
            data.forEach((f: FavoriteWithPaper) => {
              if (!uniqueMap.has(f.paperId)) {
                uniqueMap.set(f.paperId, f);
              }
            });
            setFavorites(Array.from(uniqueMap.values()));
          } else {
            setFavorites(data);
          }
        } else {
          console.error("Failed to fetch favorites");
          toast.error("お気に入りの取得に失敗しました");
        }
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
        toast.error("お気に入りの取得に失敗しました");
      } finally {
        setFavoritesLoading(false);
      }
    };

    fetchFavorites();
  }, [user, folderIdParam]);

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

  const handleDelete = async () => {
    if (!canRename || !folderIdParam) return;
    const fid = parseInt(folderIdParam);
    const success = await deleteFolder(fid);
    setShowDeleteDialog(false);
    if (success) {
      router.push("/favorites");
    }
  };

  const currentFolderName = useMemo(() => {
    if (!folderIdParam) return "すべて";
    if (folderIdParam === "null") return "デフォルト";
    const folder = folders.find((f) => f.id === parseInt(folderIdParam));
    return folder ? folder.name : "不明なフォルダ";
  }, [folders, folderIdParam]);

  if (authLoading || (contextLoading && folders.length === 0)) {
    // Wait for auth and initial folder load (at least to know if they exist)
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
            <div className="flex items-center gap-1">
              {currentFolderName} ({favoritesLoading ? "..." : papers.length})
              {canRename && (
                <>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    title="フォルダを削除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 w-[120px]">
          <AnimatedThemeToggler />
        </div>
      </header>

      <div className="flex flex-col items-center gap-8 w-full max-w-7xl px-4 mx-auto pb-24">
        {favoritesLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : papers.length > 0 ? (
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フォルダを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              フォルダ「{currentFolderName}」を削除します。
              フォルダ内の論文はデフォルトに移動されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarInset>
  );
}
