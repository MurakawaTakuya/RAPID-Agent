"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export function InputInline() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!keyword.trim() || !user) return;

    setLoading(true);
    setResult(null);

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
        setResult(data.message);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        setResult(`Error: ${error.message}`);
      } else {
        setResult(`Error: ${String(error)}`);
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
          placeholder="Search..."
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
      {result && (
        <div className="max-w-3xl w-full p-4 rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">Response:</p>
          <p className="text-lg font-medium">{result}</p>
        </div>
      )}
    </div>
  );
}
