"use client";

import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface Paper {
  id: number;
  title: string;
  url: string;
  abstract: string | null;
  conferenceName: string | null;
  conferenceYear: number | null;
}

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
        <div className="max-w-7xl w-full space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{result.message}</p>
            {selectedPapers.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                選択した{selectedPapers.size}件を削除
              </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          result.papers.length > 0 &&
                          selectedPapers.size === result.papers.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      タイトル
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap w-32">
                      Conference
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Abstract
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground w-20">
                      Link
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground w-20">
                      削除
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.papers.map((paper) => (
                    <tr
                      key={paper.id}
                      className={`hover:bg-accent/50 transition-colors ${
                        selectedPapers.has(paper.id) ? "bg-accent/30" : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPapers.has(paper.id)}
                          onChange={() => togglePaperSelection(paper.id)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-sm text-card-foreground line-clamp-2">
                          {paper.title}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(paper.conferenceName || paper.conferenceYear) && (
                          <div className="text-sm text-muted-foreground whitespace-nowrap">
                            {paper.conferenceName} {paper.conferenceYear}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {paper.abstract && (
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {paper.abstract}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <a
                          href={paper.url.startsWith("http") ? paper.url : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 hover:bg-accent rounded-md transition-colors"
                          title="新しいタブで開く"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleDeletePaper(paper.id)}
                          className="inline-flex items-center justify-center p-2 hover:bg-destructive/10 rounded-md transition-colors group"
                          title="削除"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground group-hover:text-destructive"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
