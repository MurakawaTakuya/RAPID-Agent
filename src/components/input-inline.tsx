"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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

export function InputInline() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!keyword.trim() || !user) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/cloud-run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.papers) {
          setResult(data);
        } else if (data.error) {
          setError(data.error);
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

  return (
    <div className="flex flex-col gap-4 items-center w-full">
      <Field
        orientation="horizontal"
        className="max-w-3xl w-full shadow-lg rounded-xl p-2 border bg-background"
      >
        <Input
          type="search"
          placeholder="Search papers..."
          className="h-12 text-lg border-0 shadow-none focus-visible:ring-0 px-4"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          disabled={loading}
        />
        <Button
          size="lg"
          className="h-10 px-6 rounded-lg cursor-pointer"
          onClick={handleSearch}
          disabled={loading || !user}
        >
          {loading ? (
            <>
              <Spinner />
              Searching
            </>
          ) : (
            "Search"
          )}
        </Button>
      </Field>

      {error && (
        <div className="max-w-3xl w-full p-4 rounded-lg border border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {result && result.papers && result.papers.length > 0 && (
        <div className="max-w-3xl w-full space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {result.papers.length} papers for &quot;{result.keyword}&quot;
          </p>
          <div className="grid gap-3">
            {result.papers.map((paper, index) => (
              <a
                key={index}
                href={paper.url}
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
