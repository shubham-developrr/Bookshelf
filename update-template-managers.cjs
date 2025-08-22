// Script to update remaining template managers with book-linked tab system
const fs = require('fs');
const path = require('path');

const managers = [
    { file: 'NotesManager.tsx', templateType: 'notes' },
    { file: 'VideosManager.tsx', templateType: 'videos' }
];

function updateManager(filePath, templateType) {
    console.log(`Updating ${path.basename(filePath)} for template type: ${templateType}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add BookTabManager import
    if (!content.includes('BookTabManager')) {
        content = content.replace(
            /import.*from\s+['"]\.\/icons['"]\s*;/,
            `$&\nimport { BookTabManager, BookTabContext } from '../utils/BookTabManager';`
        );
    }
    
    // Replace storage key creation with tab context
    content = content.replace(
        /const baseKey = `[^`]+`;\s*const storageKey = [^;]+;/,
        `// Book tab context for proper data isolation
    const tabContext: BookTabContext = React.useMemo(() => {
        return BookTabManager.createTemplateTabContext(
            currentBook,
            currentChapter,
            '${templateType}'
        );
    }, [currentBook, currentChapter]);`
    );
    
    // Replace localStorage.getItem calls
    content = content.replace(
        /localStorage\.getItem\(storageKey\)/g,
        `BookTabManager.loadTabData('${templateType}', tabContext)`
    );
    
    // Replace localStorage.setItem calls
    content = content.replace(
        /localStorage\.setItem\(storageKey,\s*JSON\.stringify\(([^)]+)\)\)/g,
        `BookTabManager.saveTabData('${templateType}', tabContext, $1)`
    );
    
    // Replace dependency arrays
    content = content.replace(/\[storageKey\]/g, '[tabContext]');
    
    fs.writeFileSync(filePath, content);
    console.log(`Successfully updated ${path.basename(filePath)}`);
}

// Process each manager
managers.forEach(({ file, templateType }) => {
    const filePath = path.join(__dirname, 'src', 'components', file);
    if (fs.existsSync(filePath)) {
        updateManager(filePath, templateType);
    } else {
        console.log(`File not found: ${filePath}`);
    }
});

console.log('All template managers updated successfully!');
