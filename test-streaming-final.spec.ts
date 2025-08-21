import { test, expect } from '@playwright/test';

test('Test AI Guru streaming functionality', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Take screenshot of current page
  await page.screenshot({ path: 'current-app-state.png', fullPage: true });

  // Look for create book button with proper syntax
  const createBookBtn = page.locator('button').filter({ hasText: 'Create Book' }).first();
  if (await createBookBtn.isVisible()) {
    console.log('✅ Found Create Book button');
    await createBookBtn.click();
    await page.waitForTimeout(1000);
    
    // Fill in book details
    const titleInput = page.locator('input').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Book for AI Streaming');
      
      // Look for create button
      const submitBtn = page.locator('button').filter({ hasText: 'Create' }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  // Look for any existing books in the shelf
  const bookElements = page.locator('.book-card, .subject-card, .book-item, [data-testid*="book"]');
  const bookCount = await bookElements.count();
  console.log(`Found ${bookCount} books in shelf`);

  if (bookCount > 0) {
    // Click on the first book
    console.log('Clicking on first book...');
    await bookElements.first().click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'book-content-page.png', fullPage: true });
    
    // Look for chapters or reader interface
    const chapterElements = page.locator('.chapter-item, .chapter-card, .content-item');
    const chapterCount = await chapterElements.count();
    console.log(`Found ${chapterCount} chapters`);
    
    if (chapterCount > 0) {
      await chapterElements.first().click();
      await page.waitForTimeout(2000);
    }
  }

  // Now look for reader interface
  await page.screenshot({ path: 'before-reader-search.png', fullPage: true });

  // Try to find Enhanced Reader button
  const readerBtn = page.locator('button').filter({ hasText: 'Enhanced Reader' }).first();
  if (await readerBtn.isVisible()) {
    console.log('✅ Found Enhanced Reader button');
    await readerBtn.click();
    await page.waitForTimeout(3000);
  } else {
    // Try alternative reader buttons
    const readerAlternatives = [
      page.locator('button').filter({ hasText: 'Reader' }),
      page.locator('button').filter({ hasText: 'Open Reader' }),
      page.locator('.reader-button'),
      page.locator('.reader-tab')
    ];
    
    for (const element of readerAlternatives) {
      if (await element.first().isVisible()) {
        await element.first().click();
        await page.waitForTimeout(2000);
        break;
      }
    }
  }

  // Take screenshot of reader interface
  await page.screenshot({ path: 'reader-interface-found.png', fullPage: true });

  // Look for AI Guru interface with various selectors
  const aiGuruSelectors = [
    page.locator('button').filter({ hasText: 'AI Guru' }),
    page.locator('.ai-guru-tab'),
    page.locator('.ai-guru-button'),
    page.locator('[data-testid*="ai-guru"]'),
    page.locator('.tab').filter({ hasText: 'AI Guru' })
  ];

  let aiGuruFound = false;
  for (const selector of aiGuruSelectors) {
    if (await selector.first().isVisible()) {
      console.log('✅ Found AI Guru interface');
      await selector.first().click();
      await page.waitForTimeout(2000);
      aiGuruFound = true;
      break;
    }
  }

  if (!aiGuruFound) {
    console.log('❌ AI Guru not found. Listing available buttons:');
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    for (let i = 0; i < Math.min(buttonCount, 15); i++) {
      const buttonText = await allButtons.nth(i).textContent();
      if (buttonText && buttonText.trim()) {
        console.log(`Button ${i}: "${buttonText.trim()}"`);
      }
    }
  } else {
    console.log('✅ AI Guru interface opened, testing streaming...');
    
    // Take screenshot of AI Guru modal
    await page.screenshot({ path: 'ai-guru-modal-opened.png', fullPage: true });
    
    // Look for input field
    const inputField = page.locator('textarea, input[type="text"]').last();
    if (await inputField.isVisible()) {
      console.log('✅ Found input field');
      
      // Type a test question
      await inputField.fill('Explain Newton\'s first law of motion');
      
      // Find and click send button
      const sendBtn = page.locator('button').filter({ hasText: /Send|Submit/ }).last();
      if (await sendBtn.isVisible()) {
        console.log('✅ Sending message...');
        await sendBtn.click();
        
        // Check for thinking animation immediately
        await page.waitForTimeout(500);
        const thinkingElements = page.locator('.thinking-animation, .loading-animation, .ai-thinking');
        const isThinking = await thinkingElements.first().isVisible();
        console.log(`Thinking animation visible: ${isThinking}`);
        
        // Take screenshot during thinking
        await page.screenshot({ path: 'thinking-phase.png', fullPage: true });
        
        // Wait for response to start streaming
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'streaming-phase.png', fullPage: true });
        
        // Wait for complete response
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'final-response.png', fullPage: true });
        
        // Check if response text is visible
        const responseArea = page.locator('.message-content, .ai-response, .response-text').last();
        const hasResponse = await responseArea.isVisible();
        console.log(`Response area visible: ${hasResponse}`);
        
        if (hasResponse) {
          const responseText = await responseArea.textContent();
          console.log(`Response length: ${responseText?.length || 0} characters`);
          console.log(`Response preview: ${responseText?.substring(0, 100)}...`);
        }
        
        console.log('✅ Streaming test completed successfully');
      } else {
        console.log('❌ Send button not found');
      }
    } else {
      console.log('❌ Input field not found');
    }
  }
});
