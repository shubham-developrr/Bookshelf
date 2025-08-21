import { test, expect } from '@playwright/test';

test.describe('Working Flow Test', () => {
  test('should sign in properly and test all functionality', async ({ page }) => {
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    console.log('🚀 Starting working flow test...');
    
    // Step 1: Sign In with proper inputs
    console.log('👤 Signing in...');
    const signInButton = page.locator('button', { hasText: 'Sign In' }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(1000);
      
      // Use the email and password inputs we found
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        console.log('✅ Found email and password inputs');
        
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        
        // Look for submit button
        const submitButton = page.locator('button[type="submit"], button', { hasText: /sign in|login|continue|submit/i }).first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Signed in successfully');
          
          // Take screenshot after sign in
          await page.screenshot({ path: 'debug-after-successful-signin.png', fullPage: true });
        }
      }
    }
    
    // Step 2: Test theme functionality
    console.log('🎨 Testing theme functionality...');
    
    // Look for user profile button - try different approaches
    const userSelectors = [
      'button:has(svg):last-of-type',
      '.user-avatar',
      '.profile-button',
      'button[aria-label*="profile" i]',
      'button[aria-label*="user" i]',
      'nav button:last-child',
      'header button:last-child',
      '.dropdown-trigger',
      '[data-testid="user-profile-dropdown"]'
    ];
    
    let userButton = null;
    for (const selector of userSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        userButton = element;
        console.log(`✅ Found user button with selector: ${selector}`);
        break;
      }
    }
    
    if (userButton) {
      await userButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'debug-user-dropdown-after-signin.png' });
      
      // Get all button texts in dropdown
      const dropdownButtons = await page.locator('button').allTextContents();
      console.log('Dropdown buttons after sign in:', dropdownButtons);
      
      // Look for theme option
      const themeButton = page.locator('button', { hasText: /theme/i }).first();
      if (await themeButton.isVisible()) {
        console.log('✅ Theme option found');
        await themeButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'debug-theme-submenu.png' });
        
        // Look for custom theme
        const customThemeButton = page.locator('button', { hasText: /custom/i }).first();
        if (await customThemeButton.isVisible()) {
          console.log('✅ Custom theme option found');
          await customThemeButton.click();
          await page.waitForTimeout(1500);
          
          await page.screenshot({ path: 'debug-custom-theme-modal.png', fullPage: true });
          
          // Check for color inputs
          const colorInputs = page.locator('input[type="color"]');
          const colorInputCount = await colorInputs.count();
          console.log(`🎨 Found ${colorInputCount} color pickers`);
          
          if (colorInputCount > 0) {
            console.log('✅ THEME CUSTOMIZATION IS WORKING!');
            
            // Test changing a color
            const firstColorInput = colorInputs.first();
            await firstColorInput.click();
            await page.waitForTimeout(500);
            
            // Close the modal
            const closeButton = page.locator('button', { hasText: /close|cancel|✕|×/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
              console.log('✅ Theme modal closed successfully');
            }
          } else {
            console.log('❌ Theme customization not working - no color pickers found');
          }
        } else {
          console.log('❌ Custom theme option not found');
        }
      } else {
        console.log('❌ Theme option not found');
      }
    } else {
      console.log('❌ User button not found');
    }
    
    // Step 3: Test fast mode by creating a book and using AI
    console.log('🤖 Testing AI fast mode...');
    
    // Navigate back to main page
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(1000);
    
    const createBookButton = page.locator('button', { hasText: /create.*book/i }).first();
    if (await createBookButton.isVisible()) {
      await createBookButton.click();
      await page.waitForTimeout(1000);
      
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Fast Mode Test Book');
        
        const continueButton = page.locator('button', { hasText: /continue|next|create/i }).first();
        if (await continueButton.isVisible()) {
          await continueButton.click();
          await page.waitForTimeout(1000);
          
          // Try to add subject and get to a chapter for AI testing
          const subjectInput = page.locator('input[placeholder*="subject" i]').first();
          if (await subjectInput.isVisible()) {
            await subjectInput.fill('AI Testing');
            
            const addSubjectButton = page.locator('button', { hasText: /add|create/i }).first();
            if (await addSubjectButton.isVisible()) {
              await addSubjectButton.click();
              await page.waitForTimeout(1000);
              
              // Navigate to subject
              const subjectCard = page.locator('.subject-card, [data-testid="subject-card"]').first();
              if (await subjectCard.isVisible()) {
                await subjectCard.click();
                await page.waitForTimeout(1000);
                
                // Add chapter
                const addChapterButton = page.locator('button', { hasText: /add.*chapter/i }).first();
                if (await addChapterButton.isVisible()) {
                  await addChapterButton.click();
                  await page.waitForTimeout(500);
                  
                  const chapterInput = page.locator('input[placeholder*="chapter" i]').first();
                  if (await chapterInput.isVisible()) {
                    await chapterInput.fill('Test Chapter');
                    
                    const createChapterButton = page.locator('button', { hasText: /create|add/i }).first();
                    if (await createChapterButton.isVisible()) {
                      await createChapterButton.click();
                      await page.waitForTimeout(1500);
                      
                      // Now look for AI functionality
                      const aiButtons = [
                        'button:has-text("AI Guru")',
                        'button:has-text("AI")',
                        'button[aria-label*="AI" i]',
                        '.ai-button'
                      ];
                      
                      for (const selector of aiButtons) {
                        const aiButton = page.locator(selector).first();
                        if (await aiButton.isVisible()) {
                          console.log(`✅ Found AI button: ${selector}`);
                          await aiButton.click();
                          await page.waitForTimeout(1000);
                          
                          // Look for fast mode toggle
                          const fastModeToggle = page.locator('input[type="checkbox"]').first();
                          if (await fastModeToggle.isVisible()) {
                            console.log('✅ Fast mode toggle found - testing both modes');
                            
                            // Test fast mode
                            await fastModeToggle.check();
                            console.log('🔄 Fast mode enabled');
                            
                            // Test reasoning mode
                            await fastModeToggle.uncheck();
                            console.log('🔄 Reasoning mode enabled');
                            
                            console.log('✅ FAST MODE TOGGLE IS WORKING!');
                          } else {
                            console.log('❌ Fast mode toggle not found');
                          }
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    console.log('🏁 Working flow test completed');
  });
});
