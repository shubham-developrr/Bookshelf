import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookManager, BookMetadata } from './BookManager';

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

describe('BookManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should generate a book ID', () => {
    expect(BookManager.generateBookId()).toBe('test-uuid');
  });

  it('should generate an initial version', () => {
    expect(BookManager.generateInitialVersion()).toBe('1.0.0');
  });

  it('should increment the version number', () => {
    expect(BookManager.incrementVersion('1.0.0', 'major')).toBe('2.0.0');
    expect(BookManager.incrementVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(BookManager.incrementVersion('1.2.3', 'patch')).toBe('1.2.4');
  });

  it('should compare version numbers', () => {
    expect(BookManager.compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(BookManager.compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(BookManager.compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(BookManager.compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(BookManager.compareVersions('1.9.9', '2.0.0')).toBe(-1);
  });

  it('should create a book with correct metadata', () => {
    const bookData = {
      name: 'Test Book',
      creatorName: 'Test Creator',
      university: 'Test University',
      semester: 'Test Semester',
      subjectCode: 'TEST101',
    };

    const book = BookManager.createBook(bookData);

    expect(book.id).toBe('test-uuid');
    expect(book.name).toBe('Test Book');
    expect(book.version).toBe('1.0.0');
    expect(book.isPublished).toBe(false);
  });

  it('should save and retrieve a book', () => {
    const bookData = {
      name: 'Test Book',
      creatorName: 'Test Creator',
      university: 'Test University',
      semester: 'Test Semester',
      subjectCode: 'TEST101',
    };

    const book = BookManager.createBook(bookData);
    const retrievedBook = BookManager.getBookById(book.id);

    expect(retrievedBook).toEqual(book);
  });

  it('should update a book', () => {
    const bookData = {
      name: 'Test Book',
      creatorName: 'Test Creator',
      university: 'Test University',
      semester: 'Test Semester',
      subjectCode: 'TEST101',
    };

    const book = BookManager.createBook(bookData);
    const updates = { name: 'Updated Test Book' };
    BookManager.updateBook(book.id, updates);
    const retrievedBook = BookManager.getBookById(book.id);

    expect(retrievedBook?.name).toBe('Updated Test Book');
  });

  it('should delete a book', () => {
    const bookData = {
      name: 'Test Book',
      creatorName: 'Test Creator',
      university: 'Test University',
      semester: 'Test Semester',
      subjectCode: 'TEST101',
    };

    const book = BookManager.createBook(bookData);
    BookManager.deleteBook(book.id);
    const retrievedBook = BookManager.getBookById(book.id);

    expect(retrievedBook).toBeNull();
  });

  it('should migrate legacy books', () => {
    const legacyBook = {
      id: 'created-123',
      name: 'Legacy Book',
      creatorName: 'Legacy Creator',
      university: 'Legacy University',
      semester: 'Legacy Semester',
      subjectCode: 'LEGACY101',
    };

    localStorage.setItem('createdBooks', JSON.stringify([legacyBook]));
    localStorage.setItem('booksMigrated', 'false');

    const migratedCount = BookManager.migrateLegacyBooks();
    const books = BookManager.getAllBooks();

    expect(migratedCount).toBe(1);
    expect(books[0].id).toBe('test-uuid');
    expect(books[0].version).toBe('1.0.0');
  });

  it('should export a book for the marketplace', async () => {
    const bookData = {
      name: 'Test Book',
      creatorName: 'Test Creator',
      university: 'Test University',
      semester: 'Test Semester',
      subjectCode: 'TEST101',
    };

    const book = BookManager.createBook(bookData);
    localStorage.setItem(`chapters_${book.id}`, JSON.stringify([{ id: 'chapter-1', title: 'Chapter 1' }]));

    const result = await BookManager.exportBookForMarketplace(book.id);

    expect(result.success).toBe(true);
    expect(result.exportData.metadata).toEqual(book);
    expect(result.exportData.chapters).toEqual([{ id: 'chapter-1', title: 'Chapter 1' }]);
  });
});
