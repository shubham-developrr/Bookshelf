import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, AlertIcon, SparklesIcon, PlusIcon, TrashIcon } from '../components/icons';
import { Highlight } from '../types/types';
import { chapterSubtopics } from '../constants/constants';
import { AIGuruIcon } from '../components/icons';
import { useTheme } from '../contexts/ThemeContext';
import KindleStyleTextViewer from '../components/KindleStyleTextViewerFixed';
import YouTubePlayerModal from '../components/YouTubePlayerModal';
import InlineContentEditor from '../components/InlineContentEditor';
import FlashCardManager from '../components/AnkiFlashCardManager';
import RichTextEditor from '../components/RichTextEditor';
import MCQManager from '../components/MCQManager';
import QAManager from '../components/QAManager';
import MindMapManager from '../components/MindMapManager';
import NotesManager from '../components/NotesManager';
import VideosManager from '../components/VideosManager';

interface SubtopicData {
    id: string;
    title: string;
    content: string;
    images: string[];
    imageCaptions?: string[]; // Captions for each image
    videoLinks?: VideoData[];
}

interface VideoData {
    id: string;
    title: string;
    youtubeUrl: string;
    startTime?: number;
    endTime?: number;
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
    const [isLoadingSubtopics, setIsLoadingSubtopics] = useState(false);
    const [editingSubtopic, setEditingSubtopic] = useState<string | null>(null);
    const [showAddSubtopic, setShowAddSubtopic] = useState(false);
    const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
    const [activeTab, setActiveTab] = useState('read'); // Main content tab now called 'read'
    const [availableTemplates] = useState<string[]>(['Notes', 'Flash card', 'MCQ', 'Q&A', 'Mind Map', 'Videos']); // Template options
    const [activeTabs, setActiveTabs] = useState<string[]>(['read', 'highlights']); // Default visible tabs - only Read and Highlights
    const [showTemplateSelector, setShowTemplateSelector] = useState(false); // Show template selection modal
    const [newTabName, setNewTabName] = useState(''); // For adding custom tabs
    const [showAddTab, setShowAddTab] = useState(false); // Show add tab form
    const [tabNames, setTabNames] = useState<{ [key: string]: string }>({}); // Custom names for tabs
    const [showRenameInput, setShowRenameInput] = useState<string | null>(null); // Tab being renamed
    const [renameValue, setRenameValue] = useState(''); // Rename input value
    
    // YouTube Player Modal states
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [currentVideoData, setCurrentVideoData] = useState<VideoData | null>(null);
    const [currentSubtopicForVideo, setCurrentSubtopicForVideo] = useState<string>('');
    const [currentVideoMode, setCurrentVideoMode] = useState<'play' | 'edit'>('edit');
    
    const contentRef = useRef<HTMLDivElement>(null);
    // Remove shared fileInputRef - we'll create individual ones for each subtopic

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';
    
    const currentSubtopics = currentChapter && chapterSubtopics[currentBook] 
        ? chapterSubtopics[currentBook][currentChapter] || []
        : [];

    // Check if this is a custom chapter
    useEffect(() => {
        const checkAndLoadCustomChapter = async () => {
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBook = savedBooks.find((book: any) => book.name === currentBook);
            
            if (customBook) {
                setIsCustomChapter(true);
                setIsLoadingSubtopics(true);
                await loadCustomSubtopics(customBook.id, currentChapter);
                setIsLoadingSubtopics(false);
            } else {
                setIsCustomChapter(false);
                setIsLoadingSubtopics(false);
            }
        };
        
        checkAndLoadCustomChapter();
    }, [currentBook, currentChapter]);

    const loadCustomSubtopics = async (bookId: string, chapter: string) => {
        // Add a small delay to simulate loading if needed for UX
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
            images: [],
            videoLinks: []
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

    const handleImageUpload = (subtopicId: string, file: File) => {
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

    // Enhanced content update handler for InlineContentEditor
    const handleContentAndImagesUpdate = (subtopicId: string, content: string, images: string[], imageCaptions?: string[]) => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => 
            sub.id === subtopicId 
                ? { ...sub, content, images, imageCaptions: imageCaptions || sub.imageCaptions || [] }
                : sub
        );
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    // Video management functions
    const openVideoModal = (subtopic: string, videoData?: VideoData, mode: 'play' | 'edit' = 'edit') => {
        setCurrentSubtopicForVideo(subtopic);
        setCurrentVideoData(videoData || null);
        setCurrentVideoMode(mode);
        setShowVideoModal(true);
    };

    const handleVideoSave = (videoData: VideoData) => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        // Find the subtopic data
        const subtopicData = customSubtopics.find(sub => sub.title === currentSubtopicForVideo);
        if (!subtopicData) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicData.id) {
                const existingVideos = sub.videoLinks || [];
                const videoIndex = existingVideos.findIndex(v => v.id === videoData.id);
                
                let updatedVideos;
                if (videoIndex >= 0) {
                    // Update existing video
                    updatedVideos = existingVideos.map(v => v.id === videoData.id ? videoData : v);
                } else {
                    // Add new video
                    updatedVideos = [...existingVideos, videoData];
                }
                
                return { ...sub, videoLinks: updatedVideos };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
        setShowVideoModal(false);
        setCurrentVideoData(null);
        setCurrentSubtopicForVideo('');
    };

    const handleVideoDelete = (subtopicId: string, videoId: string) => {
        if (!confirm('Are you sure you want to delete this video?')) return;
        
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicId && sub.videoLinks) {
                return { ...sub, videoLinks: sub.videoLinks.filter(v => v.id !== videoId) };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    const handleImageDelete = (subtopicId: string, imageIndex: number) => {
        if (!confirm('Are you sure you want to delete this image?')) return;
        
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicId) {
                const updatedImages = sub.images.filter((_, index) => index !== imageIndex);
                return { ...sub, images: updatedImages };
            }
            return sub;
        });
        
        saveCustomSubtopics(customBook.id, currentChapter, updatedSubtopics);
    };

    const moveImage = (subtopicId: string, imageIndex: number, direction: 'up' | 'down') => {
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((book: any) => book.name === currentBook);
        if (!customBook) return;

        const updatedSubtopics = customSubtopics.map(sub => {
            if (sub.id === subtopicId) {
                const images = [...sub.images];
                const newIndex = direction === 'up' ? imageIndex - 1 : imageIndex + 1;
                
                if (newIndex >= 0 && newIndex < images.length) {
                    [images[imageIndex], images[newIndex]] = [images[newIndex], images[imageIndex]];
                }
                
                return { ...sub, images };
            }
            return sub;
        });
        
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
        // Find the subtopic data and get first video
        const subtopicData = customSubtopics.find(sub => sub.title === subtopic);
        if (subtopicData && subtopicData.videoLinks && subtopicData.videoLinks.length > 0) {
            // Play the first video
            const firstVideo = subtopicData.videoLinks[0];
            openVideoModal(subtopic, firstVideo, 'play');
        } else {
            // No videos found, show message
            alert(`No videos available for "${subtopic}". Use "Edit Video" to add videos.`);
        }
    };
    
    const handleEditVideo = (subtopic: string) => {
        // Find existing video data for this subtopic
        const subtopicData = customSubtopics.find(sub => sub.title === subtopic);
        const existingVideo = subtopicData?.videoLinks && subtopicData.videoLinks.length > 0 
            ? subtopicData.videoLinks[0] // Get the first video for editing
            : null;
        
        // Open the modal with existing video data (if any) in edit mode
        openVideoModal(subtopic, existingVideo, 'edit');
    };

    // Template and tab management functions
    const handleAddTemplateTab = (templateName: string) => {
        const baseId = templateName.toLowerCase().replace(/\s+/g, '');
        let tabId = baseId;
        let counter = 1;
        
        // Allow duplicates by adding numbers
        while (activeTabs.includes(tabId)) {
            counter++;
            tabId = `${baseId}${counter}`;
        }
        
        setActiveTabs([...activeTabs, tabId]);
        
        // Set custom name if it's a duplicate
        if (counter > 1) {
            setTabNames(prev => ({
                ...prev,
                [tabId]: `${templateName} ${counter}`
            }));
        }
        
        setActiveTab(tabId);
        setShowTemplateSelector(false);
    };

    const handleAddCustomTab = () => {
        if (newTabName.trim()) {
            const baseId = newTabName.trim().toLowerCase().replace(/\s+/g, '');
            let tabId = baseId;
            let counter = 1;
            
            while (activeTabs.includes(tabId)) {
                counter++;
                tabId = `${baseId}${counter}`;
            }
            
            setActiveTabs([...activeTabs, tabId]);
            setTabNames(prev => ({
                ...prev,
                [tabId]: newTabName.trim()
            }));
            setActiveTab(tabId);
            setNewTabName('');
            setShowAddTab(false);
        }
    };

    const handleDeleteTab = (tabName: string) => {
        // Prevent deletion of core tabs
        if (tabName === 'read' || tabName === 'highlights') {
            alert('Cannot delete core tabs (Read, Highlights)');
            return;
        }
        
        if (confirm(`Are you sure you want to delete the "${getTabDisplayName(tabName)}" tab?`)) {
            setActiveTabs(activeTabs.filter(tab => tab !== tabName));
            // Remove custom name if exists
            const newTabNames = { ...tabNames };
            delete newTabNames[tabName];
            setTabNames(newTabNames);
            
            if (activeTab === tabName) {
                setActiveTab('read'); // Switch back to read tab
            }
        }
    };

    const handleRenameTab = (tabName: string) => {
        if (renameValue.trim()) {
            setTabNames(prev => ({
                ...prev,
                [tabName]: renameValue.trim()
            }));
        }
        setShowRenameInput(null);
        setRenameValue('');
    };

    const startRename = (tabName: string) => {
        setShowRenameInput(tabName);
        setRenameValue(getTabDisplayName(tabName));
    };

    // Get display name for tabs
    const getTabDisplayName = (tabName: string): string => {
        // Return custom name if exists
        if (tabNames[tabName]) {
            return tabNames[tabName];
        }
        
        const displayNames: { [key: string]: string } = {
            'read': 'Read',
            'highlights': 'Highlights',
            'notes': 'Notes',
            'flashcard': 'Flash Cards',
            'mcq': 'MCQ',
            'q&a': 'Q&A',
            'video': 'Videos',
            'videos': 'Videos',
            'mindmap': 'Mind Maps'
        };
        
        // Handle numbered duplicates
        const baseMatch = tabName.match(/^([a-z]+)(\d+)$/);
        if (baseMatch) {
            const [, baseId, number] = baseMatch;
            const baseName = displayNames[baseId] || baseId;
            return `${baseName} ${number}`;
        }
        
        return displayNames[tabName.toLowerCase()] || tabName;
    };

    // Flash card content renderer
    const renderFlashCardContent = () => {
        return (
            <FlashCardManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="w-full"
            />
        );
    };

    // MCQ content renderer
    const renderMCQContent = () => {
        return (
            <MCQManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="w-full"
            />
        );
    };

    // Q&A content renderer
    const renderQAContent = () => {
        return (
            <QAManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="w-full"
            />
        );
    };

    // Video player handlers
    const handlePlayVideo = (youtubeUrl: string, title: string) => {
        setCurrentVideoData({
            id: Date.now().toString(),
            title: title,
            youtubeUrl: youtubeUrl
        });
        setCurrentVideoMode('play');
        setShowVideoModal(true);
    };

    // Mind Map content renderer
    const renderMindMapContent = () => {
        return (
            <MindMapManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="w-full"
            />
        );
    };

    // Videos content renderer
    const renderVideosContent = () => {
        return (
            <VideosManager 
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="w-full"
            />
        );
    };

    // Render content based on active tab
    const renderTabContent = () => {
        switch (activeTab.toLowerCase()) {
            case 'read':
                return renderReadContent(); // Main content
            case 'highlights':
                return renderHighlightsContent();
            case 'notes':
                return renderNotesContent();
            case 'flashcard':
                return renderFlashCardContent();
            case 'mcq':
                return renderMCQContent();
            case 'q&a':
                return renderQAContent();
            case 'mindmap':
                return renderMindMapContent();
            case 'videos':
                return renderVideosContent();
            default:
                // Handle custom tabs
                return renderCustomTabContent(activeTab);
        }
    };

    const renderReadContent = () => {
        // Show loading state for custom chapters that are still loading
        if (isCustomChapter && isLoadingSubtopics) {
            return (
                <div className="text-center py-12">
                    <div className="w-8 h-8 mx-auto mb-4 animate-spin">
                        <div className="w-full h-full border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
                    </div>
                    <h3 className="text-lg font-medium theme-text mb-2">Loading content...</h3>
                    <p className="theme-text-secondary">Please wait while we load your chapter content</p>
                </div>
            );
        }

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
                                                className="p-4 cursor-pointer hover:theme-surface2 theme-transition"
                                                onClick={() => toggleSubtopic(subtopic)}
                                            >
                                                {/* Desktop Layout - Title and Buttons in Same Row */}
                                                <div className="hidden sm:flex items-center justify-between">
                                                    <h3 className="font-semibold theme-text text-lg">
                                                        {currentUnitNumber}.{index + 1} {subtopic}
                                                    </h3>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
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
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditVideo(subtopic);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 theme-transition"
                                                        >
                                                            Edit Video
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
                                                                        handleDeleteSubtopic(subtopicData.id);
                                                                    }}
                                                                    className="p-1 text-red-600 hover:text-red-800 theme-transition"
                                                                >
                                                                    <TrashIcon />
                                                                </button>
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

                                                {/* Mobile Layout - Title and Buttons in Separate Rows */}
                                                <div className="sm:hidden">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="font-semibold theme-text text-lg pr-2">
                                                            {currentUnitNumber}.{index + 1} {subtopic}
                                                        </h3>
                                                        <svg 
                                                            className={`w-5 h-5 theme-text-secondary transition-transform flex-shrink-0 ${expandedSubtopics.has(subtopic) ? 'rotate-180' : ''}`} 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                    {/* Action buttons in separate compact row */}
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSubtopicExplain(subtopic);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 theme-transition"
                                                        >
                                                            💡 Explain
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleVideoLink(subtopic);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 theme-transition"
                                                        >
                                                            🎥 Video
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditVideo(subtopic);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 theme-transition"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        {/* Edit and Delete buttons for custom subtopics */}
                                                        {isCustomChapter && subtopicData && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingSubtopic(editingSubtopic === subtopicData.id ? null : subtopicData.id);
                                                                    }}
                                                                    className="px-2 py-1 text-xs font-medium rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition"
                                                                >
                                                                    {editingSubtopic === subtopicData.id ? '❌ Cancel' : '✏️ Edit'}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSubtopic(subtopicData.id);
                                                                    }}
                                                                    className="px-2 py-1 text-xs font-medium rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 theme-transition"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Content Section */}
                                        {expandedSubtopics.has(subtopic) && (
                                            <div className="mt-6 mb-8 px-0">
                                                {/* Enhanced Inline Content Editor for Custom Subtopics */}
                                                {isCustomChapter && subtopicData && editingSubtopic === subtopicData.id && (
                                                    <InlineContentEditor
                                                        subtopicId={subtopicData.id}
                                                        initialContent={subtopicData.content}
                                                        images={subtopicData.images}
                                                        imageCaptions={subtopicData.imageCaptions || []}
                                                        onContentUpdate={(content, images, imageCaptions) => 
                                                            handleContentAndImagesUpdate(subtopicData.id, content, images, imageCaptions)
                                                        }
                                                        onImageUpload={(subtopicId, file) => handleImageUpload(subtopicId, file)}
                                                        className="max-w-none"
                                                        isEditing={true}
                                                    />
                                                )}

                                                {/* Display Mode for Custom Subtopics when not editing */}
                                                {isCustomChapter && subtopicData && editingSubtopic !== subtopicData.id && (
                                                    <InlineContentEditor
                                                        subtopicId={subtopicData.id}
                                                        initialContent={subtopicData.content}
                                                        images={subtopicData.images}
                                                        imageCaptions={subtopicData.imageCaptions || []}
                                                        onContentUpdate={(content, images, imageCaptions) => 
                                                            handleContentAndImagesUpdate(subtopicData.id, content, images, imageCaptions)
                                                        }
                                                        onImageUpload={(subtopicId, file) => handleImageUpload(subtopicId, file)}
                                                        className="max-w-none"
                                                        isEditing={false}
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
                                                        onExplainWithAI={handleExplainSelectedText}
                                                    />
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
                {isCustomChapter && customSubtopics.length === 0 && !isLoadingSubtopics && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No subtopics yet</h3>
                        <p className="theme-text-secondary mb-6">Click "Add Subtopic" to get started with your content</p>
                    </div>
                )}

                {/* Empty State for Regular Chapters with no subtopics */}
                {!isCustomChapter && allSubtopics.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No content available</h3>
                        <p className="theme-text-secondary">This chapter doesn't have any subtopics yet</p>
                    </div>
                )}
            </div>
        );
    };

    const renderHighlightsContent = () => {
        const currentHighlights = highlights.filter(h => h.chapterId === currentBook);
        
        return (
            <div className="theme-surface rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text">Highlights & Notes</h2>
                    <span className="text-sm theme-text-secondary">
                        {currentHighlights.length} highlight{currentHighlights.length !== 1 ? 's' : ''}
                    </span>
                </div>
                
                {currentHighlights.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <SparklesIcon />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No highlights yet</h3>
                        <p className="theme-text-secondary">
                            Select text in any tab to create highlights and they'll appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentHighlights.map((highlight) => (
                            <div key={highlight.id} className="border theme-border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span 
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: highlight.color }}
                                            ></span>
                                            <span className="text-xs theme-text-secondary">
                                                {new Date(highlight.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="theme-text leading-relaxed">
                                            "{highlight.text}"
                                        </p>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(highlight.text);
                                            }}
                                            className="text-sm btn-secondary"
                                            title="Copy highlight"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={() => openAIGuru(highlight.text)}
                                            className="text-sm btn-secondary"
                                            title="Explain with AI"
                                        >
                                            🎓
                                        </button>
                                        <button
                                            onClick={() => removeHighlight(highlight.id)}
                                            className="text-sm btn-secondary hover:bg-red-500 hover:text-white"
                                            title="Remove highlight"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderNotesContent = () => {
        return (
            <NotesManager
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="h-full"
            />
        );
    };

    const renderCustomTabContent = (tabName: string) => {
        // Handle Mind Map tab specifically
        if (tabName === 'Mind Map') {
            return (
                <MindMapManager
                    currentBook={currentBook}
                    currentChapter={currentChapter}
                />
            );
        }
        
        // Use RichTextEditor for all other custom tabs (except Flash card which is handled separately)
        return (
            <RichTextEditor
                tabName={tabName}
                currentBook={currentBook}
                currentChapter={currentChapter}
                className="w-full"
            />
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

    // Initialize loading state properly for new chapters
    useEffect(() => {
        if (!isCustomChapter && currentSubtopics.length === 0) {
            setIsLoadingSubtopics(false); // Non-custom chapters don't need loading
        }
    }, [isCustomChapter, currentSubtopics]);

    return (
        <div className="theme-bg min-h-screen theme-text theme-transition">
            {/* Mobile-Optimized Header */}
            <header className="sticky top-0 theme-surface backdrop-blur-sm z-10 p-3 sm:p-4 theme-transition">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button 
                            onClick={() => navigate(`/subject/${encodeURIComponent(currentBook)}`)}
                            className="p-2 rounded-lg hover:theme-surface2 theme-transition touch-manipulation"
                            style={{ minWidth: '44px', minHeight: '44px' }}
                        >
                            <BackIcon />
                        </button>
                        <h1 className="font-semibold text-base sm:text-lg theme-text truncate">
                            {currentChapter}
                        </h1>
                    </div>
                    <button 
                        className="p-2 rounded-lg hover:theme-surface2 theme-transition touch-manipulation"
                        style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                        <AlertIcon />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                {/* Mobile-First Tab Navigation */}
                <div className="py-3 sm:py-4">
                    {/* Mobile: Stacked Layout */}
                    <div className="block sm:hidden space-y-3">
                        {/* Core tabs - full width on mobile */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab('read')}
                                className={`flex-1 px-4 py-3 rounded-lg text-center font-medium transition-all touch-manipulation ${
                                    activeTab === 'read' 
                                        ? 'theme-accent text-white' 
                                        : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                                }`}
                                style={{ minHeight: '44px' }}
                            >
                                📖 Read
                            </button>
                            <button 
                                onClick={() => setActiveTab('highlights')}
                                className={`flex-1 px-4 py-3 rounded-lg text-center font-medium transition-all touch-manipulation ${
                                    activeTab === 'highlights' 
                                        ? 'theme-accent text-white' 
                                        : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                                }`}
                                style={{ minHeight: '44px' }}
                            >
                                ✨ Highlights
                            </button>
                        </div>

                        {/* Active Template Tabs - Mobile Grid */}
                        {activeTabs.filter(tab => tab !== 'read' && tab !== 'highlights').length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {activeTabs.filter(tab => tab !== 'read' && tab !== 'highlights').map((tab) => (
                                    <div key={tab} className="relative">
                                        {showRenameInput === tab ? (
                                            <input
                                                type="text"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleRenameTab(tab);
                                                    } else if (e.key === 'Escape') {
                                                        setShowRenameInput(null);
                                                        setRenameValue('');
                                                    }
                                                }}
                                                onBlur={() => handleRenameTab(tab)}
                                                className="w-full p-2 text-sm theme-surface2 border theme-border rounded-lg theme-text text-center"
                                                style={{ minHeight: '44px' }}
                                                autoFocus
                                            />
                                        ) : (
                                            <div
                                                onClick={() => setActiveTab(tab)}
                                                onDoubleClick={() => startRename(tab)}
                                                className={`w-full px-3 py-3 rounded-lg transition-all group relative text-sm font-medium touch-manipulation cursor-pointer ${
                                                    activeTab === tab 
                                                        ? 'theme-accent text-white' 
                                                        : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                                                }`}
                                                style={{ minHeight: '44px' }}
                                                title="Double-tap to rename, tap × to delete"
                                            >
                                                <span className="block truncate pr-6">{getTabDisplayName(tab)}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTab(tab);
                                                    }}
                                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 opacity-70 hover:opacity-100 hover:text-red-400 transition-opacity text-lg leading-none touch-manipulation"
                                                    title="Delete tab"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Add Template Button - Full width on mobile */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                className="w-full px-4 py-3 rounded-lg border-2 border-dashed theme-border hover:theme-accent-border transition-colors theme-text font-medium touch-manipulation"
                                style={{ minHeight: '44px' }}
                            >
                                ➕ Add Learning Tool
                            </button>
                            
                            {/* Mobile Template Dropdown */}
                            {showTemplateSelector && (
                                <div className="absolute top-full left-0 right-0 mt-2 theme-surface rounded-lg shadow-lg border theme-border z-20">
                                    <div className="p-3">
                                        <div className="text-sm font-semibold theme-text mb-3">Choose Learning Tool:</div>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {availableTemplates.map((template) => {
                                                const templateId = template.toLowerCase().replace(/\s+/g, '');
                                                const hasTemplate = activeTabs.some(tab => tab.startsWith(templateId));
                                                return (
                                                    <button
                                                        key={template}
                                                        onClick={() => handleAddTemplateTab(template)}
                                                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                                                            hasTemplate 
                                                                ? 'theme-surface2 theme-text' 
                                                                : 'theme-accent text-white hover:bg-opacity-90'
                                                        }`}
                                                        style={{ minHeight: '44px' }}
                                                    >
                                                        <div className="text-center">
                                                            <div>{template}</div>
                                                            {hasTemplate && <div className="text-xs opacity-70">Add Another</div>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        <hr className="my-3 theme-border" />
                                        
                                        {/* Custom Tab Option */}
                                        {showAddTab ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={newTabName}
                                                    onChange={(e) => setNewTabName(e.target.value)}
                                                    placeholder="Custom tool name..."
                                                    className="w-full px-3 py-3 text-sm theme-surface2 border theme-border rounded-lg theme-text"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddCustomTab();
                                                        }
                                                    }}
                                                    style={{ minHeight: '44px' }}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleAddCustomTab}
                                                        className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 touch-manipulation"
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowAddTab(false);
                                                            setNewTabName('');
                                                        }}
                                                        className="flex-1 px-3 py-2 text-sm theme-surface2 theme-text rounded hover:theme-accent-bg touch-manipulation"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddTab(true)}
                                                className="w-full px-3 py-3 rounded-lg text-sm hover:theme-accent-bg theme-text font-medium touch-manipulation"
                                                style={{ minHeight: '44px' }}
                                            >
                                                ➕ Custom Tool
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Desktop: Horizontal Layout (unchanged for larger screens) */}
                    <div className="hidden sm:flex flex-wrap gap-2 text-sm border-b theme-border mb-4">
                        {/* Core tabs */}
                        <button 
                            onClick={() => setActiveTab('read')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                activeTab === 'read' 
                                    ? 'theme-accent text-white' 
                                    : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                            }`}
                        >
                            Read
                        </button>
                        <button 
                            onClick={() => setActiveTab('highlights')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                activeTab === 'highlights' 
                                    ? 'theme-accent text-white' 
                                    : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                            }`}
                        >
                            Highlights
                        </button>
                        
                        {/* Active Tabs */}
                        {activeTabs.filter(tab => tab !== 'read' && tab !== 'highlights').map((tab) => (
                            <div key={tab} className="relative">
                                {showRenameInput === tab ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleRenameTab(tab);
                                                } else if (e.key === 'Escape') {
                                                    setShowRenameInput(null);
                                                    setRenameValue('');
                                                }
                                            }}
                                            onBlur={() => handleRenameTab(tab)}
                                            className="px-2 py-1 text-sm theme-surface2 border rounded theme-text min-w-0"
                                            style={{ width: '120px' }}
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setActiveTab(tab)}
                                        onDoubleClick={() => startRename(tab)}
                                        className={`px-4 py-2 rounded-lg transition-all group relative cursor-pointer ${
                                            activeTab === tab 
                                                ? 'theme-accent text-white' 
                                                : 'theme-surface2 theme-text hover:theme-accent-bg hover:text-white'
                                        }`}
                                        title="Double-click to rename, click X to delete"
                                    >
                                        {getTabDisplayName(tab)}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTab(tab);
                                            }}
                                            className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-lg leading-none"
                                            title="Delete tab"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Template Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                className="px-4 py-2 rounded-lg border-2 border-dashed theme-border hover:theme-accent-border transition-colors theme-text"
                            >
                                + Add Template
                            </button>
                            
                            {/* Desktop Template Dropdown */}
                            {showTemplateSelector && (
                                <div className="absolute top-full left-0 mt-2 w-48 theme-surface rounded-lg shadow-lg border theme-border z-20">
                                    <div className="p-2">
                                        <div className="text-sm font-semibold theme-text mb-2">Choose Template:</div>
                                        {availableTemplates.map((template) => {
                                            const templateId = template.toLowerCase().replace(/\s+/g, '');
                                            const hasTemplate = activeTabs.some(tab => tab.startsWith(templateId));
                                            return (
                                                <button
                                                    key={template}
                                                    onClick={() => handleAddTemplateTab(template)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                                                        hasTemplate 
                                                            ? 'theme-muted-bg theme-muted-text cursor-pointer' 
                                                            : 'hover:theme-accent-bg theme-text'
                                                    }`}
                                                >
                                                    {template} {hasTemplate && '(Add Another)'}
                                                </button>
                                            );
                                        })}
                                        
                                        <hr className="my-2 theme-border" />
                                        
                                        {/* Custom Tab Option */}
                                        {showAddTab ? (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={newTabName}
                                                    onChange={(e) => setNewTabName(e.target.value)}
                                                    placeholder="Custom tab name..."
                                                    className="px-2 py-1 text-sm theme-surface2 border rounded theme-text"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddCustomTab();
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={handleAddCustomTab}
                                                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowAddTab(false);
                                                            setNewTabName('');
                                                        }}
                                                        className="px-2 py-1 text-xs theme-muted-bg theme-text rounded hover:theme-accent-bg"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddTab(true)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:theme-accent-bg theme-text"
                                            >
                                                + Custom Tab
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Close template selector when clicking outside */}
                        {showTemplateSelector && (
                            <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => {
                                    setShowTemplateSelector(false);
                                    setShowAddTab(false);
                                    setNewTabName('');
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Tab Content Area */}
                {renderTabContent()}
                
            </main>
            
            {/* Mobile-Optimized AI Guru Button */}
            <button 
                onClick={() => openAIGuru()} 
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 theme-accent rounded-full shadow-lg hover:bg-opacity-90 theme-transition transform hover:scale-110 z-20 touch-manipulation"
                style={{ 
                    width: '56px', 
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <AIGuruIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
            </button>
            
            {/* Close mobile dropdowns when clicking outside */}
            {showTemplateSelector && (
                <div 
                    className="fixed inset-0 z-10 sm:hidden" 
                    onClick={() => {
                        setShowTemplateSelector(false);
                        setShowAddTab(false);
                        setNewTabName('');
                    }}
                />
            )}
            
            {/* YouTube Player Modal */}
            <YouTubePlayerModal
                isOpen={showVideoModal}
                onClose={() => {
                    setShowVideoModal(false);
                    setCurrentVideoData(null);
                    setCurrentSubtopicForVideo('');
                    setCurrentVideoMode('edit');
                }}
                videoData={currentVideoData}
                onSave={handleVideoSave}
                subtopicTitle={currentSubtopicForVideo}
                mode={currentVideoMode}
            />
        </div>
    );
};

export default EnhancedReaderPage;
