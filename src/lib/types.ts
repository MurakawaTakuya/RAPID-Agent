export interface Paper {
  id: number;
  title: string;
  url: string;
  abstract: string | null;
  conferenceName: string | null;
  conferenceYear: number | null;
  cosineSimilarity: number | null;
}

export type CategorizedPaper = Paper & {
  categories: string[];
};

export interface Category {
  title: string;
  content: string;
}

export interface CategorizationInfo {
  title: string;
  categories: Category[];
}
