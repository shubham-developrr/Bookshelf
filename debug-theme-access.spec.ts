import { test, expect } from '@playwright/test';

test.describe('Debug Theme Access', () => {
  test('should take screenshot of user dropdown', async ({ page }) => {
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    console.log('🔍 Debugging user dropdown...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-initial-page.png', fullPage: true });
    
    // Look for user button
    const userButton = page.locator('button:has(svg):last-of-type').first();
    if (await userButton.isVisible()) {
      console.log('✅ Found user button');
      
      // Highlight the button and take screenshot
      await userButton.highlight();
      await page.screenshot({ path: 'debug-user-button-highlighted.png' });
      
      // Click the button
      await userButton.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of opened dropdown
      await page.screenshot({ path: 'debug-dropdown-opened.png' });
      
      // List all visible text in the dropdown
      const dropdownTexts = await page.locator('div').filter({ hasText: /theme|settings|profile/i }).allTextContents();
      console.log('Dropdown texts:', dropdownTexts);
      
      // Get all button texts
      const buttonTexts = await page.locator('button').allTextContents();
      console.log('All button texts:', buttonTexts);
      
      // Specifically look for buttons with 'Theme' text
      const themeButtons = page.locator('button', { hasText: 'Theme' });
      const themeButtonCount = await themeButtons.count();
      console.log(`Found ${themeButtonCount} buttons with 'Theme' text`);
      
      if (themeButtonCount > 0) {
        await themeButtons.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'debug-theme-submenu.png' });
      }
    } else {
      console.log('❌ User button not found');
    }
  });
});
