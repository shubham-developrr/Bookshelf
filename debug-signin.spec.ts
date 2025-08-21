import { test, expect } from '@playwright/test';

test.describe('Debug Sign In Flow', () => {
  test('should debug sign in process', async ({ page }) => {
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    console.log('🔍 Debugging sign in flow...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-initial-state.png', fullPage: true });
    
    // Find and click sign in button
    const signInButton = page.locator('button', { hasText: 'Sign In' }).first();
    if (await signInButton.isVisible()) {
      console.log('✅ Sign In button found');
      await signInButton.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot after clicking sign in
      await page.screenshot({ path: 'debug-after-signin-click.png', fullPage: true });
      
      // Look for modal or form
      const modal = page.locator('.modal, [role="dialog"], .sign-in-form').first();
      if (await modal.isVisible()) {
        console.log('✅ Sign in modal found');
      } else {
        console.log('❌ No modal found');
      }
      
      // Check if we're on a different page
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // List all visible input fields
      const inputs = await page.locator('input').all();
      console.log(`Found ${inputs.length} input fields`);
      
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const placeholder = await input.getAttribute('placeholder');
        const type = await input.getAttribute('type');
        const isVisible = await input.isVisible();
        const isReadonly = await input.getAttribute('readonly');
        console.log(`Input ${i}: type=${type}, placeholder="${placeholder}", visible=${isVisible}, readonly=${isReadonly !== null}`);
      }
      
      // Look for any text that mentions signing in or getting started
      const pageText = await page.textContent('body');
      if (pageText?.includes('email') || pageText?.includes('password') || pageText?.includes('username')) {
        console.log('✅ Found sign in form fields in page text');
      } else {
        console.log('❌ No sign in form fields found');
      }
    } else {
      console.log('❌ Sign In button not found');
    }
  });
});
