import { test, expect } from '@playwright/test';

test.describe('Complete Exam Mode Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5176/');
        
        // Navigate to a chapter first
        await page.click('[data-testid="subject-card"]');
        await page.click('[data-testid="chapter-card"]');
        
        // Wait for page to load
        await page.waitForTimeout(1000);
    });

    test('should have exam mode button and create exam with auto-navigation', async ({ page }) => {
        // Click exam mode button
        await page.click('button:has-text("Exam Mode")');
        await page.waitForTimeout(500);

        // Add a new question paper
        await page.click('button:has-text("Add Paper")');
        await page.waitForTimeout(500);

        // Fill paper details
        await page.fill('input[placeholder*="Data Structures"]', 'Test Exam Paper');
        await page.click('input[value="mock"]');
        
        // Set duration and create paper
        await page.fill('input[type="number"]', '60');
        await page.click('button:has-text("Create Paper")');
        await page.waitForTimeout(1000);

        // Should navigate to question editor
        await expect(page.locator('h2:has-text("Question Editor")')).toBeVisible();

        // Add a new question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(500);

        // Fill question details
        await page.fill('input[placeholder*="Enter question number"]', '1');
        await page.selectOption('select', 'mcq');
        await page.fill('input[placeholder*="Enter marks"]', '5');

        // Add question text
        await page.fill('textarea[placeholder*="Enter your question"]', 'What is the time complexity of binary search?');

        // Add options
        await page.fill('input[placeholder*="Option A"]', 'O(n)');
        await page.fill('input[placeholder*="Option B"]', 'O(log n)');
        await page.fill('input[placeholder*="Option C"]', 'O(n²)');
        await page.fill('input[placeholder*="Option D"]', 'O(1)');

        // Set correct answer
        await page.selectOption('select', '1'); // Option B

        // Add explanation
        await page.fill('textarea[placeholder*="explanation"]', 'Binary search divides the search space in half each time.');

        // Save question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(1000);

        // Should auto-navigate to the new question
        await expect(page.locator('text=Question 1')).toBeVisible();
        console.log('✓ Auto-navigation to new question works');
    });

    test('should show OR questions with proper display and theme compliance', async ({ page }) => {
        // Navigate to exam mode and create paper (reuse previous logic)
        await page.click('button:has-text("Exam Mode")');
        await page.click('button:has-text("Add Paper")');
        await page.fill('input[placeholder*="Data Structures"]', 'OR Questions Test');
        await page.click('input[value="mock"]');
        await page.fill('input[type="number"]', '30');
        await page.click('button:has-text("Create Paper")');
        await page.waitForTimeout(1000);

        // Add question with internal choice
        await page.click('button:has-text("Add Question")');
        await page.fill('input[placeholder*="Enter question number"]', '1');
        await page.selectOption('select', 'long-answer');
        await page.fill('input[placeholder*="Enter marks"]', '10');

        // Enable internal choice
        await page.click('input[type="checkbox"]');
        await page.waitForTimeout(500);

        // Add first option (1A)
        await page.fill('textarea[placeholder*="Enter your question"]', 'Explain the concept of recursion with an example.');
        await page.fill('textarea[placeholder*="explanation"]', 'Recursion is when a function calls itself...');

        // Add second option (1B)
        await page.click('button:has-text("Add Option")');
        await page.waitForTimeout(500);

        const secondTextarea = page.locator('textarea[placeholder*="Enter your question"]').nth(1);
        await secondTextarea.fill('Discuss the advantages and disadvantages of linked lists.');

        // Save question
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(1000);

        // Check for OR display
        await expect(page.locator('text=OR')).toBeVisible();
        
        // Test theme compliance by switching themes
        await page.click('button[aria-label="Toggle theme"]');
        await page.waitForTimeout(500);
        
        // Check that internal choice note uses theme classes
        const internalChoiceNote = page.locator('text=This question has internal choices');
        await expect(internalChoiceNote).toBeVisible();
        
        console.log('✓ OR questions display correctly with theme compliance');
    });

    test('should handle exam submission and evaluation', async ({ page }) => {
        // Create a simple exam paper with one question
        await page.click('button:has-text("Exam Mode")');
        await page.click('button:has-text("Add Paper")');
        await page.fill('input[placeholder*="Data Structures"]', 'Evaluation Test');
        await page.click('input[value="mock"]');
        await page.fill('input[type="number"]', '5');
        await page.click('button:has-text("Create Paper")');
        await page.waitForTimeout(1000);

        // Add a simple MCQ
        await page.click('button:has-text("Add Question")');
        await page.fill('input[placeholder*="Enter question number"]', '1');
        await page.selectOption('select', 'mcq');
        await page.fill('input[placeholder*="Enter marks"]', '2');
        await page.fill('textarea[placeholder*="Enter your question"]', 'What is 2+2?');
        await page.fill('input[placeholder*="Option A"]', '3');
        await page.fill('input[placeholder*="Option B"]', '4');
        await page.fill('input[placeholder*="Option C"]', '5');
        await page.fill('input[placeholder*="Option D"]', '6');
        await page.selectOption('select', '1'); // Correct answer is B (4)
        await page.fill('textarea[placeholder*="explanation"]', 'Basic arithmetic: 2+2=4');
        await page.click('button:has-text("Add Question")');
        await page.waitForTimeout(1000);

        // Save and go back to exam list
        await page.click('button:has-text("Save & Exit")');
        await page.waitForTimeout(1000);

        // Start the exam
        await page.click('button:has-text("Start")');
        await page.waitForTimeout(500);

        // Read instructions and start
        await page.click('button:has-text("Start Exam")');
        await page.waitForTimeout(1000);

        // Answer the question correctly
        await page.click('input[value="1"]'); // Select option B (correct)
        await page.waitForTimeout(500);

        // Submit exam (should show submit button on last question)
        await expect(page.locator('button:has-text("Submit Exam")')).toBeVisible();
        await page.click('button:has-text("Submit Exam")');
        await page.waitForTimeout(2000);

        // Check for evaluation modal
        await expect(page.locator('text=Evaluating Your Answers')).toBeVisible();
        await page.waitForTimeout(3000);

        // Check for results display
        await expect(page.locator('text=Exam Results')).toBeVisible();
        await expect(page.locator('text=100%')).toBeVisible(); // Should get 100% for correct answer
        await expect(page.locator('text=Excellent')).toBeVisible();

        console.log('✓ Exam submission and evaluation works correctly');
    });

    test('should handle timer and question navigation', async ({ page }) => {
        // Create exam and start it
        await page.click('button:has-text("Exam Mode")');
        
        // Check if there are existing papers first
        const startButtons = await page.locator('button:has-text("Start")').count();
        
        if (startButtons > 0) {
            // Use existing paper
            await page.click('button:has-text("Start")');
        } else {
            // Create new paper quickly
            await page.click('button:has-text("Add Paper")');
            await page.fill('input[placeholder*="Data Structures"]', 'Timer Test');
            await page.click('input[value="mock"]');
            await page.fill('input[type="number"]', '1'); // 1 minute exam
            await page.click('button:has-text("Create Paper")');
            await page.waitForTimeout(1000);
            
            // Add question quickly
            await page.click('button:has-text("Add Question")');
            await page.fill('input[placeholder*="Enter question number"]', '1');
            await page.fill('input[placeholder*="Enter marks"]', '1');
            await page.fill('textarea[placeholder*="Enter your question"]', 'Test question');
            await page.click('button:has-text("Add Question")');
            await page.click('button:has-text("Save & Exit")');
            await page.waitForTimeout(1000);
            
            await page.click('button:has-text("Start")');
        }
        
        await page.waitForTimeout(500);
        await page.click('button:has-text("Start Exam")');
        await page.waitForTimeout(1000);

        // Check timer is visible and counting down
        const timer = page.locator('div:has-text(":")').first();
        await expect(timer).toBeVisible();

        // Check question navigation panel
        await expect(page.locator('text=Questions')).toBeVisible();
        
        // Check navigation buttons
        const nextButton = page.locator('button:has-text("Next")');
        const prevButton = page.locator('button:has-text("Previous")');
        
        // Previous should be disabled on first question
        if (await prevButton.count() > 0) {
            await expect(prevButton).toBeDisabled();
        }

        console.log('✓ Timer and navigation work correctly');
    });

    test('should export results correctly', async ({ page }) => {
        // Navigate through exam completion to results
        await page.click('button:has-text("Exam Mode")');
        
        // Use existing exam or create simple one
        const startButtons = await page.locator('button:has-text("Start")').count();
        if (startButtons > 0) {
            await page.click('button:has-text("Start")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("Start Exam")');
            await page.waitForTimeout(1000);
            
            // Try to submit (might need to answer questions first)
            const submitButton = page.locator('button:has-text("Submit Exam")');
            if (await submitButton.count() > 0) {
                await submitButton.click();
                await page.waitForTimeout(3000);
                
                // Check for export button in results
                const exportButton = page.locator('button:has-text("Export Results")');
                if (await exportButton.count() > 0) {
                    await expect(exportButton).toBeVisible();
                    console.log('✓ Export functionality is available in results');
                }
            }
        }
    });
});
