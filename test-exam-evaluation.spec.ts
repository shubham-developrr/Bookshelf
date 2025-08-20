import { test, expect } from '@playwright/test';

test('exam evaluation with proper score parsing', async ({ page }) => {
  await page.goto('http://localhost:5177');
  
  // Navigate to create a test exam
  await page.click('text=Create New Book');
  await page.fill('input[placeholder*="title"]', 'Test Book For Evaluation');
  await page.click('button:has-text("Create Book")');
  
  // Add a chapter
  await page.click('button:has-text("Add Chapter")');
  await page.fill('input[placeholder*="chapter"]', 'Test Chapter');
  await page.click('button:has-text("Add Chapter")');
  
  // Click on the chapter to enter it
  await page.click('text=Test Chapter');
  
  // Switch to exam mode
  await page.click('button:has-text("Exam Mode")');
  
  // Create a test question paper
  await page.click('button:has-text("Create New")');
  await page.fill('input[placeholder*="title"]', 'Score Parsing Test');
  await page.click('button:has-text("Create")');
  
  // Add a long answer question
  await page.click('button:has-text("Add Question")');
  await page.selectOption('select', 'long-answer');
  await page.fill('textarea[placeholder*="question"]', 'what is mango');
  await page.fill('textarea[placeholder*="explanation"]', 'a fruit');
  await page.fill('input[type="number"]', '10');
  await page.click('button:has-text("Add Question")');
  
  // Take the exam
  await page.click('button:has-text("Take Exam")');
  
  // Answer the question
  await page.fill('textarea', 'a fruit');
  
  // Submit the exam
  await page.click('button:has-text("Submit Exam")');
  
  // Wait for evaluation to complete
  await page.waitForSelector('text=0/10', { timeout: 30000 });
  
  // Check if we can see the evaluation feedback
  await page.click('text=View Details');
  
  // The page should show detailed feedback
  await expect(page.locator('text=SCORE:')).toBeVisible({ timeout: 10000 });
  
  console.log('✅ Exam evaluation test completed - checking score parsing');
});
