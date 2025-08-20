import { test, expect } from '@playwright/test';

test.describe('Multiple HTML Editors Feature', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5174');
        await page.waitForLoadState('networkidle');
    });

    test('should allow adding multiple HTML code editors in custom tab', async ({ page }) => {
        // Create a new book
        await page.click('button:has-text("Create New Book")');
        await page.fill('input[placeholder="Enter book title..."]', 'Test Book for HTML Editors');
        await page.click('button:has-text("Create Book")');
        
        // Wait for subject page and create a chapter
        await page.waitForSelector('button:has-text("Add Chapter")');
        await page.click('button:has-text("Add Chapter")');
        await page.fill('input[placeholder="Enter chapter title..."]', 'Test Chapter');
        await page.click('button:has-text("Add Chapter")');
        
        // Click on the newly created chapter
        await page.click('text=Test Chapter');
        
        // Wait for the reader page to load
        await page.waitForSelector('div[role="tablist"]');
        
        // Add a custom tab
        await page.click('button[title="Add custom tab"]');
        await page.fill('input[placeholder="Enter tab name..."]', 'Multiple HTML Editors');
        await page.click('button:has-text("Add Tab")');
        
        // Click on the newly created custom tab
        await page.click('text=Multiple HTML Editors');
        
        // Wait for the custom tab content to load
        await page.waitForSelector('text=Custom Editor');
        
        // Switch to HTML mode
        await page.click('button:has-text("HTML Code")');
        
        // Wait for HTML editors section to load
        await page.waitForSelector('text=HTML Code Editors');
        
        // Verify initial state - should have 1 editor by default
        await expect(page.locator('text=HTML Code Editors')).toBeVisible();
        await expect(page.locator('span:has-text("1")')).toBeVisible(); // Editor count badge
        
        // Verify the first editor is present
        await expect(page.locator('input[value="HTML Editor 1"]')).toBeVisible();
        
        // Add a second HTML editor
        await page.click('button:has-text("Add HTML Editor")');
        
        // Verify second editor appears
        await expect(page.locator('span:has-text("2")')).toBeVisible(); // Updated count badge
        await expect(page.locator('input[value="HTML Editor 2"]')).toBeVisible();
        
        // Add a third HTML editor
        await page.click('button:has-text("Add HTML Editor")');
        
        // Verify third editor appears
        await expect(page.locator('span:has-text("3")')).toBeVisible(); // Updated count badge
        await expect(page.locator('input[value="HTML Editor 3"]')).toBeVisible();
        
        // Test editing the title of the second editor
        await page.fill('input[value="HTML Editor 2"]', 'My Custom Web Page');
        await expect(page.locator('input[value="My Custom Web Page"]')).toBeVisible();
        
        // Test adding content to the first editor
        const firstEditorTextarea = page.locator('textarea').first();
        await firstEditorTextarea.fill('<h1>Hello from Editor 1</h1><p>This is the first editor content.</p>');
        
        // Test adding content to the second editor
        const secondEditorTextarea = page.locator('textarea').nth(1);
        await secondEditorTextarea.fill('<h1>Hello from Editor 2</h1><p>This is the second editor content.</p>');
        
        // Test removing an editor (but not the last one)
        const removeButtons = page.locator('button:has-text("Remove")');
        await removeButtons.first().click();
        
        // Verify editor was removed and count updated
        await expect(page.locator('span:has-text("2")')).toBeVisible(); // Count should be 2 now
        await expect(page.locator('input[value="HTML Editor 1"]')).not.toBeVisible(); // First editor should be gone
        
        // Try to remove another editor
        const remainingRemoveButtons = page.locator('button:has-text("Remove")');
        await remainingRemoveButtons.first().click();
        
        // Verify we now have 1 editor
        await expect(page.locator('span:has-text("1")')).toBeVisible();
        
        // Try to remove the last editor - should show alert
        const lastRemoveButton = page.locator('button:has-text("Remove")');
        
        // Listen for the alert dialog
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Cannot remove the last editor');
            await dialog.accept();
        });
        
        await lastRemoveButton.click();
        
        // Verify we still have 1 editor (couldn't remove the last one)
        await expect(page.locator('span:has-text("1")')).toBeVisible();
    });

    test('should persist HTML editors across page reloads', async ({ page }) => {
        // Create a new book
        await page.click('button:has-text("Create New Book")');
        await page.fill('input[placeholder="Enter book title..."]', 'Persistence Test Book');
        await page.click('button:has-text("Create Book")');
        
        // Create a chapter
        await page.waitForSelector('button:has-text("Add Chapter")');
        await page.click('button:has-text("Add Chapter")');
        await page.fill('input[placeholder="Enter chapter title..."]', 'Persistence Test Chapter');
        await page.click('button:has-text("Add Chapter")');
        
        // Click on the chapter
        await page.click('text=Persistence Test Chapter');
        
        // Add a custom tab
        await page.waitForSelector('div[role="tablist"]');
        await page.click('button[title="Add custom tab"]');
        await page.fill('input[placeholder="Enter tab name..."]', 'Persistence Test Tab');
        await page.click('button:has-text("Add Tab")');
        
        // Click on the custom tab
        await page.click('text=Persistence Test Tab');
        
        // Switch to HTML mode
        await page.click('button:has-text("HTML Code")');
        
        // Add multiple editors
        await page.click('button:has-text("Add HTML Editor")'); // Should now have 2 editors
        await page.click('button:has-text("Add HTML Editor")'); // Should now have 3 editors
        
        // Customize editor titles
        await page.fill('input[value="HTML Editor 1"]', 'Header Section');
        await page.fill('input[value="HTML Editor 2"]', 'Main Content');
        await page.fill('input[value="HTML Editor 3"]', 'Footer Section');
        
        // Add content to editors
        const textareas = page.locator('textarea');
        await textareas.nth(0).fill('<header><h1>Welcome to My Site</h1></header>');
        await textareas.nth(1).fill('<main><p>This is the main content area.</p></main>');
        await textareas.nth(2).fill('<footer><p>&copy; 2024 My Website</p></footer>');
        
        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Navigate back to the same location
        await page.click('text=Persistence Test Book');
        await page.click('text=Persistence Test Chapter');
        await page.click('text=Persistence Test Tab');
        
        // Switch to HTML mode again
        await page.click('button:has-text("HTML Code")');
        
        // Verify all editors are still there with their custom titles
        await expect(page.locator('span:has-text("3")')).toBeVisible();
        await expect(page.locator('input[value="Header Section"]')).toBeVisible();
        await expect(page.locator('input[value="Main Content"]')).toBeVisible();
        await expect(page.locator('input[value="Footer Section"]')).toBeVisible();
        
        // Verify content is preserved
        const persistedTextareas = page.locator('textarea');
        await expect(persistedTextareas.nth(0)).toHaveValue('<header><h1>Welcome to My Site</h1></header>');
        await expect(persistedTextareas.nth(1)).toHaveValue('<main><p>This is the main content area.</p></main>');
        await expect(persistedTextareas.nth(2)).toHaveValue('<footer><p>&copy; 2024 My Website</p></footer>');
    });

    test('should switch between Rich Text and HTML Code modes with multiple editors', async ({ page }) => {
        // Create a new book and chapter
        await page.click('button:has-text("Create New Book")');
        await page.fill('input[placeholder="Enter book title..."]', 'Mode Switch Test Book');
        await page.click('button:has-text("Create Book")');
        
        await page.waitForSelector('button:has-text("Add Chapter")');
        await page.click('button:has-text("Add Chapter")');
        await page.fill('input[placeholder="Enter chapter title..."]', 'Mode Switch Chapter');
        await page.click('button:has-text("Add Chapter")');
        
        await page.click('text=Mode Switch Chapter');
        
        // Add custom tab
        await page.waitForSelector('div[role="tablist"]');
        await page.click('button[title="Add custom tab"]');
        await page.fill('input[placeholder="Enter tab name..."]', 'Mode Switch Tab');
        await page.click('button:has-text("Add Tab")');
        
        await page.click('text=Mode Switch Tab');
        
        // Initially should be in Rich Text mode
        await expect(page.locator('button:has-text("Rich Text")')).toHaveClass(/theme-accent/);
        
        // Switch to HTML mode
        await page.click('button:has-text("HTML Code")');
        await expect(page.locator('button:has-text("HTML Code")')).toHaveClass(/theme-accent/);
        
        // Add multiple editors
        await page.click('button:has-text("Add HTML Editor")');
        await page.click('button:has-text("Add HTML Editor")');
        
        // Verify we have 3 editors
        await expect(page.locator('span:has-text("3")')).toBeVisible();
        
        // Switch back to Rich Text mode
        await page.click('button:has-text("Rich Text")');
        await expect(page.locator('button:has-text("Rich Text")')).toHaveClass(/theme-accent/);
        
        // Should not see HTML editors anymore
        await expect(page.locator('text=HTML Code Editors')).not.toBeVisible();
        
        // Switch back to HTML mode
        await page.click('button:has-text("HTML Code")');
        
        // Should still have all 3 editors
        await expect(page.locator('span:has-text("3")')).toBeVisible();
        await expect(page.locator('input[value="HTML Editor 1"]')).toBeVisible();
        await expect(page.locator('input[value="HTML Editor 2"]')).toBeVisible();
        await expect(page.locator('input[value="HTML Editor 3"]')).toBeVisible();
    });
});
