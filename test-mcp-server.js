#!/usr/bin/env node

/**
 * Test MCP Server for Interactive Study Bookshelf
 * Tests codebase patterns, localStorage usage, and component structure
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

class BookshelfTestServer {
  constructor() {
    this.server = new Server(
      {
        name: 'bookshelf-tester',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'bookshelf://codebase-analysis',
            name: 'Codebase Analysis',
            description: 'Analysis of the Interactive Study Bookshelf codebase patterns',
            mimeType: 'application/json',
          },
          {
            uri: 'bookshelf://component-patterns',
            name: 'Component Patterns',
            description: 'React component patterns used throughout the app',
            mimeType: 'application/json',
          },
          {
            uri: 'bookshelf://storage-patterns',
            name: 'Storage Patterns',
            description: 'localStorage key patterns and data structures',
            mimeType: 'application/json',
          }
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      switch (uri) {
        case 'bookshelf://codebase-analysis':
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(await this.analyzeCodebase(), null, 2),
              },
            ],
          };

        case 'bookshelf://component-patterns':
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(await this.analyzeComponentPatterns(), null, 2),
              },
            ],
          };

        case 'bookshelf://storage-patterns':
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(await this.analyzeStoragePatterns(), null, 2),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_component',
            description: 'Analyze a React component for patterns and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                componentPath: {
                  type: 'string',
                  description: 'Path to the component file',
                },
              },
              required: ['componentPath'],
            },
          },
          {
            name: 'validate_storage_keys',
            description: 'Validate localStorage key patterns in the codebase',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'Storage key pattern to validate (e.g., "flashcards_", "mcq_")',
                },
              },
              required: ['pattern'],
            },
          },
          {
            name: 'test_mobile_patterns',
            description: 'Test mobile-first responsive patterns',
            inputSchema: {
              type: 'object',
              properties: {
                componentPath: {
                  type: 'string',
                  description: 'Path to component to test mobile patterns',
                },
              },
              required: ['componentPath'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'analyze_component':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await this.analyzeComponent(args.componentPath), null, 2),
              },
            ],
          };

        case 'validate_storage_keys':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await this.validateStorageKeys(args.pattern), null, 2),
              },
            ],
          };

        case 'test_mobile_patterns':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await this.testMobilePatterns(args.componentPath), null, 2),
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async analyzeCodebase() {
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        structure: {},
        patterns: {},
        insights: []
      };

      // Analyze main directories
      const srcPath = path.join(process.cwd(), 'src');
      
      if (await this.pathExists(srcPath)) {
        analysis.structure.components = await this.countFiles(path.join(srcPath, 'components'), '.tsx');
        analysis.structure.pages = await this.countFiles(path.join(srcPath, 'pages'), '.tsx');
        analysis.structure.services = await this.countFiles(path.join(srcPath, 'services'), '.ts');
        analysis.structure.utils = await this.countFiles(path.join(srcPath, 'utils'), '.ts');
      }

      // Analyze key patterns from the copilot instructions
      analysis.patterns.aiIntegration = 'Multi-provider fallback (Gemini → Groq)';
      analysis.patterns.textHighlighting = '3 different engines (Advanced, Professional, Kindle)';
      analysis.patterns.storage = 'localStorage with tab isolation patterns';
      analysis.patterns.mobileFirst = 'Responsive with touch event handling';
      
      analysis.insights.push('Uses React 19 with TypeScript');
      analysis.insights.push('Context-based state management');
      analysis.insights.push('Sophisticated export/import system');
      analysis.insights.push('Mobile-first with haptic feedback');

      return analysis;
    } catch (error) {
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  async analyzeComponentPatterns() {
    const patterns = {
      timestamp: new Date().toISOString(),
      hookPatterns: [
        'useState for component state',
        'useRef for DOM references', 
        'useCallback for event handlers',
        'useEffect for lifecycle and storage'
      ],
      storagePatterns: [
        'baseKey pattern: `${templateType}_${book}_${chapter}`',
        'tabId isolation: `${baseKey}_${tabId}`',
        'Auto-save with 1-second debouncing',
        'Priority: tab-specific → base → default'
      ],
      mobilePatterns: [
        'isMobile() detection at 768px breakpoint',
        'touchActive state prevents double-firing',
        'Conditional rendering for mobile/desktop',
        'Haptic feedback integration'
      ],
      commonProps: [
        'currentBook: string',
        'currentChapter: string', 
        'tabId?: string',
        'className?: string'
      ]
    };

    return patterns;
  }

  async analyzeStoragePatterns() {
    const storagePatterns = {
      timestamp: new Date().toISOString(),
      keyPatterns: {
        coreData: [
          'books - All user books',
          'chapters_${bookId} - Book chapters',
          'highlights_${chapter} - Text highlights'
        ],
        templateSystem: [
          'flashcards_${book}_${chapter} - Base template',
          'flashcards_${book}_${chapter}_${tabId} - Tab-isolated',
          'mcq_${book}_${chapter}',
          'qa_${book}_${chapter}',
          'notes_${book}_${chapter}',
          'mindmaps_${book}_${chapter}',
          'videos_${book}_${chapter}'
        ],
        customTabs: [
          'customtab_${tabName}_${book}_${chapter}'
        ],
        userSpecific: [
          'tabs_cache_${userId}_${chapterId}',
          'theme-mode',
          'user_gemini_api_key',
          'ai_guru_memory_summary'
        ]
      },
      isolationPattern: 'Always check tab-specific keys first, then fall back to base keys',
      persistenceStrategy: 'Auto-save with debouncing, manual save on critical actions'
    };

    return storagePatterns;
  }

  async analyzeComponent(componentPath) {
    try {
      const fullPath = path.join(process.cwd(), 'src', componentPath);
      
      if (!(await this.pathExists(fullPath))) {
        return { error: `Component not found: ${componentPath}` };
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      
      const analysis = {
        path: componentPath,
        timestamp: new Date().toISOString(),
        patterns: {
          usesHooks: /use(State|Effect|Callback|Ref|Memo)/.test(content),
          usesLocalStorage: /localStorage\.(getItem|setItem)/.test(content),
          mobileOptimized: /isMobile|touchActive|window\.innerWidth/.test(content),
          hasTabIsolation: /tabId|storageKey.*tabId/.test(content),
          usesTheme: /theme-|useTheme/.test(content),
          hasAIIntegration: /AI|openAIGuru|enhancedAIService/.test(content)
        },
        metrics: {
          lines: content.split('\n').length,
          hasTypeScript: componentPath.endsWith('.tsx') || componentPath.endsWith('.ts'),
          exportType: content.includes('export default') ? 'default' : 'named'
        }
      };

      return analysis;
    } catch (error) {
      return { error: error.message, path: componentPath };
    }
  }

  async validateStorageKeys(pattern) {
    try {
      const srcPath = path.join(process.cwd(), 'src');
      const files = await this.getAllFiles(srcPath, ['.tsx', '.ts']);
      
      const findings = {
        pattern,
        timestamp: new Date().toISOString(),
        matches: [],
        recommendations: []
      };

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const regex = new RegExp(`${pattern}[^"'\`]*`, 'g');
        const matches = content.match(regex);
        
        if (matches) {
          findings.matches.push({
            file: path.relative(process.cwd(), file),
            matches: matches
          });
        }
      }

      // Add recommendations based on pattern
      if (pattern.includes('flashcards_') || pattern.includes('mcq_')) {
        findings.recommendations.push('Ensure tab isolation pattern is followed');
        findings.recommendations.push('Check for both base and tab-specific keys');
      }

      return findings;
    } catch (error) {
      return { error: error.message, pattern };
    }
  }

  async testMobilePatterns(componentPath) {
    try {
      const fullPath = path.join(process.cwd(), 'src', componentPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      const mobileTests = {
        path: componentPath,
        timestamp: new Date().toISOString(),
        tests: {
          responsiveDetection: /isMobile.*window\.innerWidth.*768/.test(content),
          touchHandling: /touchActive|handleTouch/.test(content),
          preventDoublefire: /touchActive.*isMobile.*return/.test(content),
          conditionalRendering: /\{.*isMobile.*\?.*:.*\}/.test(content),
          responsiveClasses: /(sm:|md:|lg:)/.test(content),
          hapticFeedback: /haptic|vibrate/.test(content)
        },
        score: 0,
        recommendations: []
      };

      // Calculate score
      mobileTests.score = Object.values(mobileTests.tests).filter(Boolean).length;
      
      // Add recommendations
      if (!mobileTests.tests.responsiveDetection) {
        mobileTests.recommendations.push('Add mobile detection with 768px breakpoint');
      }
      if (!mobileTests.tests.touchHandling) {
        mobileTests.recommendations.push('Add touch event handling');
      }
      if (!mobileTests.tests.preventDoublefire) {
        mobileTests.recommendations.push('Implement touchActive pattern to prevent mouse/touch double-firing');
      }

      return mobileTests;
    } catch (error) {
      return { error: error.message, path: componentPath };
    }
  }

  // Helper methods
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async countFiles(dir, extension) {
    try {
      const files = await fs.readdir(dir);
      return files.filter(file => file.endsWith(extension)).length;
    } catch {
      return 0;
    }
  }

  async getAllFiles(dir, extensions, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.getAllFiles(fullPath, extensions, files);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors for inaccessible directories
    }
    
    return files;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bookshelf Test MCP Server running on stdio');
  }
}

// Run the server
const server = new BookshelfTestServer();
server.run().catch(console.error);
