import { test, expect } from '@playwright/test';

test.describe('Theme and AI Functionality Test', () => {
  test('should test theme customization and AI fast mode', async ({ page }) => {
    // Start at the application
    await page.goto('http://localhost:5177');
    
    console.log('🚀 Starting theme and AI functionality test...');
    
    // Test 1: Access theme customization
    console.log('🎨 Testing theme customization access...');
    
    // Wait for page to load completely
    await page.waitForTimeout(2000);
    
    // Look for user avatar/profile button (it might be a circle or icon)
    const possibleSelectors = [
      'button[data-testid="user-profile-dropdown"]',
      '.user-avatar',
      '.profile-button',
      'button:has(svg):last-of-type',
      'button[aria-label*="profile" i]',
      'button[aria-label*="user" i]',
      'button[aria-label*="menu" i]',
      'div:has(svg) button:last-child',
      '[class*="profile"] button',
      '[class*="user"] button',
      'header button:last-child',
      'nav button:last-child'
    ];
    
    let userButton = null;
    for (const selector of possibleSelectors) {
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
      
      // Look for theme option in dropdown
      const themeButton = page.locator('button', { hasText: /theme/i }).first();
      if (await themeButton.isVisible()) {
        console.log('✅ Theme option found in dropdown');
        await themeButton.click();
        await page.waitForTimeout(500);
        
        // Look for custom theme option
        const customThemeButton = page.locator('button', { hasText: /custom/i }).first();
        if (await customThemeButton.isVisible()) {
          console.log('✅ Custom theme option found');
          await customThemeButton.click();
          await page.waitForTimeout(1000);
          
          // Check if theme customization modal opened
          const colorInputs = page.locator('input[type="color"]');
          const colorInputCount = await colorInputs.count();
          console.log(`🎨 Theme customization modal has ${colorInputCount} color pickers`);
          
          if (colorInputCount > 0) {
            console.log('✅ Theme customization interface is working!');
            
            // Close the modal
            const closeButton = page.locator('button', { hasText: /close|cancel|×/i }).first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
          } else {
            console.log('❌ Theme customization interface not found');
          }
        } else {
          console.log('❌ Custom theme option not found');
        }
      } else {
        console.log('❌ Theme option not found in dropdown');
      }
    } else {
      console.log('❌ User profile button not found');
      
      // Alternative: Look for settings/theme anywhere on the page
      const settingsButton = page.locator('button', { hasText: /settings|theme/i }).first();
      if (await settingsButton.isVisible()) {
        console.log('✅ Found alternative settings button');
        await settingsButton.click();
      }
    }
    
    // Test 2: AI Fast Mode Testing
    console.log('🤖 Testing AI fast mode functionality...');
    
    // Navigate to create a book first
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(1000);
    
    // Create a minimal book structure for AI testing
    const createBookButton = page.locator('button', { hasText: /create|add|new.*book/i }).first();
    if (await createBookButton.isVisible()) {
      await createBookButton.click();
      await page.waitForTimeout(500);
      
      // Fill basic book info
      const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('AI Test Book');
        
        const continueButton = page.locator('button', { hasText: /continue|create|next/i }).first();
        if (await continueButton.isVisible()) {
          await continueButton.click();
          await page.waitForTimeout(500);
          
          // Add subject
          const subjectInput = page.locator('input[placeholder*="subject" i]').first();
          if (await subjectInput.isVisible()) {
            await subjectInput.fill('Mathematics');
            
            const addSubjectButton = page.locator('button', { hasText: /add|create/i }).first();
            if (await addSubjectButton.isVisible()) {
              await addSubjectButton.click();
              await page.waitForTimeout(500);
              
              // Navigate to subject
              const subjectCard = page.locator('.subject-card, [data-testid="subject-card"]').first();
              if (await subjectCard.isVisible()) {
                await subjectCard.click();
                await page.waitForTimeout(500);
                
                // Add chapter
                const addChapterButton = page.locator('button', { hasText: /add.*chapter|create.*chapter/i }).first();
                if (await addChapterButton.isVisible()) {
                  await addChapterButton.click();
                  await page.waitForTimeout(500);
                  
                  const chapterTitleInput = page.locator('input[placeholder*="chapter" i]').first();
                  if (await chapterTitleInput.isVisible()) {
                    await chapterTitleInput.fill('Algebra');
                    
                    const createChapterButton = page.locator('button', { hasText: /create|add/i }).first();
                    if (await createChapterButton.isVisible()) {
                      await createChapterButton.click();
                      await page.waitForTimeout(1000);
                      
                      // Now test AI functionality
                      console.log('🤖 Looking for AI Guru button...');
                      
                      const aiButtons = [
                        'button:has-text("AI Guru")',
                        'button:has-text("AI Assistant")',
                        'button:has-text("AI")',
                        'button[aria-label*="AI" i]',
                        '.ai-button',
                        '.guru-button'
                      ];
                      
                      let aiButton = null;
                      for (const selector of aiButtons) {
                        const element = page.locator(selector).first();
                        if (await element.isVisible()) {
                          aiButton = element;
                          console.log(`✅ Found AI button with selector: ${selector}`);
                          break;
                        }
                      }
                      
                      if (aiButton) {
                        await aiButton.click();
                        await page.waitForTimeout(1000);
                        
                        // Look for fast mode toggle
                        const fastModeToggle = page.locator('input[type="checkbox"]').first();
                        if (await fastModeToggle.isVisible()) {
                          console.log('✅ Fast mode toggle found');
                          
                          // Test both modes
                          console.log('🔄 Testing fast mode...');
                          await fastModeToggle.check();
                          await page.waitForTimeout(500);
                          
                          // Send test message
                          const messageInput = page.locator('textarea, input[type="text"]').last();
                          if (await messageInput.isVisible()) {
                            await messageInput.fill('What is 2+2? Keep it brief.');
                            
                            const sendButton = page.locator('button', { hasText: /send|submit/i }).first();
                            if (await sendButton.isVisible()) {
                              console.log('📤 Sending fast mode test message...');
                              await sendButton.click();
                              await page.waitForTimeout(3000);
                              
                              console.log('🔄 Testing reasoning mode...');
                              await fastModeToggle.uncheck();
                              await page.waitForTimeout(500);
                              
                              await messageInput.fill('Explain the concept of addition.');
                              await sendButton.click();
                              await page.waitForTimeout(3000);
                              
                              console.log('✅ AI mode testing completed');
                            }
                          }
                        } else {
                          console.log('❌ Fast mode toggle not found');
                        }
                      } else {
                        console.log('❌ AI button not found');
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
    
    console.log('🏁 Theme and AI test completed');
  });
});
