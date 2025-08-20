import { test, expect } from '@playwright/test';

test('Multiple HTML Editors Basic Test', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    
    // Basic verification that the app loads
    await expect(page.locator('h1')).toContainText(['Bookshelf', 'Interactive Study']);
});
