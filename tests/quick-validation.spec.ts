import { test, expect } from '@playwright/test';

test.describe('Core Template System Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:5175');
        
        // Wait for the app to load
        await page.waitForTimeout(2000);
        
        // Navigate to a chapter
        try {
            await page.click('text=Mathematics', { timeout: 5000 });
            await page.waitForTimeout(1000);
            await page.click('text=Algebra', { timeout: 5000 });
            await page.waitForTimeout(3000);
        } catch (error) {
            console.log('Navigation failed, but continuing with tests');
        }
    });

    test('should display default tabs and template selector', async ({ page }) => {
        // Check that default tabs are visible
        await expect(page.locator('text=Read')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Highlights')).toBeVisible();
        
        // Check template selector
        await page.click('text=Add Template');
        await expect(page.locator('text=Choose Template:')).toBeVisible();
        
        // Check template options
        await expect(page.locator('text=Flash card')).toBeVisible();
        await expect(page.locator('text=MCQ')).toBeVisible();
        await expect(page.locator('text=Video')).toBeVisible();
    });

    test('should add and use Templates', async ({ page }) => {
        // Test Flash Cards
        await page.click('text=Add Template');
        await page.click('text=Flash card');
        await expect(page.locator('text=Flash Cards')).toBeVisible();
        
        // Test Videos
        await page.click('text=Add Template');
        await page.click('text=Video');
        await expect(page.locator('text=Videos')).toBeVisible();
        
        // Verify Video content loads
        await expect(page.locator('text=Video Library')).toBeVisible();
    });

    test('should validate Notes functionality', async ({ page }) => {
        // Click Notes tab
        await page.click('text=Notes');
        await expect(page.locator('text=Notes Manager')).toBeVisible();
        
        // Test basic functionality without detailed interaction
        await expect(page.locator('button:has-text("Add Topic")')).toBeVisible();
    });
});
