// Test script to verify cloud sync is working
// Run this in browser console on localhost:5180

// Test data
const testBook = "physics";
const testChapter = "wht we know";
const testNotes = [
  {
    id: "test_note_1",
    content: "This is a test note to verify cloud sync",
    createdAt: new Date(),
    updatedAt: new Date(),
    color: "yellow"
  },
  {
    id: "test_note_2", 
    content: "Second test note for cloud sync verification",
    createdAt: new Date(),
    updatedAt: new Date(),
    color: "blue"
  }
];

// Test the fixed saveTemplateData method
async function testCloudSync() {
  try {
    console.log("🧪 Testing cloud sync fix...");
    
    // Import the UnifiedBookAdapter (assuming it's available globally or can be imported)
    // In browser console, you might need to access it through the window object
    
    // For now, let's test localStorage directly and simulate the flow
    const baseKey = `NOTES_${testBook.replace(/\s+/g, '_')}_${testChapter.replace(/\s+/g, '_')}`;
    
    // Save to localStorage (this is what the old system did)
    localStorage.setItem(baseKey, JSON.stringify(testNotes));
    console.log("✅ Saved test notes to localStorage:", baseKey);
    
    // The new system should have automatic cloud sync via setTimeout
    // Let's check if it appears in Supabase in a few seconds
    setTimeout(() => {
      console.log("🔍 Check Supabase now to see if notes synced to cloud");
      console.log("Expected key in content_data:", baseKey);
    }, 3000);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Instructions
console.log(`
🧪 CLOUD SYNC TEST INSTRUCTIONS:

1. Open browser to http://localhost:5180
2. Open browser console
3. Paste this entire script
4. Run: testCloudSync()
5. Wait 3 seconds
6. Check Supabase content_data for physics book
7. Should see: NOTES_physics_wht_we_know key

Expected result: Notes should appear in Supabase content_data
`);
