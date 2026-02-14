"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { CategorizationInfo } from "@/lib/types";
import { parseErrorResponse } from "@/lib/utils";
import { Sparkles } from "lucide-react";
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

  const handleGenerateInfo = async () => {
    if (!user || !inputValue.trim()) return;

    setLoading(true);
    setError(null);
    onCategorizationInfoChange(null);

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

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl px-4 items-center pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold mt-13">グループ化の設定</h2>
        <p className="text-muted-foreground">
          論文をどのように分類するかAIと相談できます
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

      {/* Suggestion Display */}
      {categorizationInfo && (
        <div className="w-full max-w-3xl border rounded-lg p-6 bg-card space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <div className="font-medium text-primary mb-1">{cat.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {cat.content}
                </div>
              </div>
            ))}
          </div>
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
