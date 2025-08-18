import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, AlertIcon, SparklesIcon, PlusIcon, TrashIcon } from '../components/icons';
import { Highlight } from '../types/types';
import { chapterSubtopics } from '../constants/constants';
import { AIGuruIcon } from '../components/icons';
import { useTheme } from '../contexts/ThemeContext';
import KindleStyleTextViewer from '../components/KindleStyleTextViewerFixed';

interface SubtopicData {
    id: string;
    title: string;
    content: string;
    images: string[];
}

interface EnhancedReaderPageProps {
    openAIGuru: (prompt?: string) => void;
    highlights: Highlight[];
    addHighlight: (highlight: Omit<Highlight, 'id' | 'timestamp'>) => void;
    removeHighlight: (id: string) => void;
}

const EnhancedReaderPage: React.FC<EnhancedReaderPageProps> = ({ 
    openAIGuru, 
    highlights, 
    addHighlight, 
    removeHighlight 
}) => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
    const [customSubtopics, setCustomSubtopics] = useState<SubtopicData[]>([]);
    const [isCustomChapter, setIsCustomChapter] = useState(false);
    const [editingSubtopic, setEditingSubtopic] = useState<string | null>(null);
    const [showAddSubtopic, setShowAddSubtopic] = useState(false);
    const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
    const [activeTab, setActiveTab] = useState('read'); // New state for active tab
    const [customTabs, setCustomTabs] = useState<string[]>([]); // Custom tabs
    const [newTabName, setNewTabName] = useState(''); // For adding new tabs
    const [showAddTab, setShowAddTab] = useState(false); // Show add tab form
    const contentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';
    
    const currentSubtopics = currentChapter && chapterSubtopics[currentBook] 
        ? chapterSubtopics[currentBook][currentChapter] || []
        : [];

    // Check if this is a custom chapter
    useEffect(() => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        
        if (customBook) {
            setIsCustomChapter(true);
            loadCustomSubtopics(customBook.id, currentChapter);
        }
    }, [currentBook, currentChapter]);

    const loadCustomSubtopics = (bookId: string, chapter: string) => {
        const saved = localStorage.getItem(`subtopics_${bookId}_${chapter.replace(/\s+/g, '_')}`);
        if (saved) {
            setCustomSubtopics(JSON.parse(saved));
        }
    };

    const saveCustomSubtopics = (bookId: string, chapter: string, subtopics: SubtopicData[]) => {
        localStorage.setItem(`subtopics_${bookId}_${chapter.replace(/\s+/g, '_')}`, JSON.stringify(subtopics));
        setCustomSubtopics(subtopics);
    };

    const handleAddSubtopic = () => {
        if (!newSubtopicTitle.trim()) return;

        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const newSubtopic: SubtopicData = {
            id: `subtopic_${Date.now()}`,
            title: newSubtopicTitle.trim(),
            content: 'Click edit to add content for this subtopic.',
            images: []
        };

        const updatedSubtopics = [...customSubtopics, newSubtopic];
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
        
        setNewSubtopicTitle('');
        setShowAddSubtopic(false);
    };

    const handleUpdateSubtopicContent = (subtopicId: string, content: string) => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => 
            sub.id === subtopicId ? { ...sub, content } : sub
        );
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    const handleDeleteSubtopic = (subtopicId: string) => {
        if (confirm('Are you sure you want to delete this subtopic?')) {
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBook = savedBooks.find((book: any) => book.name === currentBook);
            if (!customBook) return;

            const updatedSubtopics = customSubtopics.filter(sub => sub.id !== subtopicId);
            saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
        }
    };

    const handleImageUpload = (subtopicId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Create a URL for the uploaded image
        const imageUrl = URL.createObjectURL(file);
        
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => 
            sub.id === subtopicId 
                ? { ...sub, images: [...sub.images, imageUrl] }
                : sub
        );
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    // Determine unit number based on chapter name/position
    const getUnitNumber = (book: string, chapter: string): number => {
        if (!chapterSubtopics[book]) return 1;
        const chapters = Object.keys(chapterSubtopics[book]);
        const chapterIndex = chapters.findIndex(ch => ch === chapter);
        return chapterIndex >= 0 ? chapterIndex + 1 : 1;
    };

    const currentUnitNumber = getUnitNumber(currentBook, currentChapter);

    // Sample content for legacy subtopics
    const subtopicContent: Record<string, string> = {
        'What is Object-Oriented Design?': `Object-Oriented Design (OOD) is a software design methodology that organizes software design around data, or objects, rather than functions and logic. An object can be defined as a data field that has unique attributes and behavior.

Object-oriented design is the process of planning a system of interacting objects for the purpose of solving a software problem. It's one approach to software design, and it's particularly useful for modeling complex systems where objects interact with each other.

Key principles of OOD include:
1. **Encapsulation**: Bundling data and methods that work on that data within one unit
2. **Inheritance**: Mechanism where you can derive a class from another class for a hierarchy of classes
3. **Polymorphism**: Ability of different classes to be treated as instances of the same class through a common interface
4. **Abstraction**: Hiding complex implementation details while showing only essential features

These principles help create more maintainable, scalable, and reusable code.`,

        'Benefits of OOD': `Object-Oriented Design offers numerous advantages that make it a popular choice for software development:

**1. Modularity and Reusability**
Code is organized into discrete objects that can be reused across different parts of the application or even in different projects. This reduces development time and maintains consistency.

**2. Maintainability**
Changes to one part of the system are less likely to affect other parts due to encapsulation. This makes debugging and updating easier.

**3. Scalability**
New features can be added by creating new objects or extending existing ones without modifying the entire system architecture.

**4. Real-world Modeling**
OOD naturally maps to real-world entities, making the code more intuitive and easier to understand for developers.

**5. Code Organization**
Related data and functions are grouped together, making the codebase more organized and easier to navigate.

**6. Team Development**
Different team members can work on different classes simultaneously without conflicts, improving development efficiency.`,

        'Object-Oriented vs Procedural Programming': `The fundamental difference between Object-Oriented Programming (OOP) and Procedural Programming lies in their approach to organizing and structuring code.

**Procedural Programming:**
- Follows a top-down approach
- Code is organized as a sequence of functions or procedures
- Data and functions are separate entities
- Global data can be accessed by any function
- Examples: C, Pascal, FORTRAN

**Object-Oriented Programming:**
- Follows a bottom-up approach
- Code is organized around objects that contain both data and methods
- Data and functions are encapsulated within objects
- Data is protected and accessed through methods
- Examples: Java, C++, Python, C#

**Key Differences:**

| Aspect | Procedural | Object-Oriented |
|--------|------------|-----------------|
| Structure | Functions and procedures | Classes and objects |
| Data Security | Less secure (global data) | More secure (encapsulation) |
| Code Reusability | Limited | High (inheritance) |
| Problem Solving | Divide and conquer | Real-world modeling |
| Maintenance | Difficult for large systems | Easier due to modularity |

**When to Use Each:**
- Procedural: Simple, linear problems with clear step-by-step solutions
- Object-Oriented: Complex systems with multiple interacting components`,

        'History of OOP': `The evolution of Object-Oriented Programming spans several decades, with contributions from many brilliant computer scientists.

**1960s - Early Concepts:**
The concept of objects and classes was first introduced in Simula, developed by Ole-Johan Dahl and Kristen Nygaard in Norway. Simula is considered the first object-oriented programming language.

**1970s - Smalltalk Revolution:**
Alan Kay and his team at Xerox PARC developed Smalltalk, which refined and popularized OOP concepts. Kay coined the term "object-oriented programming" and established many principles we use today.

**1980s - Commercial Adoption:**
- C++ was developed by Bjarne Stroustrup, bringing OOP to the widely-used C language
- Object-oriented design methodologies began to emerge
- The first commercial OOP tools and frameworks appeared

**1990s - Mainstream Success:**
- Java was released by Sun Microsystems, making OOP more accessible
- Design patterns were formalized by the "Gang of Four"
- UML (Unified Modeling Language) was standardized for OO design

**2000s-Present - Modern Evolution:**
- Languages like C# and Python gained popularity
- Advanced OOP concepts like generics and reflection became common
- Integration with other paradigms (functional programming) emerged

The history shows how OOP evolved from academic research to become the dominant programming paradigm for large-scale software development.`,

        'UML Introduction': `The Unified Modeling Language (UML) is a standardized modeling language consisting of an integrated set of diagrams, developed to help system and software developers specify, visualize, construct, and document the artifacts of software systems.

**What is UML?**
UML provides a standard way to visualize the design of a system. It's not a programming language but a visual language for modeling software systems. Think of it as the "blueprint" language for software.

**Why Use UML?**
1. **Communication**: Provides a common vocabulary for developers, analysts, and stakeholders
2. **Documentation**: Creates comprehensive system documentation
3. **Design**: Helps in planning and designing system architecture
4. **Analysis**: Assists in understanding existing systems

**Main Types of UML Diagrams:**

**Structural Diagrams:**
- Class Diagram: Shows classes and relationships
- Object Diagram: Shows instances of classes
- Component Diagram: Shows system components
- Deployment Diagram: Shows hardware/software mapping

**Behavioral Diagrams:**
- Use Case Diagram: Shows system functionality
- Activity Diagram: Shows workflow
- Sequence Diagram: Shows object interactions over time
- State Diagram: Shows object state changes

**Benefits:**
- Standardized notation understood worldwide
- Helps identify potential issues early in design
- Facilitates team communication
- Provides multiple views of the same system
- Tool support for automatic code generation

UML is essential for large-scale software projects where clear communication and documentation are crucial.`
    };

    const toggleSubtopic = (subtopic: string) => {
        setExpandedSubtopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subtopic)) {
                newSet.delete(subtopic);
            } else {
                newSet.add(subtopic);
            }
            return newSet;
        });
    };

    const handleSubtopicExplain = (subtopic: string) => {
        openAIGuru(`Explain "${subtopic}" from ${currentChapter} chapter of ${currentBook} subject in detail.`);
    };

    // Handle AI explanation of selected text
    const handleExplainSelectedText = (selectedText: string, context: string) => {
        const prompt = `Explain this specific text: "${selectedText}" 

Context: This is from the "${currentChapter}" chapter of the "${currentBook}" subject.

Surrounding context: "${context}"

Please provide a detailed explanation of the selected text, focusing on:
1. What it means in simple terms
2. Why it's important in this subject
3. How it relates to the broader topic
4. Any examples or real-world applications

Make the explanation educational and easy to understand.`;

        openAIGuru(prompt);
    };

    const handleVideoLink = (subtopic: string) => {
        console.log(`Video for: ${subtopic} from ${currentChapter} - ${currentBook}`);
        alert(`Video feature for "${subtopic}" will be implemented with YouTube links later.`);
    };

    // Tab management functions
    const handleAddTab = () => {
        if (newTabName.trim() && !customTabs.includes(newTabName.trim())) {
            setCustomTabs([...customTabs, newTabName.trim()]);
            setNewTabName('');
            setShowAddTab(false);
        }
    };

    const handleDeleteTab = (tabName: string) => {
        if (confirm(`Are you sure you want to delete the "${tabName}" tab?`)) {
            setCustomTabs(customTabs.filter(tab => tab !== tabName));
            if (activeTab === tabName) {
                setActiveTab('read'); // Switch back to read tab
            }
        }
    };

    // Render content based on active tab
    const renderTabContent = () => {
        switch (activeTab) {
            case 'read':
                return renderReadContent();
            case 'highlights':
                return renderHighlightsContent();
            default:
                return renderCustomTabContent(activeTab);
        }
    };

    const renderReadContent = () => {
        // This will contain the existing subtopic content
        return (
            <div>
                {/* Add Subtopic Button */}
                {isCustomChapter && (
                    <div className="mb-6">
                        <button
                            onClick={() => setShowAddSubtopic(!showAddSubtopic)}
                            className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                        >
                            {showAddSubtopic ? 'Cancel' : '+ Add Subtopic'}
                        </button>
                    </div>
                )}

                {/* Add Subtopic Form */}
                {isCustomChapter && showAddSubtopic && (
                    <div className="mb-6 card p-6">
                        <h3 className="text-lg font-semibold theme-text mb-4">Add New Subtopic</h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium theme-text mb-2">Subtopic Title</label>
                                <input
                                    type="text"
                                    value={newSubtopicTitle}
                                    onChange={(e) => setNewSubtopicTitle(e.target.value)}
                                    placeholder="e.g., Introduction to React Components"
                                    className="w-full px-3 py-2 theme-surface border border-gray-300 rounded-lg theme-text"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddSubtopic(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 theme-transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddSubtopic}
                                    className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                >
                                    Add Subtopic
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subtopics - Expandable with individual content */}
                {allSubtopics.length > 0 && (
                    <div className="mb-8">
                        {!isCustomChapter && (
                            <h2 className="text-lg font-semibold theme-text mb-4">
                                Chapter Topics ({allSubtopics.length})
                            </h2>
                        )}
                        <div className="space-y-4">
                            {allSubtopics.map((subtopic, index) => {
                                const subtopicData = isCustomChapter 
                                    ? customSubtopics.find(sub => sub.title === subtopic)
                                    : null;

                                return (
                                    <div key={index} className="theme-transition">
                                        {/* Subtopic Header */}
                                        <div className="theme-surface rounded-lg overflow-hidden theme-transition">
                                            <div 
                                                className="flex items-center justify-between p-4 cursor-pointer hover:theme-surface2 theme-transition"
                                                onClick={() => toggleSubtopic(subtopic)}
                                            >
                                                <h3 className="font-semibold theme-text text-lg">
                                                    {currentUnitNumber}.{index + 1} {subtopic}
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSubtopicExplain(subtopic);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 theme-transition"
                                                    >
                                                        Explain
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVideoLink(subtopic);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 theme-transition"
                                                    >
                                                        Video
                                                    </button>
                                                    {/* Edit and Delete buttons for custom subtopics */}
                                                    {isCustomChapter && subtopicData && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingSubtopic(editingSubtopic === subtopicData.id ? null : subtopicData.id);
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition"
                                                            >
                                                                {editingSubtopic === subtopicData.id ? 'Cancel' : 'Edit'}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    fileInputRef.current?.click();
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 theme-transition"
                                                            >
                                                                Image
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSubtopic(subtopicData.id);
                                                                }}
                                                                className="p-1 text-red-600 hover:text-red-800 theme-transition"
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                            <input
                                                                ref={fileInputRef}
                                                                type="file"
                                                                accept="image/*"
                                                                style={{ display: 'none' }}
                                                                onChange={(e) => handleImageUpload(subtopicData.id, e)}
                                                            />
                                                        </>
                                                    )}
                                                    <svg 
                                                        className={`w-5 h-5 theme-text-secondary transition-transform ${expandedSubtopics.has(subtopic) ? 'rotate-180' : ''}`} 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Content Section */}
                                        {expandedSubtopics.has(subtopic) && (
                                            <div className="mt-6 mb-8 px-0">
                                                {/* Images Display for Custom Subtopics */}
                                                {isCustomChapter && subtopicData && subtopicData.images.length > 0 && (
                                                    <div className="mb-6">
                                                        <div className="flex flex-wrap gap-4">
                                                            {subtopicData.images.map((img, imgIndex) => (
                                                                <img
                                                                    key={imgIndex}
                                                                    src={img}
                                                                    alt={`${subtopic} image ${imgIndex + 1}`}
                                                                    className="max-w-xs max-h-64 object-contain rounded-lg shadow-md"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Editable Content for Custom Subtopics */}
                                                {isCustomChapter && subtopicData && (
                                                    <div 
                                                        className="prose prose-sm sm:prose-base lg:prose-lg max-w-none theme-text"
                                                        style={{ width: '100%' }}
                                                    >
                                                        {editingSubtopic === subtopicData.id ? (
                                                            <div className="space-y-4">
                                                                <textarea
                                                                    defaultValue={subtopicData.content}
                                                                    placeholder="Enter content for this subtopic..."
                                                                    className="w-full h-64 p-4 theme-surface border border-gray-300 rounded-lg theme-text resize-y"
                                                                    onBlur={(e) => handleUpdateSubtopicContent(subtopicData.id, e.target.value)}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setEditingSubtopic(null)}
                                                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 theme-transition"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const textarea = document.querySelector(`textarea`) as HTMLTextAreaElement;
                                                                            if (textarea) {
                                                                                handleUpdateSubtopicContent(subtopicData.id, textarea.value);
                                                                            }
                                                                            setEditingSubtopic(null);
                                                                        }}
                                                                        className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                                                                    >
                                                                        Save Content
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <KindleStyleTextViewer
                                                                content={subtopicData.content || 'Click edit to add content for this subtopic.'}
                                                                highlights={highlights.filter(h => h.chapterId === currentBook)}
                                                                currentBook={currentBook}
                                                                onHighlight={(text: string, color: string) => {
                                                                    addHighlight({
                                                                        text,
                                                                        color,
                                                                        chapterId: currentBook
                                                                    });
                                                                }}
                                                                onRemoveHighlight={removeHighlight}
                                                                className="subtopic-content-enhanced"
                                                                onExplainWithAI={handleExplainSelectedText}
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Static Content for Legacy Subtopics */}
                                                {!isCustomChapter && (
                                                    <div 
                                                        className="prose prose-sm sm:prose-base lg:prose-lg max-w-none theme-text"
                                                        style={{ width: '100%' }}
                                                    >
                                                        <KindleStyleTextViewer
                                                            content={subtopicContent[subtopic] || 'Content for this subtopic will be added soon. Click the Explain button above for an AI explanation.'}
                                                            highlights={highlights.filter(h => h.chapterId === currentBook)}
                                                            currentBook={currentBook}
                                                            onHighlight={(text: string, color: string) => {
                                                                addHighlight({
                                                                    text,
                                                                    color,
                                                                    chapterId: currentBook
                                                                });
                                                            }}
                                                            onRemoveHighlight={removeHighlight}
                                                            className="subtopic-content-enhanced"
                                                            onExplainWithAI={handleExplainSelectedText}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State for Custom Chapters */}
                {isCustomChapter && customSubtopics.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No subtopics yet</h3>
                        <p className="theme-text-secondary mb-6">Click "Add Subtopic" to get started with your content</p>
                    </div>
                )}
            </div>
        );
    };

    const renderHighlightsContent = () => {
        return (
            <div className="theme-surface rounded-lg p-6">
                <h2 className="text-lg font-semibold theme-text mb-4">Highlights & Notes</h2>
                <p className="theme-text-secondary">Your highlighted content and notes will appear here.</p>
            </div>
        );
    };

    const renderCustomTabContent = (tabName: string) => {
        return (
            <div className="theme-surface rounded-lg p-6">
                <h2 className="text-lg font-semibold theme-text mb-4">{tabName}</h2>
                <p className="theme-text-secondary">Custom content for {tabName} tab. This area can be customized with any content you want.</p>
                <div className="mt-4">
                    <textarea
                        placeholder={`Add content for ${tabName} tab...`}
                        className="w-full h-32 p-3 theme-surface border rounded-lg theme-text"
                    />
                    <button className="mt-2 px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90">
                        Save Content
                    </button>
                </div>
            </div>
        );
    };

    if (!currentBook || !currentChapter) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 theme-bg min-h-screen">
                <div className="text-center py-8">
                    <h1 className="text-xl font-bold mb-4 theme-text">Chapter Not Found</h1>
                    <button 
                        onClick={() => navigate('/')} 
                        className="btn-primary"
                    >
                        Go Back to Bookshelf
                    </button>
                </div>
            </div>
        );
    }

    // Combine legacy and custom subtopics for display
    const allSubtopics = isCustomChapter 
        ? customSubtopics.map(sub => sub.title)
        : currentSubtopics;

    return (
        <div className="theme-bg min-h-screen theme-text theme-transition">
            <header className="sticky top-0 theme-surface backdrop-blur-sm z-10 p-4 theme-transition">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/subject/${encodeURIComponent(currentBook)}`)}>
                            <BackIcon />
                        </button>
                        <h1 className="font-semibold text-lg theme-text">
                            {currentChapter}
                        </h1>
                    </div>
                    <AlertIcon />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Tab Navigation */}
                <div className="py-4 flex flex-wrap gap-2 text-sm border-b theme-border mb-4">
                    <button 
                        onClick={() => setActiveTab('read')}
                        className={`px-4 py-2 rounded-lg transition-all ${
                            activeTab === 'read' 
                                ? 'theme-accent text-white' 
                                : 'btn-secondary hover:btn-primary'
                        }`}
                    >
                        Read
                    </button>
                    <button 
                        onClick={() => setActiveTab('highlights')}
                        className={`px-4 py-2 rounded-lg transition-all ${
                            activeTab === 'highlights' 
                                ? 'theme-accent text-white' 
                                : 'btn-secondary hover:btn-primary'
                        }`}
                    >
                        Highlights & Notes
                    </button>
                    
                    {/* Custom tabs */}
                    {customTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg transition-all group relative ${
                                activeTab === tab 
                                    ? 'theme-accent text-white' 
                                    : 'btn-secondary hover:btn-primary'
                            }`}
                        >
                            {tab}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTab(tab);
                                }}
                                className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                title="Delete tab"
                            >
                                ×
                            </button>
                        </button>
                    ))}
                    
                    {/* Add Tab Button */}
                    {showAddTab ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newTabName}
                                onChange={(e) => setNewTabName(e.target.value)}
                                placeholder="Tab name..."
                                className="px-3 py-1 text-sm theme-surface border rounded-lg theme-text"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddTab();
                                    }
                                }}
                                autoFocus
                            />
                            <button
                                onClick={handleAddTab}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddTab(false);
                                    setNewTabName('');
                                }}
                                className="px-3 py-1 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddTab(true)}
                            className="px-4 py-2 rounded-lg border-2 border-dashed theme-border hover:theme-accent-border transition-colors"
                        >
                            + Add Tab
                        </button>
                    )}
                </div>

                {/* Tab Content Area */}
                {renderTabContent()}
                
            </main>
            
            <button 
                onClick={() => openAIGuru()} 
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 theme-accent p-3 sm:p-4 rounded-full shadow-lg hover:bg-opacity-90 theme-transition transform hover:scale-110 z-20"
            >
                <AIGuruIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
            </button>
        </div>
    );
};

export default EnhancedReaderPage;
