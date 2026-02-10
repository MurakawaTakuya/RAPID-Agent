"use client";

import { Button } from "@/components/ui/button";

export interface Paper {
  id: number;
  title: string;
  url: string;
  abstract: string | null;
  conferenceName: string | null;
  conferenceYear: number | null;
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
  const isAllSelected =
    papers.length > 0 && selectedPapers.size === papers.length;

  return (
    <div className="max-w-7xl w-full space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{message}</p>
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
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-1/4">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap w-32">
                  Conference
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Abstract
                </th>
                <th className="px-1 py-3 text-center text-sm font-medium text-muted-foreground w-12">
                  Link
                </th>
                <th className="pl-1 pr-4 py-3 text-center text-sm font-medium text-muted-foreground w-14">
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
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPapers.has(paper.id)}
                      onChange={() => onTogglePaperSelection(paper.id)}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-sm text-card-foreground line-clamp-4">
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
                      <div className="text-sm text-muted-foreground line-clamp-4">
                        {paper.abstract}
                      </div>
                    )}
                  </td>
                  <td className="px-1 py-4 text-center">
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
                  <td className="pl-1 pr-4 py-4 text-center">
                    <button
                      onClick={() => onDeletePaper(paper.id)}
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
  );
}
