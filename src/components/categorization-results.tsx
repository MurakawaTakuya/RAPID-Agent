"use client";

import { CategorizedPaper } from "@/lib/types";
import { PapersTable } from "./papers-table";

interface CategorizationResultsProps {
  groupedPapers: Record<string, CategorizedPaper[]>;
  categories: { title: string; content: string }[];
}

export function CategorizationResults({
  groupedPapers,
  categories,
}: CategorizationResultsProps) {
  const emptySet = new Set<number>();

  return (
    <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24 max-w-7xl px-4">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold mt-13">分類結果</h2>
        <p className="text-muted-foreground">
          AIによって分類された論文一覧です
        </p>
      </div>

      {categories.map((cat) => {
        const groupPapers = groupedPapers[cat.title] || [];
        if (groupPapers.length === 0) return null;
        return (
          <div key={cat.title} className="space-y-4">
            <div className="flex items-baseline gap-3 border-b pb-2">
              <h3 className="text-xl font-bold text-primary">{cat.title}</h3>
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {groupPapers.length}
              </span>
              <p className="text-sm text-muted-foreground ml-auto max-w-xl text-right truncate">
                {cat.content}
              </p>
            </div>

            <PapersTable
              papers={groupPapers}
              selectedPapers={emptySet}
              message=""
              readOnly={true}
              showSimilarity={false}
            />
          </div>
        );
      })}

      {/* Other Papers */}
      {groupedPapers["other"] && groupedPapers["other"].length > 0 && (
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 border-b pb-2">
            <h3 className="text-xl font-bold text-muted-foreground">その他</h3>
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {groupedPapers["other"].length}
            </span>
          </div>
          <PapersTable
            papers={groupedPapers["other"]}
            selectedPapers={emptySet}
            message=""
            readOnly={true}
            showSimilarity={false}
          />
        </div>
      )}
    </div>
  );
}
