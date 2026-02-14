"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { CategorizationInfo } from "@/lib/types";
import { parseErrorResponse } from "@/lib/utils";
import { Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";

interface CategorizationStepProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  categorizationInfo: CategorizationInfo | null;
  onCategorizationInfoChange: (info: CategorizationInfo | null) => void;
  externalError?: string | null;
}

export function CategorizationStep({
  inputValue,
  onInputChange,
  categorizationInfo,
  onCategorizationInfoChange,
  externalError,
}: CategorizationStepProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState<CategorizationInfo | null>(null);

  const handleGenerateInfo = async () => {
    if (!user || !inputValue.trim()) return;

    setLoading(true);
    setError(null);
    onCategorizationInfoChange(null);
    setIsEditing(false);
    setEditedInfo(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/cloud-run/categorize/suggest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: inputValue }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(
          response,
          "Failed to generate categories"
        );
        throw new Error(errorMessage);
      }

      const data = await response.json();
      onCategorizationInfoChange(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    if (categorizationInfo) {
      setEditedInfo(JSON.parse(JSON.stringify(categorizationInfo)));
      setIsEditing(true);
    }
  };

  const saveEditing = () => {
    if (editedInfo) {
      onCategorizationInfoChange(editedInfo);
      setIsEditing(false);
      setEditedInfo(null);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedInfo(null);
  };

  const updateCategory = (
    index: number,
    field: "title" | "content",
    value: string
  ) => {
    if (!editedInfo) return;
    const newCategories = [...editedInfo.categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setEditedInfo({ ...editedInfo, categories: newCategories });
  };

  const deleteCategory = (index: number) => {
    if (!editedInfo) return;
    const newCategories = editedInfo.categories.filter((_, i) => i !== index);
    setEditedInfo({ ...editedInfo, categories: newCategories });
  };

  const addCategory = () => {
    if (!editedInfo) return;
    setEditedInfo({
      ...editedInfo,
      categories: [...editedInfo.categories, { title: "", content: "" }],
    });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl px-4 items-center pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold mt-13">分類方法の設定</h2>
        <p className="text-muted-foreground">
          論文をどのように分類したいですか？
        </p>
      </div>

      {/* Step 1: Input & Generate Categories */}
      <div className="w-full max-w-3xl space-y-4">
        <label className="text-sm font-medium">
          どのように論文を分類したいですか？
        </label>
        <div className="flex gap-2 items-start">
          <Textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="例: 手法（Diffusion, GAN, VAE...）で分類して。あるいは、応用分野（医療、自動運転...）で。"
            className="flex-1 min-h-[100px] text-base"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                inputValue.trim()
              ) {
                e.preventDefault();
                handleGenerateInfo();
              }
            }}
          />
          <Button
            onClick={handleGenerateInfo}
            disabled={loading || !inputValue.trim()}
            className="h-[100px] px-6 flex flex-col gap-2"
          >
            {loading && !categorizationInfo ? (
              <Spinner className="text-primary-foreground" />
            ) : (
              <>
                <Sparkles className="size-5" />
                <span>提案</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Suggestion Display / Edit */}
      {categorizationInfo && (
        <div className="w-full max-w-3xl border rounded-lg p-6 bg-card space-y-6 animate-in fade-in duration-500 relative">
          {!isEditing ? (
            // Display Mode
            <>
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startEditing}
                  className="hover:bg-muted cursor-pointer"
                >
                  <Pencil className="size-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  {categorizationInfo.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  以下のカテゴリで分類を実行しますか？
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categorizationInfo.categories.map((cat) => (
                  <div
                    key={cat.title}
                    className="p-4 border rounded-md bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="font-medium text-primary mb-1">
                      {cat.title}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {cat.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Edit Mode
            <>
              <div className="flex items-center justify-between">
                <Input
                  value={editedInfo?.title || ""}
                  onChange={(e) =>
                    setEditedInfo((prev) =>
                      prev ? { ...prev, title: e.target.value } : null
                    )
                  }
                  className="font-semibold text-lg max-w-md"
                  placeholder="分類タイトル"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                    className="gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveEditing}
                    className="gap-1 cursor-pointer"
                  >
                    <Check className="size-4" />
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editedInfo?.categories.map((cat, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-md bg-background/50 space-y-3 relative group"
                  >
                    <div className="flex gap-2 items-center">
                      <Input
                        value={cat.title}
                        onChange={(e) =>
                          updateCategory(index, "title", e.target.value)
                        }
                        placeholder="カテゴリ名"
                        className="font-medium flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCategory(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={cat.content}
                      onChange={(e) =>
                        updateCategory(index, "content", e.target.value)
                      }
                      placeholder="カテゴリの説明"
                      className="text-sm min-h-[80px]"
                    />
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="h-full min-h-[150px] border-dashed flex flex-col gap-2 hover:bg-muted/50 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={addCategory}
                >
                  <Plus className="size-6" />
                  <span>カテゴリを追加</span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {(error || externalError) && (
        <div className="w-full max-w-3xl p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm text-center">
          {error || externalError}
        </div>
      )}
    </div>
  );
}
