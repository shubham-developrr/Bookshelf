import { test, expect } from '@playwright/test';

test.describe('Search Modal Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    // Wait for page to load by checking for the main title
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('should open search modal and show proper interface', async ({ page }) => {
    // Click search input to open modal
    const searchInput = page.locator('input[placeholder*="Search your books, chapters, and content"]');
    await searchInput.click();

    // Wait for search modal to appear
    await page.waitForSelector('.fixed.inset-0.z-50', { timeout: 5000 });

    // Verify modal is open
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // Check for search input inside modal
    const modalSearchInput = page.locator('input[placeholder*="Search books, chapters, subtopics"]');
    await expect(modalSearchInput).toBeVisible();

    // Verify search input is smaller than before (no large SVG)
    const searchInputSize = await modalSearchInput.boundingBox();
    expect(searchInputSize?.height).toBeLessThan(100); // Should be reasonable size

    // Check that modal content shows the search icon emoji when no content
    const searchIcon = page.locator('text=🔍');
    await expect(searchIcon).toBeVisible();
  });

  test('should handle search input properly', async ({ page }) => {
    // Open search modal
    const searchInput = page.locator('input[placeholder*="Search your books, chapters, and content"]');
    await searchInput.click();
    await page.waitForSelector('.fixed.inset-0.z-50');

    // Type in search input
    const modalSearchInput = page.locator('input[placeholder*="Search books, chapters, subtopics"]');
    await modalSearchInput.fill('test search');

    // Verify search input value
    await expect(modalSearchInput).toHaveValue('test search');

    // Check that results area updates (should show the search query or no results)
    await page.waitForTimeout(500); // Wait a moment for UI to update
    const searchQuery = await modalSearchInput.inputValue();
    expect(searchQuery).toBe('test search');
  });

  test('should show no results message for empty search', async ({ page }) => {
    // Open search modal
    const searchInput = page.locator('input[placeholder*="Search your books, chapters, and content"]');
    await searchInput.click();
    await page.waitForSelector('.fixed.inset-0.z-50');

    // Type something that won't match
    const modalSearchInput = page.locator('input[placeholder*="Search books, chapters, subtopics"]');
    await modalSearchInput.fill('nonexistent content');

    // Should show no results found
    const noResults = page.locator('text=No results found');
    await expect(noResults).toBeVisible();
  });

  test('should close modal when close button is clicked', async ({ page }) => {
    // Open search modal
    const searchInput = page.locator('input[placeholder*="Search your books, chapters, and content"]');
    await searchInput.click();
    await page.waitForSelector('.fixed.inset-0.z-50');

    // Click close button
    const closeButton = page.locator('button').last(); // Close button should be last button in header
    await closeButton.click();

    // Modal should be gone
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).not.toBeVisible();
  });

  test('should verify bookshelf title is correct', async ({ page }) => {
    // Check that main title is "Bookshelf" not "Book Creator"
    const title = page.locator('h1').filter({ hasText: 'Bookshelf' });
    await expect(title).toBeVisible();

    // Verify Browse Bookstore button text is restored
    const browseButton = page.locator('button').filter({ hasText: 'Browse Bookstore' });
    await expect(browseButton).toBeVisible();
  });

  test('should verify creator section has emoji', async ({ page }) => {
    // Check that Creator Section has ✨ emoji
    const creatorSection = page.locator('text=✨ Creator Section');
    await expect(creatorSection).toBeVisible();
  });

  test('should test responsive button behavior', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 480, height: 800 });

    // Verify buttons are properly sized
    const buttonGroup = page.locator('.mobile-btn-group').first();
    await expect(buttonGroup).toBeVisible();

    // Test on desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Buttons should still be visible and properly sized
    await expect(buttonGroup).toBeVisible();
  });
});
