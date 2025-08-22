// Quick test for cloud sync in browser console
// Run this on localhost:5174

async function quickCloudSyncTest() {
    console.log("🧪 QUICK CLOUD SYNC TEST");
    
    try {
        // Test data - using exact book and chapter that exists in Supabase
        const testBook = "physics";
        const testChapter = "wht we know";
        const testNotes = [
            {
                id: "cloud_sync_test_" + Date.now(),
                content: "🧪 TEST NOTE: Verifying cloud sync fix " + new Date().toLocaleString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                color: "yellow"
            }
        ];
        
        // Find UnifiedBookAdapter in the global scope (if available)
        // In React apps, this might be available through the window object
        console.log("Step 1: Looking for UnifiedBookAdapter...");
        
        // If we can't access it directly, let's simulate the call that should happen
        // when notes are saved through the NotesManager
        
        console.log("Step 2: Test data created:");
        console.log("Book:", testBook);
        console.log("Chapter:", testChapter);
        console.log("Test notes:", testNotes);
        
        // The expected localStorage key
        const expectedKey = `NOTES_${testBook.replace(/\s+/g, '_')}_${testChapter.replace(/\s+/g, '_')}`;
        console.log("Expected localStorage key:", expectedKey);
        
        // Check if there's existing data
        const existingData = localStorage.getItem(expectedKey);
        console.log("Existing localStorage data:", existingData);
        
        console.log("\n✅ Test data prepared!");
        console.log("📝 Next steps:");
        console.log("1. Navigate to the physics book -> 'wht we know' chapter");  
        console.log("2. Go to Notes tab");
        console.log("3. Add a real note through the UI");
        console.log("4. Wait 2-3 seconds for cloud sync");
        console.log("5. Check Supabase content_data for key:", expectedKey);
        
    } catch (error) {
        console.error("❌ Test preparation failed:", error);
    }
}

// Instructions
console.log(`
🧪 CLOUD SYNC TEST READY
To test: quickCloudSyncTest()
`);

// Auto-run if you want
// quickCloudSyncTest();
