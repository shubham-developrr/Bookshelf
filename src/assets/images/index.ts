// Image mapping for easy access (empty since default books are removed)
export const bookImages = {};

// Function to get book image by title
export const getBookImage = (title: string): string => {
  // Return a placeholder image or data URL for books without images
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="200" height="280">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="280" fill="url(#grad1)" rx="8" ry="8"/>
      <rect x="20" y="20" width="160" height="240" fill="rgba(255,255,255,0.1)" rx="4" ry="4"/>
      <circle cx="100" cy="120" r="30" fill="rgba(255,255,255,0.3)"/>
      <path d="M85 110 L85 130 L115 130 L115 110 Z M88 113 L88 127 L112 127 L112 113 Z" fill="white"/>
      <text x="100" y="180" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${title.length > 20 ? title.substring(0, 17) + '...' : title}</text>
      <text x="100" y="200" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">Study Book</text>
    </svg>
  `)}`
};

// Export available images
export { default as searchIcon } from './search.png';
export { default as aiGuruIcon } from './ai-guru.png';
