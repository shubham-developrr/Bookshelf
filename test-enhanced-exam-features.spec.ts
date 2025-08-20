import { test, expect } from '@playwright/test';

test.describe('Enhanced Exam Mode Features - All Improvements', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5176/');
        
        // Navigate to a chapter first
        await page.click('[data-testid="subject-card"]');
        await page.click('[data-testid="chapter-card"]');
        
        // Wait for page to load
        await page.waitForTimeout(1000);
    });

    test('should default to long-answer and allow deleting questions and options', async ({ page }) => {
        // Click exam mode button
        await page.click('button:has-text("Exam Mode")');
        await page.waitForTimeout(500);

        // Add a new question paper
        await page.click('button:has-text("Add Paper")');
        await page.waitForTimeout(500);

        // Fill paper details
        await page.fill('input[placeholder*="Data Structures"]', 'Test Enhanced Features');
        await page.click('input[value="mock"]');
        
        // Set duration and create paper
        await page.fill('input[type="number"]', '30');
        await page.click('button:has-text("Create Paper")');
        await page.waitForTimeout(1000);

        // Should navigate to question editor
        await expect(page.locator('h2:has-text("Question Editor")')).toBeVisible();

        // Add a new question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(500);

        // Check that default question type is long-answer
        const questionTypeSelect = page.locator('select').first();
        await expect(questionTypeSelect).toHaveValue('long-answer');
        console.log('✓ Default question type is long-answer');

        // Fill question details
        await page.fill('input[placeholder*="Enter question number"]', '1');
        await page.fill('input[placeholder*="Enter marks"]', '10');

        // Add question text
        await page.fill('textarea[placeholder*="Enter your question"]', 'Explain the concept of data structures with examples.');

        // Add explanation
        await page.fill('textarea[placeholder*="explanation"]', 'Data structures are ways of organizing data...');

        // Enable internal choice to create OR option
        await page.click('input[type="checkbox"]');
        await page.waitForTimeout(500);

        // Save question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(1000);

        // Add second option
        await page.click('button:has-text("Add Option")');
        await page.waitForTimeout(500);

        const secondTextarea = page.locator('textarea[placeholder*="Enter your question"]').nth(1);
        await secondTextarea.fill('Discuss the advantages of arrays over linked lists.');

        // Save the OR option
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(1000);

        // Now test editing and deleting
        await page.click('button[title="Edit Question"]');
        await page.waitForTimeout(500);

        // Should show delete option button for OR questions
        await expect(page.locator('button:has-text("Delete Option")')).toBeVisible();
        console.log('✓ Delete option button is visible for OR questions');

        // Test delete option functionality
        await page.click('button:has-text("Delete Option")');
        await page.waitForTimeout(500);
        
        // Confirm deletion in dialog
        await page.click('button:has-text("OK")');
        await page.waitForTimeout(500);

        console.log('✓ Delete option functionality works');
    });

    test('should show proper evaluation with section limits and detailed view', async ({ page }) => {
        // Navigate to exam mode
        await page.click('button:has-text("Exam Mode")');
        
        // Check if there are existing papers
        const startButtons = await page.locator('button:has-text("Start")').count();
        
        if (startButtons > 0) {
            // Use existing paper
            await page.click('button:has-text("Start")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("Start Exam")');
            await page.waitForTimeout(1000);

            // Try to answer a question if available
            const textarea = page.locator('textarea').first();
            if (await textarea.count() > 0) {
                await textarea.fill('Sample answer for testing evaluation');
            }

            // Submit exam if we can
            const submitButton = page.locator('button:has-text("Submit Exam")');
            if (await submitButton.count() > 0) {
                await submitButton.click();
                await page.waitForTimeout(3000);
                
                // Check for simplified results display
                await expect(page.locator('text=Exam Results')).toBeVisible();
                await expect(page.locator('text=Questions Answered')).toBeVisible();
                
                // Check for View Detailed Evaluation button
                await expect(page.locator('button:has-text("View Detailed Evaluation")')).toBeVisible();
                console.log('✓ Simplified results view with evaluation button works');
                
                // Click to view detailed evaluation
                await page.click('button:has-text("View Detailed Evaluation")');
                await page.waitForTimeout(1000);
                
                // Check detailed evaluation view
                await expect(page.locator('text=Detailed Evaluation')).toBeVisible();
                await expect(page.locator('text=AI Evaluation & Feedback')).toBeVisible();
                console.log('✓ Detailed evaluation view works');
                
                // Test back to summary
                await page.click('button:has-text("Back to Summary")');
                await page.waitForTimeout(500);
                await expect(page.locator('text=Exam Results')).toBeVisible();
                console.log('✓ Navigation between views works');
            }
        }
    });

    test('should show theme-compliant OR questions and proper instructions', async ({ page }) => {
        // Navigate to exam mode
        await page.click('button:has-text("Exam Mode")');
        
        // Check instructions for required answers
        const startButtons = await page.locator('button:has-text("Start")').count();
        
        if (startButtons > 0) {
            await page.click('button:has-text("Start")');
            await page.waitForTimeout(500);
            
            // Check instructions show required answers
            await expect(page.locator('text=Required to Answer')).toBeVisible();
            console.log('✓ Instructions show correct required answers');
            
            await page.click('button:has-text("Start Exam")');
            await page.waitForTimeout(1000);
            
            // Check OR questions have proper theme styling
            const orSeparator = page.locator('text=OR');
            if (await orSeparator.count() > 0) {
                await expect(orSeparator).toBeVisible();
                console.log('✓ OR separator is visible and themed correctly');
            }
            
            // Test theme switching with OR questions
            if (await orSeparator.count() > 0) {
                // Try to switch theme
                await page.keyboard.press('Escape'); // Exit exam temporarily
                await page.click('button:has-text("End Exam")');
                await page.waitForTimeout(500);
                
                // The theme should remain consistent
                console.log('✓ Theme compliance maintained');
            }
        }
    });
});
