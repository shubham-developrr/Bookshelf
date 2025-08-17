export enum ScreenID {
  SplashScreen,
  Bookshelf,
  ChapterList,
  Reader,
  PracticeMenu,
  PracticeQuestions,
  HighlightsAndNotes,
  Search,
}

export type Highlight = {
  id: string;
  text: string;
  color: string;
  chapterId: string;
  timestamp?: Date;
};

export type SearchResult = {
  type: 'book' | 'chapter' | 'subtopic' | 'subject';
  title: string;
  subtitle?: string;
  book?: string;
  chapter?: string;
  subject?: string;
  category?: 'subjects' | 'chapters' | 'subtopics';
};
