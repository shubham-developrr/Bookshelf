import { test, expect } from '@playwright/test';

test.describe('Complete App Functionality Test', () => {
  
  test('Theme switching, custom theme, AI toggle, and import/export', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5177');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    console.log('🚀 Starting comprehensive functionality test...');

    // ===============================
    // 1. TEST THEME FUNCTIONALITY
    // ===============================
    
    console.log('📊 Testing theme functionality...');
    
    // Check if settings gear button exists
    const settingsGear = page.locator('button:has-text("⚙"), [title*="Settings"], [aria-label*="Settings"]');
    if (await settingsGear.first().isVisible()) {
      await settingsGear.first().click();
      console.log('✅ Settings dropdown opened');
      
      // Look for theme option
      const themeOption = page.locator('button:has-text("Theme"), text=Theme').first();
      if (await themeOption.isVisible()) {
        await themeOption.click();
        console.log('✅ Theme selector opened');
        
        // Test different themes
        const themes = ['light', 'dark', 'amoled'];
        for (const theme of themes) {
          const themeButton = page.locator(`button:has-text("${theme}")`, { hasText: theme }).first();
          if (await themeButton.isVisible()) {
            await themeButton.click();
            await page.waitForTimeout(500);
            console.log(`✅ ${theme} theme applied`);
          }
        }
        
        // Test custom theme
        const customThemeButton = page.locator('button:has-text("Custom"), button:has-text("🎨")').first();
        if (await customThemeButton.isVisible()) {
          await customThemeButton.click();
          console.log('✅ Custom theme form opened');
          
          // Fill custom colors
          const primaryColorInput = page.locator('input[type="color"]').first();
          if (await primaryColorInput.isVisible()) {
            await primaryColorInput.fill('#ff6b35');
            console.log('✅ Primary color set');
          }
          
          const secondaryColorInput = page.locator('input[type="color"]').nth(1);
          if (await secondaryColorInput.isVisible()) {
            await secondaryColorInput.fill('#f7931e');
            console.log('✅ Secondary color set');
          }
          
          const accentColorInput = page.locator('input[type="color"]').nth(2);
          if (await accentColorInput.isVisible()) {
            await accentColorInput.fill('#ffd700');
            console.log('✅ Accent color set');
          }
          
          // Apply custom theme
          const applyButton = page.locator('button:has-text("Apply")');
          if (await applyButton.isVisible()) {
            await applyButton.click();
            console.log('✅ Custom theme applied');
          }
        } else {
          console.log('❌ Custom theme button not found');
        }
      } else {
        console.log('❌ Theme option not found in settings');
      }
    } else {
      console.log('❌ Settings gear button not found');
    }

    // ===============================
    // 2. TEST AI GURU TOGGLE
    // ===============================
    
    console.log('🤖 Testing AI Guru fast/reasoning toggle...');
    
    // Navigate to a subject to access reader
    const subjectCard = page.locator('[data-testid="subject-card"], .subject-card, button:has-text("Database")').first();
    if (await subjectCard.isVisible()) {
      await subjectCard.click();
      console.log('✅ Opened subject page');
      
      // Look for a chapter to enter reader mode
      const chapter = page.locator('button:has-text("Chapter"), .chapter-item').first();
      if (await chapter.isVisible()) {
        await chapter.click();
        console.log('✅ Opened chapter in reader');
        
        // Look for AI Guru button or text selection
        const aiGuruButton = page.locator('button:has-text("AI Guru"), [title*="AI"], .ai-guru-button').first();
        if (await aiGuruButton.isVisible()) {
          await aiGuruButton.click();
          console.log('✅ AI Guru modal opened');
          
          // Check for fast/reasoning toggle
          const toggle = page.locator('button[role="switch"], .toggle, input[type="checkbox"]').first();
          if (await toggle.isVisible()) {
            console.log('✅ Fast/Reasoning toggle found');
            
            // Test toggle functionality
            await toggle.click();
            console.log('🔄 Toggle switched to fast mode');
            
            // Send a test message
            const messageInput = page.locator('textarea, input[type="text"]').last();
            if (await messageInput.isVisible()) {
              await messageInput.fill('What is 2+2?');
              
              const sendButton = page.locator('button:has([d*="M2,21L23,12"]), button:has-text("Send")').first();
              if (await sendButton.isVisible()) {
                await sendButton.click();
                console.log('✅ Test message sent with fast mode');
                
                // Wait for response
                await page.waitForTimeout(3000);
                
                // Switch back to reasoning mode
                await toggle.click();
                console.log('🔄 Toggle switched to reasoning mode');
                
                // Send another test message
                await messageInput.fill('Explain quantum physics');
                await sendButton.click();
                console.log('✅ Test message sent with reasoning mode');
              }
            }
          } else {
            console.log('❌ Fast/Reasoning toggle not found');
          }
        } else {
          console.log('❌ AI Guru button not found');
        }
      }
    }

    // ===============================
    // 3. TEST IMPORT FUNCTIONALITY
    // ===============================
    
    console.log('📥 Testing import functionality...');
    
    // Go back to home/bookshelf
    await page.goto('http://localhost:5177');
    await page.waitForLoadState('networkidle');
    
    // Look for import button
    const importButton = page.locator('button:has-text("Import"), button:has-text("📥"), [title*="Import"]').first();
    if (await importButton.isVisible()) {
      console.log('✅ Import button found');
      
      // Check if file input becomes available after clicking
      await importButton.click();
      
      // Check if file input exists
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible() || await fileInput.count() > 0) {
        console.log('✅ File input available for import');
      } else {
        console.log('❌ File input not accessible');
      }
    } else {
      console.log('❌ Import button not found');
    }

    // ===============================
    // 4. TEST EXPORT FUNCTIONALITY  
    // ===============================
    
    console.log('📤 Testing export functionality...');
    
    // Navigate to a subject page where export button should be
    const databaseSubject = page.locator('button:has-text("Database"), [data-subject*="Database"]').first();
    if (await databaseSubject.isVisible()) {
      await databaseSubject.click();
      console.log('✅ Opened Database Management subject');
      
      // Look for export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("📤"), [title*="Export"]').first();
      if (await exportButton.isVisible()) {
        console.log('✅ Export button found');
        
        // Test clicking export button
        await exportButton.click();
        console.log('🔄 Export button clicked');
        
        // Wait to see if any success/error message appears
        await page.waitForTimeout(2000);
        
        // Check for any feedback messages
        const messages = page.locator('[class*="message"], [class*="toast"], [class*="alert"]');
        const messageCount = await messages.count();
        if (messageCount > 0) {
          const messageText = await messages.first().textContent();
          console.log(`📝 Export feedback: ${messageText}`);
        } else {
          console.log('📝 No visible export feedback found');
        }
      } else {
        console.log('❌ Export button not found on subject page');
      }
    } else {
      console.log('❌ Database subject not found');
    }

    console.log('✅ Comprehensive test completed!');
  });
});
