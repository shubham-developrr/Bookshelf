/**
 * Direct Cloud Sync Test
 * Tests the UnifiedBookAdapter cloud sync fix
 */

import { UnifiedBookAdapter } from './src/services/UnifiedBookAdapter.js';

async function testCloudSync() {
    console.log("🧪 TESTING UNIFIED BOOK ADAPTER CLOUD SYNC");
    
    try {
        // Test data matching existing physics book
        const testBook = "physics";
        const testChapter = "wht we know"; 
        const testNotes = [
            {
                id: "direct_test_" + Date.now(),
                content: "🧪 DIRECT TEST: Cloud sync verification " + new Date().toLocaleString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                color: "yellow",
                topic: "Cloud Sync Test"
            }
        ];

        console.log("📝 Test Parameters:");
        console.log("  Book:", testBook);
        console.log("  Chapter:", testChapter);
        console.log("  Template:", "NOTES");
        console.log("  Data:", testNotes);

        // Get UnifiedBookAdapter instance
        const adapter = UnifiedBookAdapter.getInstance();
        
        // Test the saveTemplateData method (this should trigger cloud sync)
        console.log("\n💾 Calling saveTemplateData...");
        const result = await adapter.saveTemplateData(testBook, testChapter, 'NOTES', testNotes);
        
        console.log("📤 Save result:", result);
        
        if (result.success) {
            console.log("✅ Local save successful!");
            console.log("⏳ Cloud sync should happen automatically in ~1 second...");
            
            // Wait for cloud sync
            setTimeout(() => {
                console.log("🌐 Cloud sync should be complete now!");
                console.log("🔍 Check Supabase content_data for physics book");
                console.log("   Expected key: NOTES_physics_wht_we_know");
                console.log("   Should contain the test note data");
            }, 2000);
        } else {
            console.error("❌ Local save failed:", result.error);
        }
        
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testCloudSync };
} else {
    // Browser environment
    window.testCloudSync = testCloudSync;
}

console.log("🧪 Direct cloud sync test loaded. Run testCloudSync() to execute.");
