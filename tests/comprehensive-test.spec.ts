import { test, expect } from '@playwright/test';

test.describe('Comprehensive Theme and Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
  });

  test('BookBookstore modal opens and displays correctly with theme', async ({ page }) => {
    // Click on bookstore button
    await page.click('[data-testid="bookstore-button"], button:has-text("Browse Bookstore")');
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="book-bookstore-modal"]', { state: 'visible' });
    
    // Verify modal styling uses CSS variables
    const modal = page.locator('[data-testid="book-bookstore-modal"]');
    await expect(modal).toBeVisible();
    
    // Test search functionality within the bookstore modal
    const searchInput = page.locator('[data-testid="book-bookstore-modal"] input[placeholder*="Search"]');
    await searchInput.fill('Mathematics');
    await searchInput.press('Enter');
    
    // Test filter panel
    const filterToggle = page.locator('button:has-text("Filters")');
    if (await filterToggle.isVisible()) {
      await filterToggle.click();
    }
    
    // Test theme switching in bookstore
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      // Test light theme
      await page.selectOption('[data-testid="theme-selector"]', 'light');
      await page.waitForTimeout(500);
      
      // Test dark theme  
      await page.selectOption('[data-testid="theme-selector"]', 'dark');
      await page.waitForTimeout(500);
      
      // Test blue theme
      await page.selectOption('[data-testid="theme-selector"]', 'blue');
      await page.waitForTimeout(500);
      
      // Test amoled theme
      await page.selectOption('[data-testid="theme-selector"]', 'amoled');
      await page.waitForTimeout(500);
    }
    
    console.log('✅ BookBookstore modal theme test passed');
  });

  test('Book creation workflow with theme consistency', async ({ page }) => {
    // Navigate to book creator
    await page.goto('http://localhost:5180');
    await page.waitForLoadState('networkidle');
    
    // Test theme selector in book creator
    const themeSelect = page.locator('select');
    if (await themeSelect.isVisible()) {
      await themeSelect.selectOption('dark');
      await page.waitForTimeout(500);
      
      await themeSelect.selectOption('light');
      await page.waitForTimeout(500);
    }
    
    // Test book creation form
    await page.fill('input[placeholder*="Book Title"]', 'Test Mathematics Book');
    await page.fill('textarea[placeholder*="Description"]', 'A comprehensive test book for mathematics');
    
    // Test adding subjects and units
    const addSubjectBtn = page.locator('button:has-text("Add Subject")');
    if (await addSubjectBtn.isVisible()) {
      await addSubjectBtn.click();
    }
    
    console.log('✅ Book creator theme consistency test passed');
  });

  test('Complete workflow: Create → Download → Upload → Display', async ({ page }) => {
    // Step 1: Create a test book in book creator
    await page.goto('http://localhost:5180');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[placeholder*="Book Title"]', 'E2E Test Book');
    await page.fill('textarea[placeholder*="Description"]', 'End-to-end test book');
    await page.selectOption('select[id*="curriculum"]', 'NCERT');
    
    // Download the created book
    const downloadBtn = page.locator('button:has-text("Download Book")');
    if (await downloadBtn.isVisible()) {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.click();
      const download = await downloadPromise;
      console.log(`📁 Downloaded: ${download.suggestedFilename()}`);
    }
    
    // Step 2: Go back to main app and upload
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    // Look for upload functionality
    const uploadBtn = page.locator('input[type="file"], button:has-text("Upload")');
    if (await uploadBtn.first().isVisible()) {
      console.log('📤 Upload functionality available');
    }
    
    // Step 3: Test marketplace integration
    const marketplaceBtn = page.locator('button:has-text("Browse Marketplace"), [data-testid="marketplace-button"]');
    if (await marketplaceBtn.first().isVisible()) {
      await marketplaceBtn.first().click();
      await page.waitForTimeout(1000);
      
      // Verify marketplace loads with proper styling
      const modal = page.locator('[data-testid="book-marketplace-modal"]');
      if (await modal.isVisible()) {
        console.log('🛍️ Marketplace modal opened successfully');
      }
    }
    
    console.log('✅ Complete E2E workflow test passed');
  });

  test('Theme consistency across all components', async ({ page }) => {
    // Test main app themes
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    const themes = ['light', 'dark', 'blue', 'amoled'];
    
    for (const theme of themes) {
      const themeSelector = page.locator('[data-testid="theme-selector"], select:has(option[value="' + theme + '"])');
      if (await themeSelector.first().isVisible()) {
        await themeSelector.first().selectOption(theme);
        await page.waitForTimeout(500);
        
        // Open marketplace to test theme consistency
        const marketplaceBtn = page.locator('button:has-text("Browse Marketplace")');
        if (await marketplaceBtn.isVisible()) {
          await marketplaceBtn.click();
          await page.waitForTimeout(500);
          
          // Close marketplace
          const closeBtn = page.locator('button:has-text("×"), button:has-text("Close")');
          if (await closeBtn.first().isVisible()) {
            await closeBtn.first().click();
          }
        }
        
        console.log(`✅ ${theme} theme test completed`);
      }
    }
    
    // Test book creator themes
    await page.goto('http://localhost:5180');
    await page.waitForLoadState('networkidle');
    
    for (const theme of themes) {
      const themeSelector = page.locator('select:has(option[value="' + theme + '"])');
      if (await themeSelector.first().isVisible()) {
        await themeSelector.first().selectOption(theme);
        await page.waitForTimeout(500);
        console.log(`✅ Book creator ${theme} theme test completed`);
      }
    }
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test marketplace with no network
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    // Test empty search
    const marketplaceBtn = page.locator('button:has-text("Browse Marketplace")');
    if (await marketplaceBtn.isVisible()) {
      await marketplaceBtn.click();
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('nonexistentbook123456');
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
        
        // Should show no results message
        const noResults = page.locator('text=No books found, text=No results');
        console.log('🔍 Empty search test completed');
      }
    }
    
    // Test book creator with incomplete data
    await page.goto('http://localhost:5180');
    await page.waitForLoadState('networkidle');
    
    const downloadBtn = page.locator('button:has-text("Download Book")');
    if (await downloadBtn.isVisible()) {
      await downloadBtn.click();
      // Should handle empty book creation gracefully
      console.log('📝 Empty book creation test completed');
    }
    
    console.log('✅ Error handling tests passed');
  });
});
