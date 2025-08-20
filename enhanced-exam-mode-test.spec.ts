import { test, expect } from '@playwright/test';

test.describe('Enhanced Exam Mode Test', () => {
    test('complete exam mode with new features', async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:5174');
        await page.waitForTimeout(1000);

        // Create a new book
        await page.getByText('New Book').click();
        await page.fill('input[placeholder="Enter book title"]', 'Enhanced Exam Book');
        await page.fill('input[placeholder="Enter author name"]', 'Test Author');
        await page.getByText('Create Book').click();
        await page.waitForTimeout(500);

        // Add a subject
        await page.getByText('Add Subject').click();
        await page.fill('input[placeholder="Enter subject name"]', 'Computer Science');
        await page.getByText('Create Subject').click();
        await page.waitForTimeout(500);

        // Click on the subject to go to chapter page
        await page.getByText('Computer Science').click();
        await page.waitForTimeout(500);

        // Add a chapter
        await page.getByText('Add Chapter').click();
        await page.fill('input[placeholder="Enter chapter title"]', 'Data Structures');
        await page.getByText('Create Chapter').click();
        await page.waitForTimeout(500);

        // Click on the chapter to go to reader page
        await page.getByText('Data Structures').click();
        await page.waitForTimeout(1000);

        // Click exam mode button
        await page.getByText('Exam Mode').click();
        await page.waitForTimeout(1000);

        // Verify we're on the exam page
        await expect(page).toHaveURL(/.*\/exam\/Computer Science\/Data Structures/);
        await expect(page.getByText('Exam Mode - Computer Science / Data Structures')).toBeVisible();

        // Test custom category functionality
        await page.getByText('Add Paper').click();
        await page.waitForTimeout(500);

        await page.fill('input[placeholder="Enter paper title"]', 'Algorithms Test');
        await page.selectOption('select', 'custom');
        await page.fill('input[placeholder="Enter category name"]', 'Practice Tests');
        await page.getByText('Create Paper').click();
        await page.waitForTimeout(1000);

        // Verify custom category shows with proper name
        await expect(page.getByText('Practice Tests')).toBeVisible();
        await expect(page.getByText('Algorithms Test')).toBeVisible();

        // Add another custom category
        await page.getByText('Add Paper').click();
        await page.waitForTimeout(500);

        await page.fill('input[placeholder="Enter paper title"]', 'Theory Test');
        await page.selectOption('select', 'custom');
        await page.fill('input[placeholder="Enter category name"]', 'Theory Papers');
        await page.getByText('Create Paper').click();
        await page.waitForTimeout(1000);

        // Verify both custom categories are shown separately
        await expect(page.getByText('Practice Tests')).toBeVisible();
        await expect(page.getByText('Theory Papers')).toBeVisible();

        // Test question editing with sections
        const editButton = page.locator('button[title="Edit Questions"]').first();
        await editButton.click();
        await page.waitForTimeout(1000);

        // Verify question editor modal is open with sections
        await expect(page.getByText('Edit Questions')).toBeVisible();
        await expect(page.getByText('Manage Questions')).toBeVisible();
        await expect(page.getByText('Section A')).toBeVisible(); // Default section

        // Test adding a new section
        const addSectionButton = page.locator('button[title="Add Section"]');
        await addSectionButton.click();
        await page.fill('input[placeholder="Section name"]', 'Section B');
        await page.getByText('Add', { exact: true }).click();
        await page.waitForTimeout(500);

        // Verify new section appears
        await expect(page.getByText('Section B')).toBeVisible();

        // Test section settings
        await page.getByText('Section Settings').click();
        await page.waitForTimeout(500);

        // Fill section settings
        await page.fill('input[placeholder="Total Questions"]', '10');
        await page.fill('input[placeholder="Required Answers"]', '8');
        await page.getByText('Save Settings').click();
        await page.waitForTimeout(500);

        // Test adding a question
        await page.getByText('Add Question').click();
        await page.waitForTimeout(500);

        // Verify question form with MCQ/Long Answer toggle
        await expect(page.getByText('Question Type')).toBeVisible();
        await expect(page.getByText('Multiple Choice')).toBeVisible();
        await expect(page.getByText('Long Answer')).toBeVisible();

        // Test MCQ question
        await page.check('input[value="mcq"]');
        await page.fill('input[type="number"]', '2'); // Marks
        await page.fill('textarea[placeholder="Enter your question here..."]', 'What is a stack?');
        
        // Fill options
        const mcqOptions = ['LIFO data structure', 'FIFO data structure', 'Random access', 'None'];
        for (let i = 0; i < 4; i++) {
            await page.fill(`input[placeholder="Option ${String.fromCharCode(97 + i)}"]`, mcqOptions[i]);
        }
        
        // Select correct answer (first option)
        await page.locator('input[type="radio"]').first().check();
        
        // Add question
        await page.getByText('Add Question', { exact: true }).click();
        await page.waitForTimeout(500);

        // Verify question is added and displayed
        await expect(page.getByText('What is a stack?')).toBeVisible();
        await expect(page.getByText('Q1')).toBeVisible();
        await expect(page.getByText('2 marks')).toBeVisible();
        await expect(page.getByText('MCQ')).toBeVisible();

        // Test adding an "OR" option
        await page.getByText('Add OR').click();
        await page.waitForTimeout(500);

        // This should add a new question form for the OR option
        await page.fill('textarea[placeholder="Enter your question here..."]', 'Explain the concept of queue.');
        await page.check('input[value="long-answer"]'); // Switch to long answer
        await page.getByText('Add Question', { exact: true }).click();
        await page.waitForTimeout(500);

        // Test navigation between questions
        await expect(page.getByText('Question 1 of 2')).toBeVisible();
        await page.getByText('Next').click();
        await page.waitForTimeout(300);
        await expect(page.getByText('Question 2 of 2')).toBeVisible();
        await expect(page.getByText('OR Option')).toBeVisible();

        // Test manage questions list
        await page.getByText('Previous').click(); // Go back to first question
        await page.waitForTimeout(300);
        await page.getByText('Manage Questions').click();
        await page.waitForTimeout(500);

        // Verify questions list shows both questions
        await expect(page.getByText('Manage Questions - Section B')).toBeVisible();
        await expect(page.getByText('What is a stack?')).toBeVisible();
        await expect(page.getByText('Explain the concept of queue.')).toBeVisible();

        // Test editing a question from the list
        const editQuestionButton = page.locator('button[title="Edit Question"]').first();
        await editQuestionButton.click();
        await page.waitForTimeout(500);

        // Modify the question
        await page.fill('textarea[placeholder="Enter your question here..."]', 'What is a stack data structure?');
        await page.getByText('Update Question').click();
        await page.waitForTimeout(500);

        // Save all changes
        await page.getByText('Save Changes').click();
        await page.waitForTimeout(1000);

        // Verify we're back to the exam page and questions are saved
        await expect(page.getByText('Exam Mode - Computer Science / Data Structures')).toBeVisible();
        await expect(page.getByText('2 Questions')).toBeVisible();

        console.log('✅ Enhanced exam mode test passed successfully!');
    });

    test('section management and question types', async ({ page }) => {
        await page.goto('http://localhost:5174');
        await page.waitForTimeout(1000);

        // Quick setup
        await page.getByText('New Book').click();
        await page.fill('input[placeholder="Enter book title"]', 'Section Test Book');
        await page.fill('input[placeholder="Enter author name"]', 'Test Author');
        await page.getByText('Create Book').click();
        await page.waitForTimeout(500);

        await page.getByText('Add Subject').click();
        await page.fill('input[placeholder="Enter subject name"]', 'Mathematics');
        await page.getByText('Create Subject').click();
        await page.waitForTimeout(500);

        await page.getByText('Mathematics').click();
        await page.waitForTimeout(500);

        await page.getByText('Add Chapter').click();
        await page.fill('input[placeholder="Enter chapter title"]', 'Calculus');
        await page.getByText('Create Chapter').click();
        await page.waitForTimeout(500);

        await page.getByText('Calculus').click();
        await page.waitForTimeout(1000);

        await page.getByText('Exam Mode').click();
        await page.waitForTimeout(1000);

        // Add a paper
        await page.getByText('Add Paper').click();
        await page.waitForTimeout(500);
        await page.fill('input[placeholder="Enter paper title"]', 'Calculus Final');
        await page.getByText('Create Paper').click();
        await page.waitForTimeout(1000);

        // Open question editor
        await page.locator('button[title="Edit Questions"]').click();
        await page.waitForTimeout(1000);

        // Test adding multiple sections
        const sectionNames = ['Section A', 'Section B', 'Section C'];
        for (let i = 1; i < sectionNames.length; i++) {
            await page.locator('button[title="Add Section"]').click();
            await page.fill('input[placeholder="Section name"]', sectionNames[i]);
            await page.getByText('Add', { exact: true }).click();
            await page.waitForTimeout(300);
        }

        // Verify all sections are visible
        for (const sectionName of sectionNames) {
            await expect(page.getByText(sectionName)).toBeVisible();
        }

        // Test switching between sections
        await page.getByText('Section B').click();
        await page.waitForTimeout(300);

        // Add different types of questions to different sections
        await page.getByText('Add Question').click();
        await page.waitForTimeout(500);

        // Add long answer question
        await page.check('input[value="long-answer"]');
        await page.fill('textarea[placeholder="Enter your question here..."]', 'Derive the formula for integration by parts.');
        await page.fill('input[type="number"]', '10');
        await page.getByText('Add Question', { exact: true }).click();
        await page.waitForTimeout(500);

        // Switch to Section C
        await page.getByText('Section C').click();
        await page.waitForTimeout(300);

        // Add MCQ question
        await page.getByText('Add Question').click();
        await page.waitForTimeout(500);

        await page.check('input[value="mcq"]');
        await page.fill('textarea[placeholder="Enter your question here..."]', 'What is the derivative of sin(x)?');
        
        const options = ['cos(x)', '-cos(x)', 'sin(x)', '-sin(x)'];
        for (let i = 0; i < 4; i++) {
            await page.fill(`input[placeholder="Option ${String.fromCharCode(97 + i)}"]`, options[i]);
        }
        
        await page.locator('input[type="radio"]').first().check();
        await page.getByText('Add Question', { exact: true }).click();
        await page.waitForTimeout(500);

        // Test deleting a section
        await page.getByText('Section A').click();
        await page.waitForTimeout(300);
        
        // Try to delete (should work since we have multiple sections)
        const deleteButton = page.locator('button[title="Delete Section"]').first();
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Verify Section A is removed
        await expect(page.getByText('Section A')).not.toBeVisible();
        await expect(page.getByText('Section B')).toBeVisible();
        await expect(page.getByText('Section C')).toBeVisible();

        // Save changes
        await page.getByText('Save Changes').click();
        await page.waitForTimeout(1000);

        console.log('✅ Section management test passed successfully!');
    });
});
