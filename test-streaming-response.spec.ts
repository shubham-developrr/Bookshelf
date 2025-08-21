import { test, expect } from '@playwright/test';

test('AI Guru streaming response functionality', async ({ page }) => {
  // Set viewport for mobile testing
  await page.setViewportSize({ width: 375, height: 667 });

  // Go to the app
  await page.goto('http://localhost:5174');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Navigate to a subject (Mechanical Engineering)
  await page.click('text=Mechanical Engineering');
  await page.waitForTimeout(1000);

  // Navigate to a chapter
  await page.click('text=Thermodynamics');
  await page.waitForTimeout(1000);

  // Go to Enhanced Reader
  await page.click('button:has-text("Enhanced Reader")');
  await page.waitForTimeout(2000);

  // Open AI Guru by clicking the AI Guru tab or button
  const aiGuruButton = page.locator('button:has-text("AI Guru"), .ai-guru-tab, [data-testid="ai-guru-button"]').first();
  if (await aiGuruButton.isVisible()) {
    await aiGuruButton.click();
  } else {
    // Try alternative selectors
    await page.click('text=AI Guru');
  }

  await page.waitForTimeout(1000);

  // Look for AI Guru modal or interface
  const modal = page.locator('.ai-guru-modal, .enhanced-ai-modal, [data-testid="ai-guru-modal"]');
  await expect(modal).toBeVisible();

  // Type a question
  const inputField = page.locator('textarea, input[type="text"]').last();
  await inputField.fill('Explain the first law of thermodynamics');

  // Send the message
  const sendButton = page.locator('button:has-text("Send"), button[type="submit"], .send-button').last();
  await sendButton.click();

  // Check for thinking animation
  console.log('Checking for thinking animation...');
  const thinkingAnimation = page.locator('.thinking-animation, .loading-animation, .ai-thinking');
  await expect(thinkingAnimation).toBeVisible({ timeout: 2000 });

  // Wait for streaming to start
  await page.waitForTimeout(3000);

  // Check if streaming text appears
  console.log('Checking for streaming response...');
  const responseArea = page.locator('.message-content, .ai-response, .response-text').last();
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'streaming-test-debug.png', fullPage: true });

  // Wait for response to complete
  await page.waitForTimeout(10000);

  // Verify response appears
  await expect(responseArea).toContainText('thermodynamics', { timeout: 15000 });

  // Check that thinking animation is hidden when streaming starts
  await expect(thinkingAnimation).toBeHidden({ timeout: 2000 });

  console.log('✅ Streaming response test completed');
});

test('Fast mode toggle functionality', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Navigate to Enhanced Reader
  await page.click('text=Mechanical Engineering');
  await page.waitForTimeout(1000);
  await page.click('text=Thermodynamics');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Enhanced Reader")');
  await page.waitForTimeout(2000);

  // Open AI Guru
  const aiGuruButton = page.locator('button:has-text("AI Guru"), .ai-guru-tab').first();
  await aiGuruButton.click();
  await page.waitForTimeout(1000);

  // Look for fast mode toggle
  const fastModeToggle = page.locator('input[type="checkbox"], .toggle-switch, .fast-mode-toggle');
  
  if (await fastModeToggle.isVisible()) {
    // Test toggle functionality
    const initialState = await fastModeToggle.isChecked();
    
    // Toggle fast mode
    await fastModeToggle.click();
    await page.waitForTimeout(500);
    
    const newState = await fastModeToggle.isChecked();
    expect(newState).toBe(!initialState);
    
    console.log(`✅ Fast mode toggle works: ${initialState} → ${newState}`);
  } else {
    console.log('⚠️ Fast mode toggle not found');
  }

  // Take screenshot
  await page.screenshot({ path: 'fast-mode-toggle-test.png', fullPage: true });
});
