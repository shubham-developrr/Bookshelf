import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EnhancedReaderPage from './EnhancedReaderPage';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { Highlight } from '../types/types';
import { vi } from 'vitest';

// Mock the dependencies
vi.mock('../services/githubModelsService', () => ({
  generateAIGuruResponse: vi.fn(),
}));
vi.mock('../services/TabPersistenceManager', () => ({
  tabPersistenceManager: {
    initialize: vi.fn(),
    getChapterTabs: vi.fn(),
    saveChapterTabs: vi.fn(),
  },
}));

const mockOpenAIGuru = vi.fn();

const renderComponent = (highlights: Highlight[], addHighlight: vi.Mock, removeHighlight: vi.Mock, setHighlights: vi.Mock) => {
  render(
    <ThemeProvider>
      <UserProvider>
        <MemoryRouter initialEntries={['/subject/Test%20Book/Test%20Chapter']}>
          <Routes>
            <Route
              path="/subject/:subjectName/:chapterName"
              element={
                <EnhancedReaderPage
                  openAIGuru={mockOpenAIGuru}
                  highlights={highlights}
                  addHighlight={addHighlight}
                  removeHighlight={removeHighlight}
                  setHighlights={setHighlights}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </UserProvider>
    </ThemeProvider>
  );
};

describe('Highlight Persistence', () => {
  let highlights: Highlight[] = [];
  const addHighlight = vi.fn((highlight: Omit<Highlight, 'id' | 'timestamp'>) => {
    highlights.push({ ...highlight, id: `id_${highlights.length}`, timestamp: Date.now() });
  });
  const removeHighlight = vi.fn((id: string) => {
    highlights = highlights.filter(h => h.id !== id);
  });
  const setHighlights = vi.fn((newHighlights: Highlight[]) => {
    highlights = newHighlights;
  });


  beforeEach(() => {
    highlights = [];
    addHighlight.mockClear();
    removeHighlight.mockClear();
    setHighlights.mockClear();
    localStorage.clear();
  });

  test('should save highlights to localStorage', async () => {
    renderComponent(highlights, addHighlight, removeHighlight, setHighlights);

    // Simulate adding a highlight
    const newHighlight = {
      text: 'This is a test highlight.',
      color: 'yellow',
      chapterId: 'Test Book',
    };
    addHighlight(newHighlight);

    // Re-render the component to trigger the useEffect that saves to localStorage
    renderComponent(highlights, addHighlight, removeHighlight, setHighlights);

    await waitFor(() => {
      const savedHighlights = localStorage.getItem('highlights_Test Book_Test Chapter');
      expect(savedHighlights).not.toBeNull();
      const parsedHighlights = JSON.parse(savedHighlights!);
      expect(parsedHighlights).toHaveLength(1);
      expect(parsedHighlights[0].text).toBe(newHighlight.text);
    });
  });

  test('should load highlights from localStorage on mount', async () => {
    const initialHighlights = [
      {
        id: '1',
        text: 'Initial highlight',
        color: 'blue',
        chapterId: 'Test Book',
        timestamp: Date.now(),
      },
    ];
    localStorage.setItem('highlights_Test Book_Test Chapter', JSON.stringify(initialHighlights));

    renderComponent([], addHighlight, removeHighlight, setHighlights);

    await waitFor(() => {
      expect(setHighlights).toHaveBeenCalledTimes(1);
      expect(setHighlights).toHaveBeenCalledWith(initialHighlights);
    });
  });
});
