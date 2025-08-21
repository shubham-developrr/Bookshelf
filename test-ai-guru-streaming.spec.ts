import { test, expect } from '@playwright/test';

test('Navigate to AI Guru and test streaming', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Take screenshot of current page
  await page.screenshot({ path: 'bookshelf-page.png', fullPage: true });

  // Look for "Your Shelf" or any books section
  const yourShelf = page.locator('text=Your Shelf, .shelf-section, .books-section').first();
  if (await yourShelf.isVisible()) {
    console.log('✅ Found Your Shelf section');
    await yourShelf.click();
    await page.waitForTimeout(2000);
  }

  // Check if there are any existing books
  const bookCards = page.locator('.book-card, .subject-card, [data-testid="book-card"]');
  const bookCount = await bookCards.count();
  console.log(`Found ${bookCount} books in shelf`);

  if (bookCount > 0) {
    // Click on the first book
    await bookCards.first().click();
    await page.waitForTimeout(2000);
    
    // Look for chapters or content
    const chapters = page.locator('.chapter-item, .chapter-card, text=Chapter');
    const chapterCount = await chapters.count();
    console.log(`Found ${chapterCount} chapters`);
    
    if (chapterCount > 0) {
      await chapters.first().click();
      await page.waitForTimeout(2000);
    }
  } else {
    // No books found, let's create a test book
    console.log('No books found, looking for create book option');
    
    const createBook = page.locator('button:has-text("Create Book"), text=Create Book, .create-book-btn').first();
    if (await createBook.isVisible()) {
      await createBook.click();
      await page.waitForTimeout(1000);
      
      // Fill in book details
      const titleInput = page.locator('input[placeholder*="title"], input[name="title"], input').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Physics Book');
        
        const createBtn = page.locator('button:has-text("Create"), button[type="submit"]').first();
        if (await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  }

  // Now look for Enhanced Reader or AI Guru
  await page.screenshot({ path: 'after-navigation.png', fullPage: true });

  // Try to find Enhanced Reader button
  let readerButton = page.locator('button:has-text("Enhanced Reader"), .enhanced-reader-btn, .reader-button').first();
  if (await readerButton.isVisible()) {
    console.log('✅ Found Enhanced Reader button');
    await readerButton.click();
    await page.waitForTimeout(3000);
  } else {
    // Try alternative navigation
    const readerTab = page.locator('text=Reader, .reader-tab, .tab:has-text("Reader")').first();
    if (await readerTab.isVisible()) {
      await readerTab.click();
      await page.waitForTimeout(2000);
    }
  }

  // Take screenshot of reader page
  await page.screenshot({ path: 'reader-interface.png', fullPage: true });

  // Look for AI Guru interface
  const aiGuruElements = [
    'button:has-text("AI Guru")',
    '.ai-guru-tab',
    '.ai-guru-button',
    'text=AI Guru',
    '[data-testid="ai-guru"]',
    '.tab:has-text("AI Guru")'
  ];

  let aiGuruFound = false;
  for (const selector of aiGuruElements) {
    const element = page.locator(selector).first();
    if (await element.isVisible()) {
      console.log(`✅ Found AI Guru with selector: ${selector}`);
      await element.click();
      await page.waitForTimeout(2000);
      aiGuruFound = true;
      break;
    }
  }

  if (!aiGuruFound) {
    console.log('❌ AI Guru interface not found. Available elements:');
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const buttonText = await allButtons.nth(i).textContent();
      console.log(`Button ${i}: "${buttonText}"`);
    }
    
    const allTabs = page.locator('.tab, [role="tab"]');
    const tabCount = await allTabs.count();
    for (let i = 0; i < tabCount; i++) {
      const tabText = await allTabs.nth(i).textContent();
      console.log(`Tab ${i}: "${tabText}"`);
    }
  } else {
    // AI Guru is open, take screenshot
    await page.screenshot({ path: 'ai-guru-interface.png', fullPage: true });
    
    // Look for input field and test streaming
    const inputField = page.locator('textarea, input[type="text"]').last();
    if (await inputField.isVisible()) {
      console.log('✅ Found input field, testing streaming response');
      
      // Type a test question
      await inputField.fill('What is thermodynamics?');
      
      // Find send button
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"], .send-button').last();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        
        // Wait for thinking animation
        console.log('Waiting for thinking animation...');
        await page.waitForTimeout(1000);
        
        // Take screenshot during processing
        await page.screenshot({ path: 'thinking-animation.png', fullPage: true });
        
        // Wait for response
        await page.waitForTimeout(8000);
        
        // Take screenshot of response
        await page.screenshot({ path: 'streaming-response.png', fullPage: true });
        
        console.log('✅ Streaming test completed');
      }
    }
  }
});
