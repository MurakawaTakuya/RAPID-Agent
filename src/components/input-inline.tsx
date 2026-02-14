"use client";

import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

import { PapersTable } from "@/components/papers-table";
import { Paper } from "@/lib/types";

export interface SearchResult {
  conferences: string[];
  keyword: string;
  papers: Paper[];
  count: number;
  message: string;
  error?: string;
}

interface ConferenceApiResponse {
  heading: string;
  years: number[];
}

interface ConferenceGroup {
  heading: string;
  options: { value: string; label: string }[];
}

export interface InputInlineProps {
  result: SearchResult | null;
  onResultChange: (result: SearchResult | null) => void;
  // Search state
  selectedConferences: string[];
  onConferencesChange: (value: string[]) => void;
  keyword: string;
  onKeywordChange: (value: string) => void;
  threshold: number[];
  onThresholdChange: (value: number[]) => void;
}

export function InputInline({
  result,
  onResultChange,
  selectedConferences,
  onConferencesChange,
  keyword,
  onKeywordChange,
  threshold,
  onThresholdChange,
}: InputInlineProps) {
  const [conferenceOptions, setConferenceOptions] = useState<ConferenceGroup[]>(
    []
  );
  const [conferencesLoading, setConferencesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  // 学会の選択肢をDBから取得
  useEffect(() => {
    // ユーザーが変わるたびにローディング状態をリセット
    setConferencesLoading(true);

    if (!user) {
      setConferenceOptions([]);
      setConferencesLoading(false);
      return;
    }

    async function fetchConferences() {
      try {
        const token = await user!.getIdToken();
        const response = await fetch("/api/papers/conferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data: ConferenceApiResponse[] = await response.json();
          // APIレスポンスをMultiSelect用の形式に変換
          const groups: ConferenceGroup[] = data.map((group) => ({
            heading: group.heading,
            options: group.years.map((year) => ({
              value: `${group.heading.toLowerCase().replace(/\s+/g, "")}${year}`,
              label: `${group.heading} ${year}`,
            })),
          }));
          setConferenceOptions(groups);
        }
      } catch (err) {
        console.error("Failed to fetch conferences:", err);
      } finally {
        setConferencesLoading(false);
      }
    }
    fetchConferences();
  }, [user]);

  const handleSearch = async (overrideKeyword?: string) => {
    if (!user) return;

    const searchKeyword =
      typeof overrideKeyword === "string" ? overrideKeyword : keyword;

    setError(null);
    onResultChange(null);
    setSelectedPapers(new Set()); // Reset selection on new search

    // Validation: Conference selection is required
    if (selectedConferences.length === 0) {
      setError("学会を選択してください（必須）");
      return;
    }

    // Validation: Keyword is required
    if (!searchKeyword.trim()) {
      setError("検索キーワードを入力してください");
      return;
    }

    // Validation: Threshold must be between 0 and 1
    if (threshold[0] < 0 || threshold[0] > 1) {
      setError("しきい値は0から1の間で指定してください");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/cloud-run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conferences: selectedConferences,
          keyword: searchKeyword,
          threshold: threshold[0],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.papers) {
          onResultChange(data);
        } else if (data.error) {
          setError(data.error);
        } else {
          setError("予期しないレスポンス形式です");
        }
      } else {
        setError(data.error || "検索に失敗しました");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePaperSelection = (paperId: number) => {
    setSelectedPapers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!result?.papers) return;

    if (selectedPapers.size === result.papers.length) {
      setSelectedPapers(new Set());
    } else {
      setSelectedPapers(new Set(result.papers.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (!result?.papers) return;

    const remainingPapers = result.papers.filter(
      (paper) => !selectedPapers.has(paper.id)
    );
    onResultChange({
      ...result,
      papers: remainingPapers,
      count: remainingPapers.length,
    });
    setSelectedPapers(new Set());
  };

  const handleDeletePaper = (paperId: number) => {
    if (!result?.papers) return;

    const remainingPapers = result.papers.filter(
      (paper) => paper.id !== paperId
    );
    onResultChange({
      ...result,
      papers: remainingPapers,
      count: remainingPapers.length,
    });
    setSelectedPapers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(paperId);
      return newSet;
    });
  };

  return (
    <div className="flex flex-col gap-4 items-center w-full">
      {/* Conference Selection */}
      <div className="max-w-3xl w-full space-y-2">
        <label className="text-sm font-medium">学会を選択（複数選択可）</label>
        <MultiSelect
          options={conferenceOptions}
          placeholder={
            conferencesLoading
              ? "学会データを読み込み中..."
              : "学会と年を選択..."
          }
          onValueChange={onConferencesChange}
          defaultValue={selectedConferences}
          disabled={conferencesLoading}
          badgeAnimation="none"
          responsive={{
            mobile: { maxCount: 5 },
            tablet: { maxCount: 7 },
            desktop: { maxCount: 9 },
          }}
          className="w-full"
        />
      </div>

      {/* Keyword Input */}
      <div className="max-w-3xl w-full space-y-2">
        <label className="text-sm font-medium">検索キーワード</label>
        <Input
          type="search"
          placeholder="例: Diffusion, 3DGS, Tracking, NeRF, LoRA, Static Bias, VLM, Multimodal"
          className="h-12 text-lg"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.nativeEvent.isComposing &&
              keyword.trim()
            ) {
              handleSearch();
            }
          }}
          disabled={loading}
        />
      </div>

      {/* Sample Keywords */}
      <div className="max-w-3xl w-full flex flex-wrap gap-2 pt-1">
        {[
          "Action Recognition",
          "Object Detection",
          "Segmentation",
          "Diffusion",
          "Pose Estimation",
          "NeRF",
          "LoRA",
          "VLM",
          "Multimodal",
          "GAN",
          "VAE",
          "Inpainting",
          "Gaussian Splatting",
          "3D Reconstruction",
        ].map((word) => (
          <button
            key={word}
            onClick={() => {
              onKeywordChange(word);
              handleSearch(word);
            }}
            className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-left cursor-pointer"
            disabled={loading}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Threshold Slider */}
      <div className="max-w-3xl w-full space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">類似度しきい値 (≥)</label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={threshold[0]}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 1) {
                onThresholdChange([val]);
              }
            }}
            className="w-20 h-8 text-right"
          />
        </div>
        <Slider
          value={threshold}
          onValueChange={onThresholdChange}
          min={0}
          max={1}
          step={0.01}
          className="w-full"
        />
      </div>

      {/* Search Button */}
      <Button
        size="lg"
        className="max-w-3xl w-full h-12"
        onClick={() => handleSearch()}
        disabled={
          loading ||
          !user ||
          selectedConferences.length === 0 ||
          !keyword.trim()
        }
      >
        {loading ? (
          <>
            <Spinner />
            Searching
          </>
        ) : (
          "検索"
        )}
      </Button>

      <div className="w-full text-center text-sm text-muted-foreground mt-auto">
        最大500件まで検索できます
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-3xl w-full p-4 rounded-lg border border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && result.papers && result.papers.length > 0 && (
        <PapersTable
          papers={result.papers}
          selectedPapers={selectedPapers}
          message={result.message}
          onToggleSelectAll={toggleSelectAll}
          onTogglePaperSelection={togglePaperSelection}
          onDeletePaper={handleDeletePaper}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

      {result && result.papers && result.papers.length === 0 && (
        <div className="max-w-3xl w-full p-4 rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            結果が見つかりませんでした。キーワードを変更するか，類似度しきい値を下げてください．
          </p>
        </div>
      )}
    </div>
  );
}
