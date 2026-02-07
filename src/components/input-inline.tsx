"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export interface Paper {
  title: string;
  url: string;
  embedding?: number[];
}

interface InputInlineProps {
  onSearchSuccess?: (papers: Paper[], keyword: string) => void;
}

export function InputInline({ onSearchSuccess }: InputInlineProps) {
  const [keyword, setKeyword] = useState("");
  // Remove local result state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!keyword.trim() || !user) return;

    setLoading(true);
    // setResult(null); // Removed locally
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
          // Pass data up instead of setting local state
          if (onSearchSuccess) {
            onSearchSuccess(data.papers, data.keyword);
          }
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
    </div>
  );
}
