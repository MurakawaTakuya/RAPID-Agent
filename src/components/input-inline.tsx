"use client";

import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface Paper {
  title: string;
  url: string;
  embedding?: number[];
}

interface SearchResult {
  papers: Paper[];
  keyword: string;
  uid: string;
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
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!user) return;

    // For now, just console log the values (backend will be implemented separately)
    console.log({
      selectedConferences,
      keyword,
    });

    setError(null);
    setResult(null);

    // Validation: Conference selection is required
    if (selectedConferences.length === 0) {
      setError("学会を選択してください（必須）");
      return;
    }

    // TODO: Backend integration will be added later
    // For now, show a message
    setError("バックエンド処理は別途実装予定です");

    /* Original API call - will be reconnected later
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
          keyword 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.papers) {
          setResult(data);
        } else if (data.error) {
          setError(data.error);
        } else if (data.message) {
          setError(data.message);
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
    */
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
        <div className="max-w-3xl w-full space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {result.papers.length} papers for &quot;{result.keyword}&quot;
          </p>
          <div className="grid gap-3">
            {result.papers.map((paper, index) => (
              <a
                key={index}
                href={paper.url.startsWith("http") ? paper.url : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {paper.url}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {result && result.papers && result.papers.length === 0 && (
        <div className="max-w-3xl w-full p-4 rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            No papers found for &quot;{result.keyword}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
