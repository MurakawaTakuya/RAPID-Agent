"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface Paper {
  id: number;
  title: string;
  url: string;
  abstract: string | null;
  conferenceName: string | null;
  conferenceYear: number | null;
  cosineSimilarity: number | null;
}

interface PapersTableProps {
  papers: Paper[];
  selectedPapers: Set<number>;
  message: string;
  onToggleSelectAll: () => void;
  onTogglePaperSelection: (paperId: number) => void;
  onDeletePaper: (paperId: number) => void;
  onDeleteSelected: () => void;
}

export function PapersTable({
  papers,
  selectedPapers,
  message,
  onToggleSelectAll,
  onTogglePaperSelection,
  onDeletePaper,
  onDeleteSelected,
}: PapersTableProps) {
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<number>>(
    new Set()
  );

  const toggleAbstract = (id: number) => {
    setExpandedAbstracts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected =
    papers.length > 0 && selectedPapers.size === papers.length;

  return (
    <div className="max-w-7xl w-full space-y-3">
      <div className="flex items-center justify-between">
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        {selectedPapers.size > 0 && (
          <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
            選択した{selectedPapers.size}件を削除
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="w-12 px-4 py-3 align-middle">
                  <div className="flex items-center justify-center h-full">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-md font-medium text-muted-foreground w-1/4">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-md font-medium text-muted-foreground whitespace-nowrap w-32">
                  Conference
                </th>
                <th className="px-4 py-3 text-left text-md font-medium text-muted-foreground">
                  Abstract
                </th>
                <th className="px-4 py-3 text-center text-md font-medium text-muted-foreground w-20">
                  Similarity
                </th>
                <th className="pl-1 pr-4 py-3 text-center text-md font-medium text-muted-foreground w-14">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {papers.map((paper) => (
                <tr
                  key={paper.id}
                  className={`hover:bg-accent/50 transition-colors ${
                    selectedPapers.has(paper.id) ? "bg-accent/30" : ""
                  }`}
                >
                  <td className="px-4 py-4 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedPapers.has(paper.id)}
                      onChange={() => onTogglePaperSelection(paper.id)}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <a
                      href={paper.url.startsWith("http") ? paper.url : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "underline" }}
                      className="font-medium text-sm text-primary line-clamp-4 hover:opacity-80 transition-opacity"
                    >
                      {paper.title}
                    </a>
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
                      <div
                        onClick={() => toggleAbstract(paper.id)}
                        className={`text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors ${
                          expandedAbstracts.has(paper.id) ? "" : "line-clamp-4"
                        }`}
                        title={
                          expandedAbstracts.has(paper.id)
                            ? "クリックして折りたたむ"
                            : "クリックして全文を表示"
                        }
                      >
                        {paper.abstract}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {paper.cosineSimilarity !== null &&
                      paper.cosineSimilarity !== undefined && (
                        <span className="text-sm text-muted-foreground">
                          {paper.cosineSimilarity.toFixed(3)}
                        </span>
                      )}
                  </td>
                  <td className="pl-1 pr-4 py-4 text-center">
                    <button
                      onClick={() => onDeletePaper(paper.id)}
                      className="inline-flex items-center justify-center p-2 hover:bg-destructive/10 rounded-md transition-colors group"
                      title="削除"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
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
  );
}
