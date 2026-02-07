"use client";

import { EmbeddingGraph } from "@/components/embedding-graph";
import { InputInline, Paper } from "@/components/input-inline";
import { Introduction } from "@/components/introduction";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [searchedKeyword, setSearchedKeyword] = useState<string>("");

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Introduction />;
  }

  const handleSearchSuccess = (results: Paper[], keyword: string) => {
    setPapers(results);
    setSearchedKeyword(keyword);
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center pb-24 min-h-[calc(100vh-4rem)]">
        {!papers ? (
          <main className="flex flex-col items-center gap-8 w-full max-w-3xl px-4">
            <h2 className="text-2xl font-bold">
              どの学会や論文を検索しますか?
            </h2>
            <InputInline onSearchSuccess={handleSearchSuccess} />
          </main>
        ) : (
          <div className="w-full flex flex-col items-center relative h-full">
            <div className="w-full h-[60vh] relative">
              <EmbeddingGraph papers={papers} />
            </div>

            <div className="w-full max-w-5xl px-4 mt-8 pb-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  Results for &quot;{searchedKeyword}&quot; ({papers.length})
                </h3>
                <button
                  onClick={() => {
                    setPapers(null);
                    setSearchedKeyword("");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Back to Search
                </button>
              </div>

              <div className="grid gap-3">
                {papers.map((paper, index) => (
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
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
