/**
 * @enum ScreenID
 * @description Defines the different screens in the application.
 */
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

/**
 * @type Highlight
 * @description Represents a highlighted text segment.
 * @property {string} id - The unique identifier for the highlight.
 * @property {string} text - The highlighted text.
 * @property {string} color - The color of the highlight.
 * @property {string} chapterId - The ID of the chapter where the highlight is located.
 * @property {Date} [timestamp] - The date and time when the highlight was created.
 */
export type Highlight = {
  id:string;
  text: string;
  color: string;
  chapterId: string;
  timestamp?: Date;
};

/**
 * @type SearchResult
 * @description Represents a single search result.
 * @property {'book' | 'chapter' | 'subtopic' | 'subject'} type - The type of the search result.
 * @property {string} title - The title of the search result.
 * @property {string} [subtitle] - The subtitle of the search result.
 * @property {string} [book] - The book associated with the search result.
 * @property {string} [chapter] - The chapter associated with the search result.
 * @property {string} [subject] - The subject associated with the search result.
 * @property {'subjects' | 'chapters' | 'subtopics'} [category] - The category of the search result.
 */
export type SearchResult = {
  type: 'book' | 'chapter' | 'subtopic' | 'subject';
  title: string;
  subtitle?: string;
  book?: string;
  chapter?: string;
  subject?: string;
  category?: 'subjects' | 'chapters' | 'subtopics';
};
