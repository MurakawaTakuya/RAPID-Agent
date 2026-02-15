"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Folder } from "@/db/schema";
import { cn } from "@/lib/utils";
import { Check, FolderPlus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

interface FavoriteButtonProps {
  paperId: number;
  isFavorited: boolean;
  folders: Folder[];
  // currentFolderId? は不要になる（複数選択可のため）
  // 代わりに、この論文が所属しているフォルダIDのSetを受け取る
  selectedFolderIds?: Set<number>;
  isDefault?: boolean;

  onToggleFolder: (
    paperId: number,
    folderId: number | null,
    customFolderName?: string
  ) => Promise<boolean>;
  onRemove: (paperId: number) => Promise<boolean>;
  onCreateFolder: (name: string) => Promise<Folder | null>;
  className?: string;
}

export function FavoriteButton({
  paperId,
  isFavorited,
  folders,
  selectedFolderIds = new Set(),
  isDefault = false,

  onToggleFolder,
  onRemove,
  onCreateFolder,
  className,
}: FavoriteButtonProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSelectFolder = async (folderId: number | null) => {
    await onToggleFolder(paperId, folderId);
    // ポップアップは閉じない（複数選択のため）
  };

  const handleCreateFolder = async () => {
    if (!inputValue.trim()) return;
    const newFolder = await onCreateFolder(inputValue);
    if (newFolder) {
      await onToggleFolder(paperId, newFolder.id, newFolder.name);
      // 作成時は閉じる？続けて操作したいかも？一旦閉じるか。
      // setOpen(false);
      setInputValue("");
    }
  };

  const handleRemove = async () => {
    await onRemove(paperId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 transition-colors",
            isFavorited
              ? "text-yellow-400 hover:text-yellow-500"
              : "text-muted-foreground hover:text-foreground",
            className
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          title={isFavorited ? "お気に入り設定" : "お気に入りに追加"}
        >
          <Star className={cn("h-4 w-4", isFavorited && "fill-current")} />
          <span className="sr-only">
            {isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0"
        side="left"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder="フォルダを選択または作成..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-xs text-muted-foreground">
              {inputValue ? (
                <div className="flex flex-col gap-2">
                  <p>「{inputValue}」は見つかりません</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={handleCreateFolder}
                  >
                    <FolderPlus className="mr-2 h-3 w-3" />
                    新規作成して追加
                  </Button>
                </div>
              ) : (
                "フォルダ名を入力"
              )}
            </CommandEmpty>
            <CommandGroup heading="フォルダへ追加/移動">
              <CommandItem
                onSelect={() => handleSelectFolder(null)}
                className="text-xs cursor-pointer"
              >
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    isDefault
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}
                >
                  <Check className="h-3 w-3" />
                </div>
                デフォルト
              </CommandItem>
              {folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  onSelect={() => handleSelectFolder(folder.id)}
                  className="text-xs cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedFolderIds.has(folder.id)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                  {folder.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {isFavorited && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleRemove}
                    className="text-destructive text-xs focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    すべてのお気に入りから削除
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
