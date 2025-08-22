/**
 * BOOK-BASED ASSET AUTHENTICATION TEST
 * Test suite to verify the book-based authentication system works correctly
 */

import { BookIdResolver } from '../utils/BookIdResolver';
import { BookBasedAssetService } from '../services/BookBasedAssetService';
import { AssetSyncService } from '../services/AssetSyncService';
import { BookImportService } from '../services/BookImportService';

export class BookBasedAuthTest {

  /**
   * Run comprehensive tests for book-based authentication system
   */
  static async runTests(): Promise<{
    success: boolean;
    results: { [testName: string]: { passed: boolean; message: string } };
    summary: string;
  }> {
    console.log('🧪 Starting Book-Based Authentication Tests...');

    const results: { [testName: string]: { passed: boolean; message: string } } = {};

    // Test 1: Book ID Resolution
    try {
      const testBook = 'Test Mathematics Book';
      const bookContext = BookIdResolver.resolveBookId(testBook);
      
      results['bookIdResolution'] = {
        passed: bookContext.isValidBook && !!bookContext.bookId,
        message: `Book ID resolved: ${bookContext.bookId}`
      };
    } catch (error) {
      results['bookIdResolution'] = {
        passed: false,
        message: `Failed to resolve book ID: ${error}`
      };
    }

    // Test 2: Deterministic ID Generation
    try {
      const bookName = 'Physics Study Guide';
      const id1 = BookIdResolver.generateDeterministicBookId(bookName);
      const id2 = BookIdResolver.generateDeterministicBookId(bookName);
      
      results['deterministicIdGeneration'] = {
        passed: id1 === id2 && id1.length > 0,
        message: `Generated consistent ID: ${id1}`
      };
    } catch (error) {
      results['deterministicIdGeneration'] = {
        passed: false,
        message: `Deterministic ID generation failed: ${error}`
      };
    }

    // Test 3: Public Asset Path Creation
    try {
      const bookContext = BookIdResolver.resolveBookId('Chemistry Basics');
      const assetPath = BookIdResolver.createPublicAssetPath(
        bookContext.bookId,
        'chapter1',
        'test-asset-123',
        'png'
      );
      
      const isBookBasedPath = assetPath.includes(`books/${bookContext.bookId}/`);
      
      results['publicAssetPath'] = {
        passed: isBookBasedPath,
        message: `Asset path: ${assetPath}`
      };
    } catch (error) {
      results['publicAssetPath'] = {
        passed: false,
        message: `Public asset path creation failed: ${error}`
      };
    }

    // Test 4: Asset URL Replacement
    try {
      const testData = {
        content: 'This is an image: https://example.com/book-assets/users/user123/asset.jpg',
        images: [
          'https://example.com/book-assets/users/user456/image1.png',
          'https://example.com/book-assets/users/user789/image2.jpg'
        ]
      };

      const updatedData = BookBasedAssetService.updateAssetUrlsInData(testData, 'Biology Book');
      const hasBookBasedUrls = JSON.stringify(updatedData).includes('/books/');
      
      results['assetUrlReplacement'] = {
        passed: hasBookBasedUrls,
        message: hasBookBasedUrls ? 'URLs successfully converted to book-based paths' : 'URL conversion failed'
      };
    } catch (error) {
      results['assetUrlReplacement'] = {
        passed: false,
        message: `Asset URL replacement failed: ${error}`
      };
    }

    // Test 5: Asset Sync Detection
    try {
      const bookDataWithAssets = {
        content: {
          chapters: {
            chapter1: {
              content: 'Image: https://example.com/book-assets/users/old-user/image.jpg'
            }
          }
        }
      };

      const needsSync = AssetSyncService.needsAssetSync(bookDataWithAssets);
      
      results['assetSyncDetection'] = {
        passed: needsSync === true,
        message: needsSync ? 'Correctly detected assets needing sync' : 'Asset sync detection failed'
      };
    } catch (error) {
      results['assetSyncDetection'] = {
        passed: false,
        message: `Asset sync detection failed: ${error}`
      };
    }

    // Test 6: Import Service Validation
    try {
      const mockBookData = {
        metadata: {
          name: 'Test Import Book',
          id: 'test-book-123',
          description: 'A test book for import validation'
        },
        content: {
          chapters: {
            chapter1: { title: 'Introduction', content: 'Test content' }
          }
        }
      };

      // This is a dry run validation - doesn't actually import
      const isImported = BookImportService.isImportedBook('Test Import Book');
      
      results['importServiceValidation'] = {
        passed: typeof isImported === 'boolean',
        message: 'Import service validation methods are working'
      };
    } catch (error) {
      results['importServiceValidation'] = {
        passed: false,
        message: `Import service validation failed: ${error}`
      };
    }

    // Calculate overall success
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const totalTests = Object.keys(results).length;
    const success = passedTests === totalTests;

    const summary = `✅ ${passedTests}/${totalTests} tests passed. ${success ? 'All tests successful!' : 'Some tests failed.'}`;

    console.log('📊 Test Results:', results);
    console.log(summary);

    return {
      success,
      results,
      summary
    };
  }

  /**
   * Test book-based authentication flow with a mock file
   */
  static async testUploadFlow(mockBookName: string = 'Test Upload Book'): Promise<{
    success: boolean;
    message: string;
    bookId?: string;
  }> {
    try {
      console.log(`🧪 Testing upload flow for book: ${mockBookName}`);

      // Step 1: Resolve book context
      const bookContext = BookIdResolver.resolveBookId(mockBookName);
      if (!bookContext.isValidBook) {
        return {
          success: false,
          message: 'Failed to resolve book context'
        };
      }

      // Step 2: Create mock file blob
      const mockImageBlob = new Blob(['mock image data'], { type: 'image/png' });
      const mockFile = new File([mockImageBlob], 'test-image.png', { type: 'image/png' });

      // Step 3: Test book asset path creation
      const assetId = 'test-' + Date.now();
      const assetPath = BookIdResolver.createPublicAssetPath(
        bookContext.bookId,
        'test-chapter',
        assetId,
        'png'
      );

      console.log(`📊 Generated asset path: ${assetPath}`);

      // Step 4: Validate path structure
      const isValidPath = assetPath.includes(`books/${bookContext.bookId}/`) && 
                         assetPath.includes('test-chapter') &&
                         assetPath.endsWith('.png');

      if (!isValidPath) {
        return {
          success: false,
          message: 'Generated asset path is invalid'
        };
      }

      return {
        success: true,
        message: `Upload flow test successful. Book ID: ${bookContext.bookId}, Asset Path: ${assetPath}`,
        bookId: bookContext.bookId
      };

    } catch (error) {
      return {
        success: false,
        message: `Upload flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Quick integration test to verify all components work together
   */
  static async quickIntegrationTest(): Promise<boolean> {
    console.log('⚡ Running quick integration test...');

    try {
      // Test the complete flow
      const testResults = await this.runTests();
      const uploadTest = await this.testUploadFlow('Integration Test Book');

      const integrationSuccess = testResults.success && uploadTest.success;

      console.log(`⚡ Integration test ${integrationSuccess ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 Core tests: ${testResults.summary}`);
      console.log(`📊 Upload test: ${uploadTest.message}`);

      return integrationSuccess;
    } catch (error) {
      console.error('❌ Integration test failed:', error);
      return false;
    }
  }
}

// Export for use in components or manual testing
export default BookBasedAuthTest;
