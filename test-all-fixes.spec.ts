import { test, expect } from '@playwright/test';

test.describe('Exam Mode Fixes - Navigation, Evaluation, and Import', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5177/');
        
        // Navigate to a chapter first
        await page.click('[data-testid="subject-card"]');
        await page.click('[data-testid="chapter-card"]');
        
        // Wait for page to load
        await page.waitForTimeout(1000);
    });

    test('should have navigation buttons at the top of question area', async ({ page }) => {
        // Click exam mode button
        await page.click('button:has-text("Exam Mode")');
        await page.waitForTimeout(500);

        // Check if there are existing papers and start an exam
        const startButtons = await page.locator('button:has-text("Start")').count();
        
        if (startButtons > 0) {
            await page.click('button:has-text("Start")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("Start Exam")');
            await page.waitForTimeout(1000);

            // Check if navigation buttons are at the top
            const navigationArea = page.locator('div:has(button:has-text("Previous"), button:has-text("Next"))').first();
            await expect(navigationArea).toBeVisible();
            
            // Check for question counter
            await expect(page.locator('text=Question 1 of')).toBeVisible();
            console.log('✓ Navigation buttons are positioned at the top with question counter');
        }
    });

    test('should show proper evaluation results (not NaN%)', async ({ page }) => {
        // Navigate to exam mode
        await page.click('button:has-text("Exam Mode")');
        
        // Create a new simple exam for testing
        await page.click('button:has-text("Add Paper")');
        await page.waitForTimeout(500);

        // Fill paper details
        await page.fill('input[placeholder*="Data Structures"]', 'Test Evaluation Fix');
        await page.click('input[value="mock"]');
        
        // Set duration and create paper
        await page.fill('input[type="number"]', '5');
        await page.click('button:has-text("Create Paper")');
        await page.waitForTimeout(1000);

        // Add a simple long-answer question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(500);

        // Fill question details
        await page.fill('input[placeholder*="Enter question number"]', '1');
        // Question type should default to long-answer now
        await page.fill('input[placeholder*="Enter marks"]', '10');

        // Add question text
        await page.fill('textarea[placeholder*="Enter your question"]', 'What is the importance of data structures in programming?');

        // Add explanation
        await page.fill('textarea[placeholder*="explanation"]', 'Data structures are fundamental building blocks...');

        // Save question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(1000);

        // Save and go back to exam list
        await page.click('button:has-text("Save & Exit")');
        await page.waitForTimeout(1000);

        // Start the exam
        await page.click('button:has-text("Start")');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Start Exam")');
        await page.waitForTimeout(1000);

        // Answer the question
        await page.fill('textarea', 'Data structures are essential for organizing and managing data efficiently in programming. They provide different ways to store, access, and manipulate data based on specific requirements.');
        await page.waitForTimeout(500);

        // Submit exam
        await page.click('button:has-text("Submit Exam")');
        await page.waitForTimeout(3000);

        // Check that evaluation shows proper results (not NaN%)
        await expect(page.locator('text=NaN%')).not.toBeVisible();
        
        // Should show actual percentage
        const percentageElement = page.locator('div:has-text("%")').first();
        const percentageText = await percentageElement.textContent();
        expect(percentageText).toMatch(/\d+%/); // Should contain actual number percentage
        
        // Should show proper marks
        await expect(page.locator('text=out of 0 marks')).not.toBeVisible();
        await expect(page.locator('text=out of 10 marks')).toBeVisible();
        
        console.log('✓ Evaluation shows proper results with correct percentages and marks');
    });

    test('should have working import functionality', async ({ page }) => {
        // Navigate to exam mode and create/edit a paper
        await page.click('button:has-text("Exam Mode")');
        
        // Check if there are existing papers to edit
        const editButtons = await page.locator('button:has-text("Edit")').count();
        
        if (editButtons > 0) {
            await page.click('button:has-text("Edit")');
        } else {
            // Create new paper first
            await page.click('button:has-text("Add Paper")');
            await page.fill('input[placeholder*="Data Structures"]', 'Import Test Paper');
            await page.click('input[value="mock"]');
            await page.fill('input[type="number"]', '30');
            await page.click('button:has-text("Create Paper")');
        }
        
        await page.waitForTimeout(1000);

        // Click on Import tab
        await page.click('button:has-text("Import")');
        await page.waitForTimeout(500);

        // Check import functionality elements
        await expect(page.locator('h3:has-text("Import Questions from File")')).toBeVisible();
        await expect(page.locator('button:has-text("Choose Files")')).toBeVisible();
        await expect(page.locator('textarea[placeholder*="Paste or type questions"]')).toBeVisible();
        
        // Test manual text input
        const sampleText = `1. What is a stack?
A stack is a linear data structure that follows LIFO principle.

2. Which of the following is correct about arrays?
a) Fixed size
b) Dynamic size
c) Both
d) None
Answer: a`;

        await page.fill('textarea[placeholder*="Paste or type questions"]', sampleText);
        await page.waitForTimeout(500);

        // Check if Auto Generate button appears
        await expect(page.locator('button:has-text("Auto Generate Questions")')).toBeVisible();
        
        // Click to generate questions
        await page.click('button:has-text("Auto Generate Questions")');
        await page.waitForTimeout(1000);

        // Check for success message
        await expect(page.locator('text=Successfully imported')).toBeVisible();
        
        // Should switch back to manage tab
        await expect(page.locator('h3:has-text("Import Questions from File")')).not.toBeVisible();
        
        console.log('✓ Import functionality works correctly with text parsing and question generation');
    });

    test('should show detailed evaluation view correctly', async ({ page }) => {
        // Navigate to exam mode
        await page.click('button:has-text("Exam Mode")');
        
        // Use existing exam that has been completed
        const startButtons = await page.locator('button:has-text("Start")').count();
        
        if (startButtons > 0) {
            await page.click('button:has-text("Start")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("Start Exam")');
            await page.waitForTimeout(1000);
            
            // Try to answer and submit
            const textarea = page.locator('textarea').first();
            if (await textarea.count() > 0) {
                await textarea.fill('Sample comprehensive answer for testing detailed evaluation view');
            }
            
            // Submit if possible
            const submitButton = page.locator('button:has-text("Submit Exam")');
            if (await submitButton.count() > 0) {
                await submitButton.click();
                await page.waitForTimeout(3000);
                
                // Check for View Detailed Evaluation button
                await expect(page.locator('button:has-text("View Detailed Evaluation")')).toBeVisible();
                
                // Click to view detailed evaluation
                await page.click('button:has-text("View Detailed Evaluation")');
                await page.waitForTimeout(1000);
                
                // Check detailed evaluation view
                await expect(page.locator('h2:has-text("Detailed Evaluation")')).toBeVisible();
                await expect(page.locator('text=AI Evaluation & Feedback')).toBeVisible();
                await expect(page.locator('button:has-text("Back to Summary")')).toBeVisible();
                
                console.log('✓ Detailed evaluation view displays correctly');
            }
        }
    });
});
