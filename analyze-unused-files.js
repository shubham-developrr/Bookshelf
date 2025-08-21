#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track all imported files
const usedFiles = new Set();
const allFiles = new Set();

// Function to resolve import path
function resolveImportPath(fromFile, importPath) {
    if (importPath.startsWith('.')) {
        const fromDir = path.dirname(fromFile);
        const resolved = path.resolve(fromDir, importPath);
        
        // Try different extensions
        const extensions = ['.tsx', '.ts', '.jsx', '.js'];
        for (const ext of extensions) {
            const withExt = resolved + ext;
            if (fs.existsSync(withExt)) return withExt;
        }
        
        // Try index files
        for (const ext of extensions) {
            const indexFile = path.join(resolved, 'index' + ext);
            if (fs.existsSync(indexFile)) return indexFile;
        }
        
        return resolved;
    }
    return null; // External/node_modules import
}

// Function to extract imports from file
function extractImports(filePath) {
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    
    // Match import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = resolveImportPath(filePath, importPath);
        if (resolved) {
            imports.push(resolved);
        }
    }
    
    return imports;
}

// Function to recursively find all used files
function findUsedFiles(startFile) {
    if (usedFiles.has(startFile)) return;
    if (!fs.existsSync(startFile)) return;
    
    usedFiles.add(startFile);
    
    const imports = extractImports(startFile);
    for (const importPath of imports) {
        findUsedFiles(importPath);
    }
}

// Function to find all TypeScript/React files
function findAllFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Skip node_modules, .git, dist, etc.
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
                findAllFiles(fullPath, files);
            }
        } else if (stat.isFile()) {
            if (/\.(tsx?|jsx?)$/.test(item)) {
                files.push(fullPath);
                allFiles.add(fullPath);
            }
        }
    }
    
    return files;
}

// Main analysis
const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');

console.log('🔍 Analyzing project for unused files...\n');

// Find all files
const allProjectFiles = findAllFiles(srcDir);
console.log(`📁 Found ${allProjectFiles.length} TypeScript/React files`);

// Start from entry points
const entryPoints = [
    path.join(srcDir, 'index.tsx'),
    path.join(srcDir, 'components', 'App.tsx'),
];

console.log('🚀 Tracing imports from entry points...');

// Trace all used files
for (const entry of entryPoints) {
    if (fs.existsSync(entry)) {
        findUsedFiles(entry);
        console.log(`   ✓ Traced from ${path.relative(projectRoot, entry)}`);
    }
}

console.log(`📊 Found ${usedFiles.size} files are actually used\n`);

// Find unused files
const unusedFiles = [];
for (const file of allFiles) {
    if (!usedFiles.has(file)) {
        unusedFiles.push(file);
    }
}

// Categorize unused files
const categories = {
    components: [],
    pages: [],
    services: [],
    utils: [],
    contexts: [],
    types: [],
    tests: [],
    other: []
};

for (const file of unusedFiles) {
    const relativePath = path.relative(projectRoot, file);
    
    if (relativePath.includes('test') || relativePath.includes('spec')) {
        categories.tests.push(relativePath);
    } else if (relativePath.includes('components')) {
        categories.components.push(relativePath);
    } else if (relativePath.includes('pages')) {
        categories.pages.push(relativePath);
    } else if (relativePath.includes('services')) {
        categories.services.push(relativePath);
    } else if (relativePath.includes('utils')) {
        categories.utils.push(relativePath);
    } else if (relativePath.includes('contexts')) {
        categories.contexts.push(relativePath);
    } else if (relativePath.includes('types')) {
        categories.types.push(relativePath);
    } else {
        categories.other.push(relativePath);
    }
}

// Print results
console.log('🗑️  UNUSED FILES ANALYSIS\n');
console.log('=' .repeat(60));

for (const [category, files] of Object.entries(categories)) {
    if (files.length > 0) {
        console.log(`\n📂 ${category.toUpperCase()} (${files.length} files):`);
        files.sort().forEach(file => {
            console.log(`   ❌ ${file}`);
        });
    }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 SUMMARY:`);
console.log(`   Total files: ${allProjectFiles.length}`);
console.log(`   Used files: ${usedFiles.size}`);
console.log(`   Unused files: ${unusedFiles.length}`);
console.log(`   Cleanup potential: ${((unusedFiles.length / allProjectFiles.length) * 100).toFixed(1)}%`);

// Generate deletion script
const deleteScript = unusedFiles.map(file => {
    const relativePath = path.relative(projectRoot, file);
    return `# rm "${relativePath}"`;
}).join('\n');

fs.writeFileSync('unused-files-to-delete.txt', deleteScript);
console.log(`\n💾 Deletion commands saved to: unused-files-to-delete.txt`);

// Show used files for reference
console.log('\n✅ USED FILES:');
const usedFilesList = Array.from(usedFiles).map(f => path.relative(projectRoot, f)).sort();
usedFilesList.forEach(file => {
    console.log(`   ✓ ${file}`);
});
