export type AppMode = 'chat' | 'summary' | 'quiz' | 'related' | 'explain';

export interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  currentPage: number;
  zoom: number;
  lastModified: string;
  fileSize?: string;
  department?: string;
  author?: string;
  fileUrl?: string;
  fileType?: 'PDF' | 'Excel' | 'PPT' | 'Word';
  content: {
    title: string;
    subtitle?: string;
    sections: {
      id: string;
      heading: string;
      pageNumber: number;
      paragraphs: {
        id: string;
        text: string;
        isHighlighted?: boolean;
        highlightText?: string;
      }[];
      table?: {
        headers: string[];
        rows: {
          label: string;
          q3_2023: string;
          q3_2022: string;
          change: string;
          isPositive?: boolean;
          isNegative?: boolean;
        }[];
      };
      chart?: {
        title: string;
        imageUrl?: string;
      };
    }[];
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  timestamp: string;
  text?: string;
  quote?: string;
  type?: 'text' | 'summary' | 'quiz' | 'related';
  summaryData?: {
    title: string;
    description: string;
    takeaways: string[];
    conclusion: string;
    isWorkflow?: boolean;
    mindmap?: {
      root: string;
      branches: {
        title: string;
        subitems: string[];
      }[];
    };
  };
  quizData?: {
    questionNumber: number;
    totalQuestions: number;
    question: string;
    options: string[];
    correctIndex: number;
    selectedIndex?: number;
    isChecked?: boolean;
    explanation?: string;
    pageSource: number;
  };
  relatedDocs?: RelatedDocument[];
  actionChips?: string[];
}

export interface RelatedDocument {
  id: string;
  title: string;
  fileName: string;
  department: string;
  fileType: 'PDF' | 'Excel' | 'PPT' | 'Word' | 'Web' | 'YouTube';
  matchPercentage: number;
  snippet: string;
  url?: string;
}
