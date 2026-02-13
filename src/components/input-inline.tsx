"use client";

import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

import { Paper, PapersTable } from "@/components/papers-table";

interface SearchResult {
  conferences: string[];
  keyword: string;
  papers: Paper[];
  count: number;
  message: string;
  error?: string;
}

// Conference options grouped by conference name with years
const conferenceOptions = [
  {
    heading: "CVPR",
    options: [
      { value: "cvpr2024", label: "CVPR 2024" },
      { value: "cvpr2023", label: "CVPR 2023" },
      { value: "cvpr2022", label: "CVPR 2022" },
      { value: "cvpr2021", label: "CVPR 2021" },
    ],
  },
  {
    heading: "ICCV",
    options: [
      { value: "iccv2023", label: "ICCV 2023" },
      { value: "iccv2021", label: "ICCV 2021" },
      { value: "iccv2019", label: "ICCV 2019" },
    ],
  },
  {
    heading: "ECCV",
    options: [
      { value: "eccv2024", label: "ECCV 2024" },
      { value: "eccv2022", label: "ECCV 2022" },
      { value: "eccv2020", label: "ECCV 2020" },
    ],
  },
  {
    heading: "NeurIPS",
    options: [
      { value: "neurips2024", label: "NeurIPS 2024" },
      { value: "neurips2023", label: "NeurIPS 2023" },
      { value: "neurips2022", label: "NeurIPS 2022" },
    ],
  },
  {
    heading: "ICML",
    options: [
      { value: "icml2024", label: "ICML 2024" },
      { value: "icml2023", label: "ICML 2023" },
      { value: "icml2022", label: "ICML 2022" },
    ],
  },
  {
    heading: "ICLR",
    options: [
      { value: "iclr2024", label: "ICLR 2024" },
      { value: "iclr2023", label: "ICLR 2023" },
      { value: "iclr2022", label: "ICLR 2022" },
    ],
  },
  {
    heading: "SIGGRAPH",
    options: [
      { value: "siggraph2024", label: "SIGGRAPH 2024" },
      { value: "siggraph2023", label: "SIGGRAPH 2023" },
      { value: "siggraph2022", label: "SIGGRAPH 2022" },
    ],
  },
];

export function InputInline() {
  const [selectedConferences, setSelectedConferences] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [threshold, setThreshold] = useState([0.65]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!user) return;

    setError(null);
    setResult(null);
    setSelectedPapers(new Set()); // Reset selection on new search

    // Validation: Conference selection is required
    if (selectedConferences.length === 0) {
      setError("学会を選択してください（必須）");
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
          keyword,
          threshold: threshold[0],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.papers) {
          setResult(data);
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
    setResult({
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
    setResult({
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
    <div className="flex flex-col gap-6 items-center w-full">
      {/* Conference Selection */}
      <div className="max-w-3xl w-full space-y-2">
        <label className="text-sm font-medium">学会を選択（複数選択可）</label>
        <MultiSelect
          options={conferenceOptions}
          placeholder="学会と年を選択..."
          onValueChange={setSelectedConferences}
          value={selectedConferences}
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
          placeholder="例: Diffusion, 3DGS, 静的バイアス関連"
          className="h-12 text-lg"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          disabled={loading}
        />
      </div>

      {/* Threshold Slider */}
      <div className="max-w-3xl w-full space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">類似度しきい値</label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={threshold[0]}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 1) {
                setThreshold([val]);
              }
            }}
            className="w-20 h-8 text-right"
          />
        </div>
        <Slider
          value={threshold}
          onValueChange={setThreshold}
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
        onClick={handleSearch}
        disabled={loading || !user || selectedConferences.length === 0}
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
            結果が見つかりませんでした
          </p>
        </div>
      )}
    </div>
  );
}
