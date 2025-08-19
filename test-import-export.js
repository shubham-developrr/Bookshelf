// Test import/export functionality directly
const fs = require('fs');
const path = require('path');

console.log('=== Testing Import/Export Functionality ===\n');

// Test 1: Verify test ZIP file exists
console.log('1. Checking test ZIP file...');
const testZipPath = path.join(__dirname, 'test-book-correct.zip');
if (fs.existsSync(testZipPath)) {
    const stats = fs.statSync(testZipPath);
    console.log('✓ Test ZIP exists:', testZipPath);
    console.log('  Size:', stats.size, 'bytes');
} else {
    console.log('✗ Test ZIP not found:', testZipPath);
    process.exit(1);
}

// Test 2: Check if services exist
console.log('\n2. Checking service files...');
const exportServicePath = path.join(__dirname, 'src', 'services', 'exportService.ts');
const importServicePath = path.join(__dirname, 'src', 'services', 'importService.ts');

if (fs.existsSync(exportServicePath)) {
    console.log('✓ Export service exists');
} else {
    console.log('✗ Export service missing:', exportServicePath);
}

if (fs.existsSync(importServicePath)) {
    console.log('✓ Import service exists');
} else {
    console.log('✗ Import service missing:', importServicePath);
}

// Test 3: Create a simple book data structure for export
console.log('\n3. Creating test book data...');
const testBookData = {
    bookId: 'test-book-123',
    bookName: 'Test Mathematics Book',
    chapters: [
        { id: 'chapter_1', name: 'Algebra Fundamentals', number: 1 },
        { id: 'chapter_2', name: 'Calculus Basics', number: 2 },
        { id: 'chapter_3', name: 'Geometry Principles', number: 3 }
    ]
};

console.log('✓ Test book data created:', JSON.stringify(testBookData, null, 2));

console.log('\n=== Test Complete ===');
console.log('Next step: Test via browser UI');
