"use client";

import { Paper, PapersTable } from "@/components/papers-table";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface Category {
  title: string;
  content: string;
}

interface CategorizationInfo {
  title: string;
  categories: Category[];
}

interface CategorizationStepProps {
  papers: Paper[];
}

export function CategorizationStep({ papers }: CategorizationStepProps) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [categorizationInfo, setCategorizationInfo] =
    useState<CategorizationInfo | null>(null);
  const [groupedResult, setGroupedResult] = useState<Record<
    string,
    Paper[]
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInfo = async () => {
    if (!user || !input.trim()) return;

    setLoading(true);
    setError(null);
    setCategorizationInfo(null);
    setGroupedResult(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/cloud-run/categorize/info", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: input }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate categories");
      }

      const data = await response.json();
      setCategorizationInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCategorization = async () => {
    if (!user || !categorizationInfo) return;

    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/cloud-run/categorize/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          info: categorizationInfo,
          paper_ids: papers.map((p) => p.id),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to categorize papers");
      }

      const data = await response.json();
      setGroupedResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl px-4 items-center pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">グループ化の設定</h2>
        <p className="text-muted-foreground">
          AIを使って論文を自動で分類・整理します
        </p>
      </div>

      {/* Step 1: Input & Generate Categories */}
      <div className="w-full max-w-3xl space-y-4">
        <label className="text-sm font-medium">
          どのように論文を分類したいですか？
        </label>
        <div className="flex gap-2 items-start">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: 手法（Diffusion, GAN, VAE...）で分類して。あるいは、応用分野（医療、自動運転...）で。"
            className="flex-1 min-h-[100px] text-base"
          />
          <Button
            onClick={handleGenerateInfo}
            disabled={loading || !input.trim()}
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
      {categorizationInfo && !groupedResult && (
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
            {categorizationInfo.categories.map((cat, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-md bg-background/50 hover:bg-background transition-colors"
              >
                <div className="font-medium text-primary mb-1">{cat.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {cat.content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleRunCategorization}
              disabled={loading}
              size="lg"
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  分類を実行中...
                </>
              ) : (
                "この分類でグループ化する"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results Display */}
      {groupedResult && (
        <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {categorizationInfo?.categories.map((cat) => {
            const groupPapers = groupedResult[cat.title] || [];
            if (groupPapers.length === 0) return null;
            return (
              <div key={cat.title} className="space-y-4">
                <div className="flex items-baseline gap-3 border-b pb-2">
                  <h3 className="text-xl font-bold text-primary">
                    {cat.title}
                  </h3>
                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {groupPapers.length}
                  </span>
                  <p className="text-sm text-muted-foreground ml-auto max-w-xl text-right truncate">
                    {cat.content}
                  </p>
                </div>

                <PapersTable
                  papers={groupPapers}
                  selectedPapers={new Set()}
                  message=""
                  onToggleSelectAll={() => {}}
                  onTogglePaperSelection={() => {}}
                  onDeletePaper={() => {}}
                  onDeleteSelected={() => {}}
                  readOnly={true}
                />
              </div>
            );
          })}

          {/* Other Papers */}
          {groupedResult["other"] && groupedResult["other"].length > 0 && (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3 border-b pb-2">
                <h3 className="text-xl font-bold text-muted-foreground">
                  その他
                </h3>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {groupedResult["other"].length}
                </span>
              </div>
              <PapersTable
                papers={groupedResult["other"]}
                selectedPapers={new Set()}
                message=""
                onToggleSelectAll={() => {}}
                onTogglePaperSelection={() => {}}
                onDeletePaper={() => {}}
                onDeleteSelected={() => {}}
                readOnly={true}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="w-full max-w-3xl p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
