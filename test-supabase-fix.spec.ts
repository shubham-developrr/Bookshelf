import { test, expect } from '@playwright/test';

test.describe('Supabase Tab Persistence Fix', () => {
  test('should save and persist tabs without constraint violations', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5174');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Interactive Study Bookshelf")', { timeout: 10000 });
    
    // Look for any existing book or create a test scenario
    const hasBooks = await page.locator('.book-card, [data-testid="book-card"]').count() > 0;
    
    if (!hasBooks) {
      // Create a new book for testing
      const createButton = page.locator('button:has-text("Create New Book"), [data-testid="create-book"]').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        
        // Fill in book details
        await page.fill('input[placeholder*="title"], input[name="title"]', 'Test Book for Supabase Fix');
        await page.fill('input[placeholder*="author"], input[name="author"]', 'Test Author');
        await page.fill('textarea[placeholder*="description"], textarea[name="description"]', 'Testing Supabase constraint fix');
        
        // Save the book
        await page.click('button:has-text("Create"), button:has-text("Save")');
        await page.waitForTimeout(1000);
      }
    }
    
    // Click on a book to enter it
    const bookCard = page.locator('.book-card, [data-testid="book-card"]').first();
    await bookCard.click();
    
    // Wait for subject page or chapter creation
    await page.waitForTimeout(2000);
    
    // Check if we need to create a subject/chapter
    const hasSubjects = await page.locator('.subject-card, [data-testid="subject-card"], .chapter-item').count() > 0;
    
    if (!hasSubjects) {
      // Create a subject/chapter
      const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), button[class*="add"], [data-testid="add-subject"]').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Fill in details
        await page.fill('input[placeholder*="name"], input[placeholder*="title"]', 'Test Chapter');
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Create")').first();
        await saveButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Navigate to a chapter
    const chapterItem = page.locator('.subject-card, .chapter-item, [data-testid="chapter"]').first();
    await chapterItem.click();
    await page.waitForTimeout(3000);
    
    // Check for reader page with tabs
    await page.waitForSelector('[data-testid="content-tabs"], .content-tabs, .tab-container', { timeout: 10000 });
    
    // Monitor browser console for Supabase errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('duplicate key') ||
        msg.text().includes('409') ||
        msg.text().includes('constraint') ||
        msg.text().includes('supabase')
      )) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Test adding multiple tabs to trigger potential constraint violations
    for (let i = 0; i < 3; i++) {
      try {
        // Look for add tab button
        const addTabButton = page.locator('button:has-text("Add Tab"), button[data-testid="add-tab"], button[class*="add-tab"]').first();
        if (await addTabButton.isVisible()) {
          await addTabButton.click();
          await page.waitForTimeout(1000);
          
          // Select tab type (MCQ, Notes, etc.)
          const tabOptions = page.locator('button:has-text("MCQ"), button:has-text("Notes"), button:has-text("Q&A")');
          if (await tabOptions.count() > 0) {
            await tabOptions.nth(i % 3).click();
            await page.waitForTimeout(2000);
          }
        }
      } catch (error) {
        console.log(`Tab ${i + 1} creation attempt failed:`, error);
      }
    }
    
    // Wait for any backend operations to complete
    await page.waitForTimeout(5000);
    
    // Check that no Supabase constraint violations occurred
    expect(consoleErrors.length).toBe(0);
    
    if (consoleErrors.length > 0) {
      console.log('Detected Supabase errors:', consoleErrors);
    }
    
    // Verify tabs were created and persisted
    const tabs = page.locator('[data-testid="content-tab"], .tab-button, .content-tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
    
    // Test tab switching to ensure persistence
    if (tabCount > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      
      // Refresh page to test persistence
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Check that tabs are still there after reload
      const persistedTabs = page.locator('[data-testid="content-tab"], .tab-button, .content-tab');
      const persistedTabCount = await persistedTabs.count();
      expect(persistedTabCount).toBeGreaterThan(0);
    }
    
    console.log('✅ Supabase tab persistence test completed successfully');
  });
  
  test('should handle multiple rapid tab operations without errors', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForTimeout(2000);
    
    // Navigate to any available chapter
    const bookCard = page.locator('.book-card, [data-testid="book-card"]').first();
    if (await bookCard.isVisible()) {
      await bookCard.click();
      await page.waitForTimeout(1000);
      
      const chapterItem = page.locator('.subject-card, .chapter-item, [data-testid="chapter"]').first();
      if (await chapterItem.isVisible()) {
        await chapterItem.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Monitor for errors during rapid operations
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() === 409 && response.url().includes('supabase')) {
        networkErrors.push(`409 Conflict: ${response.url()}`);
      }
    });
    
    // Perform rapid tab operations
    const addTabButton = page.locator('button:has-text("Add Tab"), button[data-testid="add-tab"]').first();
    if (await addTabButton.isVisible()) {
      // Rapidly click multiple times
      for (let i = 0; i < 5; i++) {
        await addTabButton.click();
        await page.waitForTimeout(100); // Very short delay to simulate rapid clicking
      }
    }
    
    await page.waitForTimeout(3000);
    
    // Verify no 409 conflicts occurred
    expect(networkErrors.length).toBe(0);
    
    if (networkErrors.length > 0) {
      console.log('Detected network errors:', networkErrors);
    }
    
    console.log('✅ Rapid operations test completed without constraint violations');
  });
});
