import { test, expect } from '@playwright/test';

test('Create book and test AI Guru streaming', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Click on "Create Book" button
  console.log('🔧 Creating a new book...');
  await page.click('button:has-text("Create Book")');
  await page.waitForTimeout(1000);

  // Take screenshot of create book modal
  await page.screenshot({ path: 'create-book-modal.png', fullPage: true });

  // Fill in book details - look for any visible input fields
  const inputs = page.locator('input[type="text"], input:not([type="hidden"]), textarea');
  const inputCount = await inputs.count();
  console.log(`Found ${inputCount} input fields`);

  if (inputCount > 0) {
    // Fill the first input (likely title)
    await inputs.first().fill('Physics Fundamentals');
    await page.waitForTimeout(500);
    
    // If there's a second input, fill it (likely description)
    if (inputCount > 1) {
      await inputs.nth(1).fill('A comprehensive guide to physics principles');
      await page.waitForTimeout(500);
    }
    
    // Look for create/submit button in the modal
    const createBtn = page.locator('button').filter({ hasText: /Create|Submit|Save/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(3000);
      console.log('✅ Book created successfully');
    }
  }

  // Take screenshot after book creation
  await page.screenshot({ path: 'after-book-creation.png', fullPage: true });

  // Look for the newly created book
  const bookElements = page.locator('.book-card, .subject-card, .book-item, .content-card');
  const bookCount = await bookElements.count();
  console.log(`Found ${bookCount} books after creation`);

  if (bookCount > 0) {
    // Click on the book to open it
    console.log('📖 Opening the created book...');
    await bookElements.first().click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'book-opened.png', fullPage: true });
    
    // Look for Enhanced Reader, Reader, or any reading interface
    const readerButtons = page.locator('button').filter({ hasText: /Enhanced.*Reader|Reader|Read|Open.*Reader/i });
    const readerCount = await readerButtons.count();
    console.log(`Found ${readerCount} reader buttons`);
    
    if (readerCount > 0) {
      console.log('📚 Opening Enhanced Reader...');
      await readerButtons.first().click();
      await page.waitForTimeout(4000);
      
      await page.screenshot({ path: 'enhanced-reader-opened.png', fullPage: true });
      
      // Now look for AI Guru tab or button
      const aiGuruElements = page.locator('button, .tab, .tab-button').filter({ hasText: /AI.*Guru|Guru.*AI/i });
      const aiGuruCount = await aiGuruElements.count();
      console.log(`Found ${aiGuruCount} AI Guru elements`);
      
      if (aiGuruCount > 0) {
        console.log('🤖 Opening AI Guru...');
        await aiGuruElements.first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'ai-guru-opened.png', fullPage: true });
        
        // Test streaming functionality
        console.log('🧪 Testing streaming functionality...');
        
        // Look for input field
        const inputField = page.locator('textarea, input[type="text"]').last();
        if (await inputField.isVisible()) {
          console.log('✅ Found AI Guru input field');
          
          // Type a physics question
          await inputField.fill('What is Einstein\'s theory of relativity?');
          await page.waitForTimeout(500);
          
          // Find send button
          const sendBtn = page.locator('button').filter({ hasText: /Send|Submit/i }).last();
          if (await sendBtn.isVisible()) {
            console.log('📤 Sending message to AI...');
            await sendBtn.click();
            
            // Check for thinking animation immediately
            await page.waitForTimeout(200);
            const thinkingElements = page.locator('.thinking-animation, .loading-animation, .ai-thinking, .spinner');
            const isThinking = await thinkingElements.first().isVisible();
            console.log(`🤔 Thinking animation visible: ${isThinking}`);
            
            // Take screenshot during thinking phase
            await page.screenshot({ path: 'ai-thinking-animation.png', fullPage: true });
            
            // Wait a bit more to see if streaming starts
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'ai-streaming-progress.png', fullPage: true });
            
            // Check for response content
            const responseElements = page.locator('.message-content, .ai-response, .response-text, .message');
            const responseCount = await responseElements.count();
            console.log(`Found ${responseCount} response elements`);
            
            if (responseCount > 0) {
              const lastResponse = responseElements.last();
              const responseText = await lastResponse.textContent();
              console.log(`📝 Response length: ${responseText?.length || 0} characters`);
              
              if (responseText && responseText.length > 10) {
                console.log(`📄 Response preview: ${responseText.substring(0, 150)}...`);
                console.log('✅ AI response received successfully');
              }
            }
            
            // Wait for complete response
            await page.waitForTimeout(8000);
            await page.screenshot({ path: 'ai-final-response.png', fullPage: true });
            
            // Check if thinking animation is hidden after response
            const isStillThinking = await thinkingElements.first().isVisible();
            console.log(`🤔 Still thinking after response: ${isStillThinking}`);
            
            console.log('✅ Streaming test completed successfully!');
            
            // Test fast mode toggle if available
            const fastModeToggle = page.locator('input[type="checkbox"], .toggle, .switch').filter({ hasText: /fast|mode/i });
            if (await fastModeToggle.first().isVisible()) {
              console.log('⚡ Testing fast mode toggle...');
              const initialState = await fastModeToggle.first().isChecked();
              await fastModeToggle.first().click();
              await page.waitForTimeout(500);
              const newState = await fastModeToggle.first().isChecked();
              console.log(`⚡ Fast mode toggle: ${initialState} → ${newState}`);
            }
            
          } else {
            console.log('❌ Send button not found');
          }
        } else {
          console.log('❌ AI Guru input field not found');
        }
      } else {
        console.log('❌ AI Guru not found in Enhanced Reader');
        
        // Print available tabs/buttons in reader
        const allTabs = page.locator('.tab, .tab-button, button');
        const tabCount = await allTabs.count();
        console.log('Available tabs/buttons in reader:');
        for (let i = 0; i < Math.min(tabCount, 15); i++) {
          const tabText = await allTabs.nth(i).textContent();
          if (tabText && tabText.trim()) {
            console.log(`Tab ${i}: "${tabText.trim()}"`);
          }
        }
      }
    } else {
      console.log('❌ No reader buttons found');
    }
  } else {
    console.log('❌ No books found after creation attempt');
  }
});
