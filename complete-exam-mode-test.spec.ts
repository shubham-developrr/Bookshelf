import { test, expect } from '@playwright/test';

test.describe('Complete Exam Mode Test', () => {
    test('exam mode with question editor functionality', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5174');
        await page.waitForTimeout(1000);

        // Create a new book
        await page.getByText('New Book').click();
        await page.fill('input[placeholder="Enter book title"]', 'Test Exam Book');
        await page.fill('input[placeholder="Enter author name"]', 'Test Author');
        await page.getByText('Create Book').click();
        await page.waitForTimeout(500);

        // Add a subject
        await page.getByText('Add Subject').click();
        await page.fill('input[placeholder="Enter subject name"]', 'Mathematics');
        await page.getByText('Create Subject').click();
        await page.waitForTimeout(500);

        // Click on the subject to go to chapter page
        await page.getByText('Mathematics').click();
        await page.waitForTimeout(500);

        // Add a chapter
        await page.getByText('Add Chapter').click();
        await page.fill('input[placeholder="Enter chapter title"]', 'Algebra');
        await page.getByText('Create Chapter').click();
        await page.waitForTimeout(500);

        // Click on the chapter to go to reader page
        await page.getByText('Algebra').click();
        await page.waitForTimeout(1000);

        // Verify exam mode button is present and theme-adaptive
        const examButton = page.locator('button:has-text("Exam Mode")');
        await expect(examButton).toBeVisible();
        
        // Click exam mode button
        await examButton.click();
        await page.waitForTimeout(1000);

        // Verify we're on the exam page
        await expect(page).toHaveURL(/.*\/exam\/Mathematics\/Algebra/);
        await expect(page.getByText('Exam Mode - Mathematics / Algebra')).toBeVisible();

        // Test adding a new question paper
        await page.getByText('Add Paper').click();
        await page.waitForTimeout(500);

        // Fill the form
        await page.fill('input[placeholder="Enter paper title"]', 'Test Paper 1');
        await page.selectOption('select', 'previous-year');
        await page.selectOption('select:has-option[value="2023"]', '2023');
        await page.fill('input[type="number"]', '120');
        
        // Submit the form
        await page.getByText('Create Paper').click();
        await page.waitForTimeout(500);

        // Verify the paper was created in the correct category
        await expect(page.getByText('Previous Year Papers')).toBeVisible();
        await expect(page.getByText('Test Paper 1')).toBeVisible();
        await expect(page.getByText('Previous Year 2023')).toBeVisible();

        // Test question editing functionality
        const editButton = page.locator('button[title="Edit Questions"]').first();
        await editButton.click();
        await page.waitForTimeout(1000);

        // Verify question editor modal is open
        await expect(page.getByText('Edit Questions')).toBeVisible();
        await expect(page.getByText('Manage Questions')).toBeVisible();
        await expect(page.getByText('Import from File')).toBeVisible();

        // Test adding a question in manage tab
        await page.getByText('Add Question').click();
        await page.waitForTimeout(500);

        // Fill question form
        await page.fill('input[type="number"]', '1');
        await page.selectOption('select', 'Section A');
        await page.fill('textarea[placeholder="Enter your question here..."]', 'What is 2 + 2?');
        
        // Fill options
        const options = ['2', '3', '4', '5'];
        for (let i = 0; i < 4; i++) {
            await page.fill(`input[placeholder="Option ${String.fromCharCode(97 + i)}"]`, options[i]);
        }
        
        // Select correct answer (option c = index 2)
        await page.check('input[type="radio"]', { force: true });
        await page.locator('input[type="radio"]').nth(2).check();
        
        // Set marks
        await page.fill('input[type="number"]:last-of-type', '2');
        
        // Add question
        await page.getByText('Add Question', { exact: true }).click();
        await page.waitForTimeout(500);

        // Verify question was added
        await expect(page.getByText('What is 2 + 2?')).toBeVisible();
        await expect(page.getByText('Q1 - Section A')).toBeVisible();
        await expect(page.getByText('2 marks')).toBeVisible();

        // Test import tab
        await page.getByText('Import from File').click();
        await page.waitForTimeout(500);

        // Verify import interface
        await expect(page.getByText('Upload PDF or Image')).toBeVisible();
        await expect(page.getByText('Choose Files')).toBeVisible();

        // Save changes
        await page.getByText('Save Changes').click();
        await page.waitForTimeout(500);

        // Verify we're back to the exam page
        await expect(page.getByText('Exam Mode - Mathematics / Algebra')).toBeVisible();
        
        // Verify paper shows question count
        await expect(page.getByText('1 Question')).toBeVisible();
        await expect(page.getByText('2 Marks')).toBeVisible();

        // Test different category
        await page.getByText('Add Paper').click();
        await page.waitForTimeout(500);

        await page.fill('input[placeholder="Enter paper title"]', 'Custom Test');
        await page.selectOption('select', 'custom');
        await page.fill('input[placeholder="Enter category name"]', 'Practice Tests');
        await page.getByText('Create Paper').click();
        await page.waitForTimeout(500);

        // Verify custom category
        await expect(page.getByText('Custom Categories')).toBeVisible();
        await expect(page.getByText('Custom Test')).toBeVisible();
        await expect(page.getByText('Practice Tests')).toBeVisible();

        // Test exit exam mode
        await page.getByText('Exit Exam Mode').click();
        await page.waitForTimeout(500);
        
        // Confirm exit
        await page.getByText('Exit', { exact: true }).click();
        await page.waitForTimeout(1000);

        // Verify we're back to reader page
        await expect(page).toHaveURL(/.*\/reader\/Mathematics\/Algebra/);
        await expect(page.getByText('Exam Mode')).toBeVisible(); // Button should still be there

        console.log('✅ Complete exam mode test passed successfully!');
    });

    test('exam mode theme adaptation', async ({ page }) => {
        // Navigate and set up
        await page.goto('http://localhost:5174');
        await page.waitForTimeout(1000);

        // Test theme switching while on exam page
        await page.getByText('New Book').click();
        await page.fill('input[placeholder="Enter book title"]', 'Theme Test Book');
        await page.fill('input[placeholder="Enter author name"]', 'Test Author');
        await page.getByText('Create Book').click();
        await page.waitForTimeout(500);

        await page.getByText('Add Subject').click();
        await page.fill('input[placeholder="Enter subject name"]', 'Physics');
        await page.getByText('Create Subject').click();
        await page.waitForTimeout(500);

        await page.getByText('Physics').click();
        await page.waitForTimeout(500);

        await page.getByText('Add Chapter').click();
        await page.fill('input[placeholder="Enter chapter title"]', 'Mechanics');
        await page.getByText('Create Chapter').click();
        await page.waitForTimeout(500);

        await page.getByText('Mechanics').click();
        await page.waitForTimeout(1000);

        // Go to exam mode
        await page.getByText('Exam Mode').click();
        await page.waitForTimeout(1000);

        // Test theme switching
        const themes = ['Dark', 'Blue', 'AMOLED', 'Light'];
        for (const theme of themes) {
            // Click theme button
            await page.locator('button[title="Toggle theme"]').click();
            await page.waitForTimeout(200);
            
            // Select theme
            await page.getByText(theme).click();
            await page.waitForTimeout(500);
            
            // Verify page still works
            await expect(page.getByText('Exam Mode - Physics / Mechanics')).toBeVisible();
        }

        console.log('✅ Theme adaptation test passed successfully!');
    });
});
