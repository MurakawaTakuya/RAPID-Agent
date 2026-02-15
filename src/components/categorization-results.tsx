"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CategorizedPaper } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
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
    <div className="w-full space-y-10 pb-24 max-w-7xl px-4">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold mt-13">分類結果</h2>
        <p className="text-muted-foreground">
          AIによって分類された論文一覧です
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const groupPapers = groupedPapers[cat.title] || [];

          return (
            <Collapsible key={cat.title} className="group/collapsible">
              <div className="rounded-lg border bg-card">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer [&[data-state=open]>div>svg]:rotate-90">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" />
                    <div className="flex items-baseline gap-3 text-left">
                      <h3 className="text-lg font-bold text-primary">
                        {cat.title}
                      </h3>
                      <span
                        className={cn(
                          "text-sm font-medium px-2.5 py-0.5 rounded-full",
                          groupPapers.length > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {groupPapers.length}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-right truncate max-w-[300px] md:max-w-md hidden sm:block">
                    {cat.content}
                  </p>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 border-t">
                    <div className="mt-4">
                      {groupPapers.length > 0 ? (
                        <PapersTable
                          papers={groupPapers}
                          selectedPapers={emptySet}
                          message=""
                          readOnly={true}
                          showSimilarity={false}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          このカテゴリに該当する論文はありません
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Other Papers */}
        {groupedPapers["other"] && groupedPapers["other"].length > 0 && (
          <Collapsible className="group/collapsible">
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer [&[data-state=open]>div>svg]:rotate-90">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" />
                  <div className="flex items-baseline gap-3 text-left">
                    <h3 className="text-lg font-bold text-muted-foreground">
                      その他
                    </h3>
                    <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {groupedPapers["other"].length}
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t">
                  <div className="mt-4">
                    <PapersTable
                      papers={groupedPapers["other"]}
                      selectedPapers={emptySet}
                      message=""
                      readOnly={true}
                      showSimilarity={false}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
