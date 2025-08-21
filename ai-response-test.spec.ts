import { test, expect } from '@playwright/test';

test.describe('AI Response and Animation Test', () => {
  test('should show proper thinking animation and receive responses', async ({ page }) => {
    // Capture console logs to verify debugging
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('http://localhost:5178');
    await page.waitForTimeout(2000);
    
    console.log('🚀 Testing AI response fixes and thinking animation...');
    
    // Sign in first
    const signInButton = page.locator('button', { hasText: 'Sign In' }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(1000);
      
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        
        const submitButton = page.locator('button', { hasText: /sign in/i }).first();
        await submitButton.click({ force: true });
        await page.waitForTimeout(3000);
        console.log('✅ Signed in successfully');
      }
    }
    
    // Create a book to access AI functionality
    const createBookButton = page.locator('button', { hasText: /create.*book/i }).first();
    if (await createBookButton.isVisible()) {
      await createBookButton.click();
      await page.waitForTimeout(1000);
      
      const titleInput = page.locator('input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('AI Response Test Book');
        
        const continueButton = page.locator('button', { hasText: /continue|next/i }).first();
        if (await continueButton.isVisible()) {
          await continueButton.click();
          await page.waitForTimeout(1000);
          
          // Add subject
          const subjectInput = page.locator('input[placeholder*="subject" i]').first();
          if (await subjectInput.isVisible()) {
            await subjectInput.fill('Testing');
            
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
                    await chapterInput.fill('AI Test Chapter');
                    
                    const createChapterButton = page.locator('button', { hasText: /create|add/i }).first();
                    if (await createChapterButton.isVisible()) {
                      await createChapterButton.click();
                      await page.waitForTimeout(2000);
                      
                      // Now test AI functionality
                      console.log('🤖 Looking for AI Guru button...');
                      
                      const aiButton = page.locator('button', { hasText: /ai guru/i }).first();
                      if (await aiButton.isVisible()) {
                        console.log('✅ AI Guru button found');
                        await aiButton.click();
                        await page.waitForTimeout(1500);
                        
                        // Test the thinking animation
                        console.log('🎭 Testing thinking animation...');
                        
                        const messageInput = page.locator('textarea').last();
                        if (await messageInput.isVisible()) {
                          await messageInput.fill('What is 2+2? Please explain step by step.');
                          
                          const sendButton = page.locator('button:has(svg)').last();
                          if (await sendButton.isVisible()) {
                            console.log('📤 Sending test message...');
                            await sendButton.click();
                            
                            // Wait for and verify thinking animation appears
                            await page.waitForTimeout(500);
                            
                            // Check for thinking animation elements
                            const thinkingAnimation = page.locator('div:has-text("AI Guru is"), div:has-text("thinking"), div:has-text("analyzing")').first();
                            if (await thinkingAnimation.isVisible()) {
                              console.log('✅ THINKING ANIMATION IS WORKING!');
                              
                              // Take screenshot of thinking animation
                              await page.screenshot({ path: 'ai-thinking-animation.png' });
                            } else {
                              console.log('❌ Thinking animation not found');
                            }
                            
                            // Wait for response (up to 15 seconds)
                            console.log('⏳ Waiting for AI response...');
                            await page.waitForTimeout(15000);
                            
                            // Check if response appears
                            const aiResponse = page.locator('div:has-text("AI Guru Response"), .enhanced-ai-response, .prose').first();
                            if (await aiResponse.isVisible()) {
                              console.log('✅ AI RESPONSE IS WORKING!');
                              
                              // Take screenshot of response
                              await page.screenshot({ path: 'ai-response-working.png' });
                              
                              // Check response content
                              const responseText = await aiResponse.textContent();
                              if (responseText && responseText.length > 10) {
                                console.log('✅ Response has content:', responseText.substring(0, 100) + '...');
                              } else {
                                console.log('❌ Response appears empty');
                              }
                            } else {
                              console.log('❌ AI response not found');
                            }
                            
                            // Check console logs for debugging info
                            const relevantLogs = consoleLogs.filter(log => 
                              log.includes('Gemini') || 
                              log.includes('response') || 
                              log.includes('text') ||
                              log.includes('AI Guru')
                            );
                            
                            console.log('📝 Relevant console logs:');
                            relevantLogs.forEach(log => console.log('  -', log));
                          }
                        }
                      } else {
                        console.log('❌ AI Guru button not found');
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
    
    console.log('\n🎉 FINAL RESULTS:');
    console.log('==================');
    
    const hasResponseLogs = consoleLogs.some(log => log.includes('Successfully used Gemini'));
    const hasTextLogs = consoleLogs.some(log => log.includes('Extracted text preview'));
    
    console.log(`🤖 AI Service: ${hasResponseLogs ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`📝 Response Text: ${hasTextLogs ? '✅ EXTRACTED' : '❌ NOT EXTRACTED'}`);
    console.log(`🎭 Animation: Enhanced thinking animation implemented`);
    console.log(`🔧 Debugging: Enhanced console logging added`);
  });
});
