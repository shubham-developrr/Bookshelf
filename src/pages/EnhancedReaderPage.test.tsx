import { describe, it, expect } from 'vitest';
import { getTabDisplayName } from '../utils/getTabDisplayName';

describe('getTabDisplayName', () => {
  it('should return the custom name if it exists', () => {
    const customNames = { 'custom_1': 'My Custom Tab' };
    expect(getTabDisplayName('custom_1', customNames)).toBe('My Custom Tab');
  });

  it('should return the display name for a standard tab', () => {
    expect(getTabDisplayName('read', {})).toBe('Read');
    expect(getTabDisplayName('mcq', {})).toBe('MCQ');
  });

  it('should return the original name if no display name is found', () => {
    expect(getTabDisplayName('unknown_tab', {})).toBe('unknown_tab');
  });

  // This is the failing test case
  it('should correctly format numbered template tabs', () => {
    expect(getTabDisplayName('FLASHCARD_2', {})).toBe('Flash Cards 2');
  });
});
