import { test, expect } from '@playwright/test';

test.describe('Template System & Enhanced Features', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:5175');
        
        // Wait for the app to load
        await expect(page.locator('h1')).toContainText('Interactive Study Bookshelf');
        
        // Navigate to a chapter
        await page.click('text=Mathematics');
        await page.waitForTimeout(1000);
        await page.click('text=Algebra');
        await page.waitForTimeout(2000);
    });

    test('should display default tabs (Read and Highlights)', async ({ page }) => {
        // Check that default tabs are visible
        await expect(page.locator('text=Read')).toBeVisible();
        await expect(page.locator('text=Highlights')).toBeVisible();
        
        // Check that Read tab is active by default
        const readTab = page.locator('button:has-text("Read")');
        await expect(readTab).toHaveClass(/theme-accent/);
    });

    test('should show template selector when clicking Add Template', async ({ page }) => {
        // Click Add Template button
        await page.click('text=Add Template');
        
        // Check that template dropdown is visible
        await expect(page.locator('text=Choose Template:')).toBeVisible();
        
        // Check that all template options are available
        await expect(page.locator('text=Flash card')).toBeVisible();
        await expect(page.locator('text=MCQ')).toBeVisible();
        await expect(page.locator('text=Q&A')).toBeVisible();
        await expect(page.locator('text=Video')).toBeVisible();
        await expect(page.locator('text=PYQ')).toBeVisible();
        await expect(page.locator('text=Mind Map')).toBeVisible();
    });

    test('should add Flash Cards template', async ({ page }) => {
        // Add Flash Cards template
        await page.click('text=Add Template');
        await page.click('text=Flash card');
        
        // Check that Flash Cards tab is now visible and active
        await expect(page.locator('text=Flash Cards')).toBeVisible();
        const flashCardTab = page.locator('button:has-text("Flash Cards")');
        await expect(flashCardTab).toHaveClass(/theme-accent/);
        
        // Check that Flash Cards content is displayed
        await expect(page.locator('h2:has-text("Flash Cards")')).toBeVisible();
    });

    test('should add Videos template and test playlist functionality', async ({ page }) => {
        // Add Videos template
        await page.click('text=Add Template');
        await page.click('text=Video');
        
        // Check that Videos tab is visible and active
        await expect(page.locator('text=Videos')).toBeVisible();
        const videoTab = page.locator('button:has-text("Videos")');
        await expect(videoTab).toHaveClass(/theme-accent/);
        
        // Check that Videos content is displayed
        await expect(page.locator('h2:has-text("Video Library")')).toBeVisible();
        
        // Test adding a video
        await page.click('text=Add Video');
        await expect(page.locator('text=Add Video')).toBeVisible();
        
        // Add a sample YouTube video
        await page.fill('input[placeholder*="YouTube URL"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        await page.selectOption('select', 'lectures');
        await page.click('text=Add Video');
        
        // Wait for the video to be added and check if it appears
        await page.waitForTimeout(2000);
        await expect(page.locator('text=Back to Videos')).toBeVisible();
        await page.click('text=Back to Videos');
        
        // Test playlist URL
        await page.click('text=Add Video');
        await page.fill('input[placeholder*="YouTube URL"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy5gGNhWxWKL8eXGn7WXZWv');
        await page.click('text=Add Video');
        await page.waitForTimeout(2000);
    });

    test('should add Notes tab functionality', async ({ page }) => {
        // Check Notes tab
        await page.click('text=Notes');
        await expect(page.locator('text=Notes')).toBeVisible();
        
        // Check Notes content
        await expect(page.locator('h2:has-text("Notes Manager")')).toBeVisible();
        
        // Test adding a note
        await page.fill('input[placeholder*="topic title"]', 'Test Topic');
        await page.click('text=Add Topic');
        
        // Check that the topic was added
        await expect(page.locator('text=Test Topic')).toBeVisible();
    });

    test('should allow custom tab creation', async ({ page }) => {
        // Open template selector
        await page.click('text=Add Template');
        
        // Click Custom Tab option
        await page.click('text=+ Custom Tab');
        
        // Add custom tab name
        await page.fill('input[placeholder*="Custom tab name"]', 'My Custom Tab');
        await page.click('button:has-text("Add")');
        
        // Check that custom tab is added and active
        await expect(page.locator('text=My Custom Tab')).toBeVisible();
        const customTab = page.locator('button:has-text("My Custom Tab")');
        await expect(customTab).toHaveClass(/theme-accent/);
    });

    test('should allow tab deletion (except core tabs)', async ({ page }) => {
        // Add a template first
        await page.click('text=Add Template');
        await page.click('text=MCQ');
        
        // Try to delete the MCQ tab
        const mcqTab = page.locator('button:has-text("MCQ")');
        await mcqTab.hover();
        await page.click('button[title="Delete tab"]');
        
        // Confirm deletion
        await page.click('button:has-text("OK")');
        
        // Check that MCQ tab is no longer visible
        await expect(page.locator('text=MCQ')).not.toBeVisible();
        
        // Check that we can't delete core tabs (should not have delete button or should show error)
        const readTab = page.locator('button:has-text("Read")');
        await readTab.hover();
        // Core tabs shouldn't have delete buttons
        await expect(page.locator('button:has-text("Read") button[title="Delete tab"]')).not.toBeVisible();
    });

    test('should maintain tab state between navigation', async ({ page }) => {
        // Add some templates
        await page.click('text=Add Template');
        await page.click('text=Flash card');
        
        await page.click('text=Add Template');
        await page.click('text=Video');
        
        // Navigate away and back
        await page.click('text=← Back to Library');
        await page.waitForTimeout(1000);
        await page.click('text=Mathematics');
        await page.click('text=Algebra');
        await page.waitForTimeout(2000);
        
        // Check that added tabs are still there
        await expect(page.locator('text=Flash Cards')).toBeVisible();
        await expect(page.locator('text=Videos')).toBeVisible();
    });

    test('should close template selector when clicking outside', async ({ page }) => {
        // Open template selector
        await page.click('text=Add Template');
        await expect(page.locator('text=Choose Template:')).toBeVisible();
        
        // Click outside the dropdown
        await page.click('text=Read');
        
        // Check that dropdown is closed
        await expect(page.locator('text=Choose Template:')).not.toBeVisible();
    });

    test('should prevent adding duplicate templates', async ({ page }) => {
        // Add Flash Cards template
        await page.click('text=Add Template');
        await page.click('text=Flash card');
        
        // Try to add Flash Cards again
        await page.click('text=Add Template');
        const flashCardOption = page.locator('button:has-text("Flash card")');
        
        // Check that it's disabled or marked as already added
        await expect(flashCardOption).toContainText('Already added');
        await expect(flashCardOption).toBeDisabled();
    });

    test('should test Mind Map functionality', async ({ page }) => {
        // Add Mind Map template
        await page.click('text=Add Template');
        await page.click('text=Mind Map');
        
        // Check that Mind Map content loads
        await expect(page.locator('text=Mind Maps')).toBeVisible();
        await expect(page.locator('h2:has-text("Mind Maps")')).toBeVisible();
    });
});

test.describe('Highlights and Notes Separation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5175');
        await expect(page.locator('h1')).toContainText('Interactive Study Bookshelf');
        await page.click('text=Mathematics');
        await page.click('text=Algebra');
        await page.waitForTimeout(2000);
    });

    test('should have separate Highlights and Notes tabs', async ({ page }) => {
        // Check both tabs exist
        await expect(page.locator('text=Highlights')).toBeVisible();
        await expect(page.locator('text=Notes')).toBeVisible();
        
        // Check they are different tabs
        await page.click('text=Highlights');
        await expect(page.locator('h2:has-text("Highlights")')).toBeVisible();
        
        await page.click('text=Notes');
        await expect(page.locator('h2:has-text("Notes Manager")')).toBeVisible();
    });

    test('should maintain separate content in Highlights and Notes', async ({ page }) => {
        // Add a note in Notes tab
        await page.click('text=Notes');
        await page.fill('input[placeholder*="topic title"]', 'Test Note Topic');
        await page.click('text=Add Topic');
        
        // Switch to Highlights tab
        await page.click('text=Highlights');
        // Highlights content should not show the note content
        await expect(page.locator('text=Test Note Topic')).not.toBeVisible();
        
        // Switch back to Notes tab
        await page.click('text=Notes');
        // Note content should still be there
        await expect(page.locator('text=Test Note Topic')).toBeVisible();
    });
});
