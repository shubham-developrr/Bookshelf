import { test, expect } from '@playwright/test';

test('Check app accessibility and streaming setup', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5174');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot to see current state
  await page.screenshot({ path: 'app-current-state.png', fullPage: true });

  // Check if app loaded properly
  const appContainer = page.locator('body');
  await expect(appContainer).toBeVisible();

  // Look for any subjects or navigation elements
  const subjects = await page.locator('text=Mechanical Engineering, text=Computer Science, text=Mathematics, .subject-card, .book-card').count();
  console.log(`Found ${subjects} subjects/books on the page`);

  // If no subjects found, check if we're on a different page
  if (subjects === 0) {
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 500));
    
    // Look for any buttons or navigation
    const buttons = await page.locator('button').count();
    console.log(`Found ${buttons} buttons on the page`);
    
    const links = await page.locator('a').count();
    console.log(`Found ${links} links on the page`);
  }

  // Try to manually navigate to a subject if available
  const mechanicalEngineering = page.locator('text=Mechanical Engineering').first();
  if (await mechanicalEngineering.isVisible()) {
    console.log('✅ Found Mechanical Engineering subject');
    await mechanicalEngineering.click();
    await page.waitForTimeout(2000);
    
    // Look for chapters
    const thermodynamics = page.locator('text=Thermodynamics').first();
    if (await thermodynamics.isVisible()) {
      console.log('✅ Found Thermodynamics chapter');
      await thermodynamics.click();
      await page.waitForTimeout(2000);
      
      // Look for Enhanced Reader button
      const readerButton = page.locator('button:has-text("Enhanced Reader")').first();
      if (await readerButton.isVisible()) {
        console.log('✅ Found Enhanced Reader button');
        await readerButton.click();
        await page.waitForTimeout(3000);
        
        // Take screenshot of reader page
        await page.screenshot({ path: 'reader-page-state.png', fullPage: true });
        
        // Look for AI Guru
        const aiGuru = page.locator('button:has-text("AI Guru"), .ai-guru-tab, [data-testid="ai-guru"]').first();
        if (await aiGuru.isVisible()) {
          console.log('✅ Found AI Guru interface');
          await aiGuru.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot of AI Guru modal
          await page.screenshot({ path: 'ai-guru-modal-state.png', fullPage: true });
          
          console.log('✅ Successfully navigated to AI Guru - ready for streaming test');
        } else {
          console.log('❌ AI Guru interface not found');
        }
      } else {
        console.log('❌ Enhanced Reader button not found');
      }
    } else {
      console.log('❌ Thermodynamics chapter not found');
    }
  } else {
    console.log('❌ Mechanical Engineering subject not found');
  }
});
