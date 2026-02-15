"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFavorites } from "@/hooks/use-favorites";
import { CategorizedPaper } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronRight, FolderHeart } from "lucide-react";
import { useState } from "react";
import { PapersTable } from "./papers-table";

interface CategorizationResultsProps {
  groupedPapers: Record<string, CategorizedPaper[]>;
  categories: { title: string; content: string }[];
}

export function CategorizationResults({
  groupedPapers,
  categories,
}: CategorizationResultsProps) {
  const emptySet = new Set<number>();
  const { addGroupToFolder } = useFavorites();

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [targetPaperIds, setTargetPaperIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenDialog = (groupTitle: string, papers: CategorizedPaper[]) => {
    // 学会名と年をグループ内の論文から取得
    const conferenceName = papers.find((p) => p.conferenceName)?.conferenceName;
    const conferenceYear = papers.find((p) => p.conferenceYear)?.conferenceYear;
    const parts = [conferenceName, conferenceYear, groupTitle].filter(Boolean);
    setFolderName(parts.join(" "));
    setTargetPaperIds(papers.map((p) => p.id));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!folderName.trim() || targetPaperIds.length === 0) return;
    setIsSaving(true);
    try {
      await addGroupToFolder(targetPaperIds, folderName.trim());
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const AddToFavoritesButton = ({
    groupTitle,
    papers,
  }: {
    groupTitle: string;
    papers: CategorizedPaper[];
  }) => {
    if (papers.length === 0) return null;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDialog(groupTitle, papers);
        }}
        title="グループをお気に入りに追加"
      >
        <FolderHeart className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <>
      <div className="w-full space-y-10 pb-24 max-w-7xl px-4">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold mt-13">分類結果</h2>
          <p className="text-muted-foreground">
            AIによって分類された論文一覧です
          </p>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => {
            const groupPapers = groupedPapers[cat.title] || [];

            return (
              <Collapsible key={cat.title} className="group/collapsible">
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center">
                    <CollapsibleTrigger className="flex flex-1 items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer [&[data-state=open]>div>svg]:rotate-90">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" />
                        <div className="flex items-baseline gap-3 text-left">
                          <h3 className="text-lg font-bold text-primary">
                            {cat.title}
                          </h3>
                          <span
                            className={cn(
                              "text-sm font-medium px-2.5 py-0.5 rounded-full",
                              groupPapers.length > 0
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {groupPapers.length}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-right truncate max-w-[300px] md:max-w-md hidden sm:block">
                        {cat.content}
                      </p>
                    </CollapsibleTrigger>
                    <div className="pr-2">
                      <AddToFavoritesButton
                        groupTitle={cat.title}
                        papers={groupPapers}
                      />
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="p-4 pt-0 border-t">
                      <div className="mt-4">
                        {groupPapers.length > 0 ? (
                          <PapersTable
                            papers={groupPapers}
                            selectedPapers={emptySet}
                            message=""
                            readOnly={true}
                            showSimilarity={false}
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            このカテゴリに該当する論文はありません
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {/* Other Papers */}
          {groupedPapers["other"] && groupedPapers["other"].length > 0 && (
            <Collapsible className="group/collapsible">
              <div className="rounded-lg border bg-card">
                <div className="flex items-center">
                  <CollapsibleTrigger className="flex flex-1 items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer [&[data-state=open]>div>svg]:rotate-90">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" />
                      <div className="flex items-baseline gap-3 text-left">
                        <h3 className="text-lg font-bold text-muted-foreground">
                          その他
                        </h3>
                        <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {groupedPapers["other"].length}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <div className="pr-2">
                    <AddToFavoritesButton
                      groupTitle="その他"
                      papers={groupedPapers["other"]}
                    />
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="p-4 pt-0 border-t">
                    <div className="mt-4">
                      <PapersTable
                        papers={groupedPapers["other"]}
                        selectedPapers={emptySet}
                        message=""
                        readOnly={true}
                        showSimilarity={false}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
      </div>

      {/* フォルダ名編集モーダル */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>お気に入りに追加</DialogTitle>
            <DialogDescription>
              {targetPaperIds.length}件の論文を新しいフォルダに保存します
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label
              htmlFor="folder-name-input"
              className="text-sm font-medium mb-2 block"
            >
              フォルダ名
            </label>
            <Input
              id="folder-name-input"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="フォルダ名を入力"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSaving) {
                  handleSave();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !folderName.trim()}
            >
              {isSaving ? (
                <>
                  <Spinner className="mr-2" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
