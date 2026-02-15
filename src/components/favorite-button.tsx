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
  currentFolderId?: number | null; // Optional: to show checkmark
  onFavorite: (paperId: number, folderId?: number | null) => Promise<boolean>;
  onRemove: (paperId: number) => Promise<boolean>;
  onCreateFolder: (name: string) => Promise<Folder | null>;
  className?: string;
}

export function FavoriteButton({
  paperId,
  isFavorited,
  folders,
  currentFolderId,
  onFavorite,
  onRemove,
  onCreateFolder,
  className,
}: FavoriteButtonProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleSelectFolder = async (folderId: number | null) => {
    await onFavorite(paperId, folderId);
    setOpen(false);
  };

  const handleCreateFolder = async () => {
    if (!inputValue.trim()) return;
    const newFolder = await onCreateFolder(inputValue);
    if (newFolder) {
      await onFavorite(paperId, newFolder.id);
      setOpen(false);
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
        align="end"
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
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !isFavorited ||
                      currentFolderId === null ||
                      currentFolderId === undefined
                      ? "opacity-100"
                      : "opacity-0"
                    // currentFolderIdがundefinedの場合は判定が難しいが、とりあえず簡易実装
                  )}
                />
                未分類 (フォルダなし)
              </CommandItem>
              {folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  onSelect={() => handleSelectFolder(folder.id)}
                  className="text-xs cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentFolderId === folder.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
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
                    お気に入りから削除
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
