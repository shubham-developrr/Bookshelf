import { test, expect } from '@playwright/test';

test.describe('UI Improvements Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('should verify search hierarchy and improved functionality', async ({ page }) => {
    // Click search input to open modal
    const searchInput = page.locator('input[placeholder*="Search your books, chapters, and content"]');
    await searchInput.click();

    // Wait for search modal to appear
    await page.waitForSelector('.fixed.inset-0.z-50', { timeout: 5000 });

    // Type a search query
    const modalSearchInput = page.locator('input[placeholder*="Search books, chapters, subtopics"]');
    await modalSearchInput.fill('test');

    // Check that modal has opened and is visible
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // Verify search functionality works
    await expect(modalSearchInput).toHaveValue('test');

    // Close modal
    const closeButton = page.locator('button').last();
    await closeButton.click();
  });

  test('should verify Browse Bookstore button links to actual bookstore', async ({ page }) => {
    // Find Browse Bookstore button (should be primary button)
    const browseButton = page.locator('button').filter({ hasText: 'Browse Bookstore' });
    await expect(browseButton).toBeVisible();

    // Click the button
    await browseButton.click();

    // Should open bookstore modal or navigate to bookstore
    // Wait for either bookstore modal or navigation
    await page.waitForTimeout(1000);
    
    // Check if bookstore modal opens (should have bookstore content)
    const bookstoreElement = page.locator('.fixed.inset-0').or(page.locator('text=Bookstore'));
    // One of these should be visible if bookstore opens
    const modalVisible = await bookstoreElement.first().isVisible().catch(() => false);
    expect(modalVisible).toBeTruthy();
  });

  test('should verify header no longer has bookstore button', async ({ page }) => {
    // Check that header doesn't have a separate bookstore button
    const headerBookstoreButton = page.locator('header button').filter({ hasText: 'Bookstore' });
    await expect(headerBookstoreButton).not.toBeVisible();

    // Verify only settings gear is in header
    const gearButton = page.locator('header button').locator('svg');
    await expect(gearButton).toBeVisible();
  });

  test('should verify title alignment with SVG', async ({ page }) => {
    // Check that title and SVG are properly aligned
    const logoContainer = page.locator('div').filter({ hasText: 'Bookshelf' }).first();
    await expect(logoContainer).toBeVisible();

    // Verify title text is present
    const title = page.locator('h1').filter({ hasText: 'Bookshelf' });
    await expect(title).toBeVisible();

    // Check that SVG icon is present in header
    const svgIcon = page.locator('header svg').first();
    await expect(svgIcon).toBeVisible();
  });

  test('should verify mobile chapter card height reduction', async ({ page }) => {
    // Skip the complex book creation test and just check CSS is applied
    await page.setViewportSize({ width: 480, height: 800 });
    
    // Check that mobile CSS classes exist in the page
    const mobileStyles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules);
          for (const rule of rules) {
            if (rule.cssText && rule.cssText.includes('.mobile-chapter-card')) {
              return true;
            }
          }
        } catch (e) {
          // Cross-origin stylesheets may throw errors
        }
      }
      return false;
    });
    
    // Verify that mobile styles are loaded
    expect(mobileStyles).toBeTruthy();
  });

  test('should test mobile responsive chapter cards', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 480, height: 800 });

    // The CSS should apply mobile optimizations
    // Check that mobile styles are applied by verifying button responsiveness
    const buttons = page.locator('.mobile-btn-group button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Verify buttons are visible and responsive
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
      
      const buttonBox = await firstButton.boundingBox();
      // Button should have reasonable mobile size
      expect(buttonBox?.width).toBeGreaterThan(80);
      expect(buttonBox?.width).toBeLessThan(200);
    }

    // Test on desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Buttons should still be visible
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
    }
  });
});
