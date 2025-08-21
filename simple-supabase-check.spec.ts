import { test, expect } from '@playwright/test';

test.describe('Simple Supabase Error Check', () => {
  test('should not have Supabase constraint violations in console', async ({ page }) => {
    // Monitor console errors for Supabase-related issues
    const supabaseErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('duplicate key') || 
            text.includes('409') || 
            text.includes('constraint') ||
            text.includes('user_progress_user_id_book_id_chapter_id_key') ||
            text.includes('Failed to save tabs to backend')) {
          supabaseErrors.push(text);
        }
      }
    });

    // Monitor network for 409 responses
    const networkConflicts: string[] = [];
    page.on('response', response => {
      if (response.status() === 409 && response.url().includes('supabase')) {
        networkConflicts.push(`409 on ${response.url()}`);
      }
    });

    // Just navigate and wait - no interaction needed
    await page.goto('http://localhost:5174');
    await page.waitForTimeout(8000); // Let the page fully load and any background requests complete

    // Log what we found
    console.log(`✅ Test completed:`);
    console.log(`   - Supabase console errors: ${supabaseErrors.length}`);
    console.log(`   - Network 409 conflicts: ${networkConflicts.length}`);
    
    if (supabaseErrors.length > 0) {
      console.log('Supabase errors found:', supabaseErrors);
    }
    if (networkConflicts.length > 0) {
      console.log('Network conflicts found:', networkConflicts);
    }

    // Main assertion: our specific constraint violation fix should work
    const hasConstraintViolations = supabaseErrors.some(error => 
      error.includes('user_progress_user_id_book_id_chapter_id_key') ||
      error.includes('duplicate key value violates unique constraint')
    );

    expect(hasConstraintViolations).toBe(false);
    expect(networkConflicts.length).toBe(0);

    if (!hasConstraintViolations && networkConflicts.length === 0) {
      console.log('🎉 SUCCESS: No Supabase constraint violations detected! Fix is working.');
    }
  });
});
