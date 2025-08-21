import { test, expect } from '@playwright/test';

test('Find and test AI Guru modal directly', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Take screenshot of current page
  await page.screenshot({ path: 'app-homepage.png', fullPage: true });

  // Look for AI Guru button directly on the page (it might be in a floating button or header)
  const aiGuruButton = page.locator('button').filter({ hasText: /AI.*Guru|Guru.*AI/i }).first();
  if (await aiGuruButton.isVisible()) {
    console.log('✅ Found AI Guru button on homepage');
    await aiGuruButton.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('❌ AI Guru button not found on homepage');
    
    // Look for floating action buttons or icons
    const aiIcon = page.locator('svg, .icon').filter({ hasText: /ai|guru/i }).first();
    if (await aiIcon.isVisible()) {
      console.log('✅ Found AI icon');
      await aiIcon.click();
      await page.waitForTimeout(2000);
    }
  }

  // Check if AI Guru modal is now open
  const modal = page.locator('.modal, .overlay, .ai-guru-modal, [role="dialog"]');
  const modalCount = await modal.count();
  console.log(`Found ${modalCount} modals on page`);

  if (modalCount > 0) {
    console.log('✅ Modal found, testing streaming functionality');
    
    // Take screenshot of modal
    await page.screenshot({ path: 'ai-guru-modal-direct.png', fullPage: true });
    
    // Look for input in modal
    const modalInput = modal.locator('textarea, input[type="text"]').first();
    if (await modalInput.isVisible()) {
      console.log('✅ Found input field in modal');
      
      // Test streaming
      await modalInput.fill('What is the speed of light?');
      
      const sendButton = modal.locator('button').filter({ hasText: /Send|Submit/ }).first();
      if (await sendButton.isVisible()) {
        console.log('✅ Sending test message');
        await sendButton.click();
        
        // Wait for thinking animation
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'ai-thinking-direct.png', fullPage: true });
        
        // Wait for streaming response
        await page.waitForTimeout(8000);
        await page.screenshot({ path: 'ai-response-direct.png', fullPage: true });
        
        console.log('✅ Direct AI Guru test completed');
      }
    }
  }

  // If no modal found, try to navigate to existing content
  console.log('Looking for existing books or content...');
  
  // Check for any book cards, subject cards, or content
  const contentElements = page.locator('.book-card, .subject-card, .content-item, .chapter-item');
  const contentCount = await contentElements.count();
  console.log(`Found ${contentCount} content elements`);

  if (contentCount > 0) {
    // Click on first content element
    await contentElements.first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'content-page-navigation.png', fullPage: true });
    
    // Now look for reader or AI guru in the content page
    const readerButtons = page.locator('button').filter({ hasText: /Reader|Read|Open/i });
    const readerCount = await readerButtons.count();
    console.log(`Found ${readerCount} reader buttons`);
    
    if (readerCount > 0) {
      await readerButtons.first().click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'reader-page-navigation.png', fullPage: true });
      
      // Look for AI Guru in reader
      const aiInReader = page.locator('button, .tab').filter({ hasText: /AI.*Guru/i });
      if (await aiInReader.first().isVisible()) {
        console.log('✅ Found AI Guru in reader');
        await aiInReader.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'ai-guru-in-reader.png', fullPage: true });
        
        // Test streaming in reader context
        const readerInput = page.locator('textarea, input[type="text"]').last();
        if (await readerInput.isVisible()) {
          await readerInput.fill('Explain quantum mechanics');
          
          const readerSend = page.locator('button').filter({ hasText: /Send/ }).last();
          if (await readerSend.isVisible()) {
            await readerSend.click();
            
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'reader-ai-thinking.png', fullPage: true });
            
            await page.waitForTimeout(8000);
            await page.screenshot({ path: 'reader-ai-response.png', fullPage: true });
            
            console.log('✅ Reader AI Guru streaming test completed');
          }
        }
      }
    }
  }

  // Print all available buttons for debugging
  console.log('=== ALL AVAILABLE BUTTONS ===');
  const allButtons = page.locator('button');
  const buttonCount = await allButtons.count();
  for (let i = 0; i < Math.min(buttonCount, 20); i++) {
    const buttonText = await allButtons.nth(i).textContent();
    if (buttonText && buttonText.trim()) {
      console.log(`Button ${i}: "${buttonText.trim()}"`);
    }
  }
  
  console.log('=== END BUTTON LIST ===');
});
