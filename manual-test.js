// Manual localStorage test for cloud sync
// This simulates what happens when a user creates notes through the UI

// Test data
const testBook = "physics";
const testChapter = "wht we know";
const testNotes = [
    {
        id: "manual_sync_test_" + Date.now(),
        content: "📝 MANUAL TEST: Verifying cloud sync works " + new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        color: "yellow",
        topic: "Manual Cloud Sync Test"
    }
];

// The key that NotesManager would use
const notesKey = `NOTES_${testBook.replace(/\s+/g, '_')}_${testChapter.replace(/\s+/g, '_')}`;

console.log("🧪 MANUAL CLOUD SYNC TEST");
console.log("Key:", notesKey);
console.log("Data:", JSON.stringify(testNotes, null, 2));

// Save to localStorage (this is what the NotesManager does first)
localStorage.setItem(notesKey, JSON.stringify(testNotes));
console.log("✅ Saved to localStorage");

console.log("\n⚠️  NOTE: The actual cloud sync happens via UnifiedBookAdapter.saveTemplateData()");
console.log("This localStorage test only simulates the first step.");
console.log("The UI components call the adapter method which triggers cloud sync.");
console.log("\nTo fully test, you need to:");
console.log("1. Open the physics book in the app");
console.log("2. Go to Notes tab");  
console.log("3. Add a note through the UI");
console.log("4. Check if it appears in Supabase content_data");

// Check if our test data is there
setTimeout(() => {
    const saved = localStorage.getItem(notesKey);
    console.log("\n🔍 Verification - localStorage data:", JSON.parse(saved));
}, 100);
