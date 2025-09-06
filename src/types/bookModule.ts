/**
 * @interface BookModule
 * @description Represents a complete book module, including its content, structure, and metadata.
 * @property {string} id - The unique identifier for the book module.
 * @property {string} title - The title of the book.
 * @property {string} author - The author of the book.
 * @property {string} version - The version of the book module.
 * @property {string} curriculum - The curriculum the book belongs to.
 * @property {string} description - A brief description of the book.
 * @property {Subject[]} subjects - An array of subjects in the book.
 * @property {CustomTheme} [theme] - An optional custom theme for the book.
 * @property {BookMetadata} metadata - Metadata about the book.
 */
export interface BookModule {
  id: string;
  title: string;
  author: string;
  version: string;
  curriculum: string;
  description: string;
  subjects: Subject[];
  theme?: CustomTheme;
  metadata: BookMetadata;
}

/**
 * @interface Subject
 * @description Represents a subject within a book module.
 * @property {string} id - The unique identifier for the subject.
 * @property {string} title - The title of the subject.
 * @property {string} description - A brief description of the subject.
 * @property {Unit[]} units - An array of units in the subject.
 */
export interface Subject {
  id: string;
  title: string;
  description: string;
  units: Unit[];
}

/**
 * @interface Unit
 * @description Represents a unit within a subject.
 * @property {string} id - The unique identifier for the unit.
 * @property {string} title - The title of the unit.
 * @property {string} description - A brief description of the unit.
 * @property {Chapter[]} chapters - An array of chapters in the unit.
 */
export interface Unit {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
}

/**
 * @interface Chapter
 * @description Represents a chapter within a unit.
 * @property {string} id - The unique identifier for the chapter.
 * @property {string} title - The title of the chapter.
 * @property {string} content - The content of the chapter in Markdown format.
 * @property {MediaAsset[]} media - An array of media assets for the chapter.
 * @property {Subtopic[]} [subtopics] - An optional array of subtopics in the chapter.
 */
export interface Chapter {
  id: string;
  title: string;
  content: string; // Markdown content
  media: MediaAsset[];
  subtopics?: Subtopic[];
}

/**
 * @interface Subtopic
 * @description Represents a subtopic within a chapter.
 * @property {string} id - The unique identifier for the subtopic.
 * @property {string} title - The title of the subtopic.
 * @property {string} content - The content of the subtopic in Markdown format.
 * @property {MediaAsset[]} media - An array of media assets for the subtopic.
 */
export interface Subtopic {
  id: string;
  title: string;
  content: string;
  media: MediaAsset[];
}

/**
 * @interface MediaAsset
 * @description Represents a media asset, such as an image or video.
 * @property {string} id - The unique identifier for the media asset.
 * @property {'image' | 'video' | 'pdf' | 'audio'} type - The type of the media asset.
 * @property {string} src - The source URL or path of the media asset.
 * @property {string} [title] - An optional title for the media asset.
 * @property {string} [alt] - Optional alt text for the media asset (for images).
 * @property {string} [caption] - An optional caption for the media asset.
 */
export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'pdf' | 'audio';
  src: string;
  title?: string;
  alt?: string;
  caption?: string;
}

/**
 * @interface CustomTheme
 * @description Defines a custom theme for a book module.
 * @property {object} colors - An object containing color definitions for the theme.
 * @property {object} fonts - An object containing font definitions for the theme.
 * @property {object} layout - An object containing layout definitions for the theme.
 */
export interface CustomTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    code: string;
  };
  layout: {
    borderRadius: string;
    spacing: string;
  };
}

/**
 * @interface BookMetadata
 * @description Represents metadata for a book module.
 * @property {string} created - The creation date of the book module.
 * @property {string} updated - The last update date of the book module.
 * @property {string[]} tags - An array of tags for the book.
 * @property {'beginner' | 'intermediate' | 'advanced'} difficulty - The difficulty level of the book.
 * @property {string} language - The language of the book.
 * @property {number} estimatedHours - Estimated hours to complete the book.
 * @property {number} [rating] - An optional rating of the book.
 * @property {number} [downloads] - An optional number of downloads.
 */
export interface BookMetadata {
  created: string;
  updated: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  estimatedHours: number;
  rating?: number;
  downloads?: number;
}
