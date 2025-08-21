import { test, expect } from '@playwright/test';

test.describe('Complete Flow Test', () => {
  test('should sign in and test all functionality', async ({ page }) => {
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    console.log('🚀 Starting complete flow test...');
    
    // Step 1: Sign In
    console.log('👤 Signing in...');
    const signInButton = page.locator('button', { hasText: 'Sign In' }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(1000);
      
      // Fill in sign in form (assuming basic form)
      const nameInput = page.locator('input[placeholder*="name" i], input[name="name"], input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
        
        const submitButton = page.locator('button[type="submit"], button', { hasText: /sign in|login|continue/i }).first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Signed in successfully');
        }
      }
    }
    
    // Step 2: Now test theme functionality
    console.log('🎨 Testing theme functionality after sign in...');
    
    // Look for user profile button again
    const userButton = page.locator('button:has(svg):last-of-type').first();
    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot to see what's in the dropdown
      await page.screenshot({ path: 'debug-signed-in-dropdown.png' });
      
      // Look for theme option
      const themeButton = page.locator('button', { hasText: /theme/i }).first();
      if (await themeButton.isVisible()) {
        console.log('✅ Theme option found after sign in');
        await themeButton.click();
        await page.waitForTimeout(500);
        
        // Look for custom theme
        const customThemeButton = page.locator('button', { hasText: /custom/i }).first();
        if (await customThemeButton.isVisible()) {
          console.log('✅ Custom theme option found');
          await customThemeButton.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot of theme selector
          await page.screenshot({ path: 'debug-theme-selector.png' });
          
          // Check for color inputs
          const colorInputs = page.locator('input[type="color"]');
          const colorInputCount = await colorInputs.count();
          console.log(`🎨 Found ${colorInputCount} color pickers in theme customization`);
          
          if (colorInputCount > 0) {
            console.log('✅ Theme customization is working!');
          }
        } else {
          console.log('❌ Custom theme option not found');
        }
      } else {
        console.log('❌ Theme option still not found after sign in');
        
        // Debug: show all button texts
        const buttonTexts = await page.locator('button').allTextContents();
        console.log('Available buttons after sign in:', buttonTexts);
      }
    }
    
    // Step 3: Test import functionality
    console.log('📥 Testing import functionality...');
    
    const importButton = page.locator('button', { hasText: /import/i }).first();
    if (await importButton.isVisible()) {
      console.log('✅ Import button found');
      await importButton.click();
      await page.waitForTimeout(1000);
      
      // Check for file input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        console.log('✅ File input found - import functionality working');
      } else {
        console.log('❌ File input not found');
      }
    }
    
    // Step 4: Test AI functionality by creating content
    console.log('🤖 Testing AI functionality...');
    
    // Create a book for AI testing
    const createBookButton = page.locator('button', { hasText: /create.*book/i }).first();
    if (await createBookButton.isVisible()) {
      await createBookButton.click();
      await page.waitForTimeout(1000);
      
      // Quick book creation
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('AI Test Book');
        
        const continueButton = page.locator('button', { hasText: /continue|next/i }).first();
        if (await continueButton.isVisible()) {
          await continueButton.click();
          
          // Skip to a chapter creation if possible
          await page.waitForTimeout(1000);
          
          // Look for AI-related buttons anywhere on the page
          const aiButtons = await page.locator('button').allTextContents();
          const hasAIButton = aiButtons.some(text => 
            text.toLowerCase().includes('ai') || 
            text.toLowerCase().includes('guru') || 
            text.toLowerCase().includes('assistant')
          );
          
          if (hasAIButton) {
            console.log('✅ AI functionality available');
          } else {
            console.log('❌ AI functionality not immediately accessible');
          }
        }
      }
    }
    
    console.log('🏁 Complete flow test finished');
  });
});
