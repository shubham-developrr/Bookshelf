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

export interface Subject {
  id: string;
  title: string;
  description: string;
  units: Unit[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // Markdown content
  media: MediaAsset[];
  subtopics?: Subtopic[];
}

export interface Subtopic {
  id: string;
  title: string;
  content: string;
  media: MediaAsset[];
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'pdf' | 'audio';
  src: string;
  title?: string;
  alt?: string;
  caption?: string;
}

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
