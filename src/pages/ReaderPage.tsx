import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, AlertIcon, SparklesIcon, PlayCircleIcon } from '../components/icons';
import { Highlight } from '../types/types';
import { READER_TEXT, chapterSubtopics } from '../constants/constants';
import { AIGuruIcon } from '../components/icons';
import { useTheme } from '../contexts/ThemeContext';

interface ReaderPageProps {
    openAIGuru: (prompt?: string) => void;
    highlights: Highlight[];
    addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
}

// --- Helper to escape regex special characters ---
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ReaderPage: React.FC<ReaderPageProps> = ({ openAIGuru, highlights, addHighlight }) => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const [highlightMenu, setHighlightMenu] = useState<{ top: number; left: number; show: boolean }>({ 
        top: 0, left: 0, show: false 
    });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
    const [renderedHtml, setRenderedHtml] = useState(READER_TEXT);
    const contentRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';
    
    const currentSubtopics = currentChapter && chapterSubtopics[currentBook] 
        ? chapterSubtopics[currentBook][currentChapter] || []
        : [];

    // Determine unit number based on chapter name/position
    const getUnitNumber = (book: string, chapter: string): number => {
        if (!chapterSubtopics[book]) return 1;
        const chapters = Object.keys(chapterSubtopics[book]);
        const chapterIndex = chapters.findIndex(ch => ch === chapter);
        return chapterIndex >= 0 ? chapterIndex + 1 : 1;
    };

    const currentUnitNumber = getUnitNumber(currentBook, currentChapter);

    // Sample content for each subtopic (in a real app, this would come from a database)
    const subtopicContent: Record<string, string> = {
        'What is Object-Oriented Design?': `Elephants are among the most magnificent and intelligent creatures on Earth, representing one of nature's most remarkable evolutionary achievements. These gentle giants have captured human imagination for thousands of years, serving as symbols of wisdom, strength, and memory across countless cultures worldwide. The elephant family consists of three distinct species: the African bush elephant, the African forest elephant, and the Asian elephant, each adapted to their unique environments.

The sheer size of elephants is awe-inspiring, with adult males weighing up to 12,000 pounds and standing nearly 13 feet tall at the shoulder. Their massive bodies are supported by four pillar-like legs, each foot containing a complex cushioning system that allows these giants to move with surprising grace and near-silence through their habitats. The iconic trunk, containing over 40,000 muscles, serves as both a versatile tool and a sensitive organ capable of detecting vibrations and scents from miles away.

What truly sets elephants apart is their remarkable intelligence and emotional depth. These creatures demonstrate self-awareness, problem-solving abilities, and complex social behaviors that rival those of primates. They mourn their dead, celebrate births, and maintain intricate family relationships spanning decades. Their legendary memory isn't just folklore – elephants can remember individuals, locations, and experiences for their entire 60-70 year lifespan, passing crucial survival knowledge through generations in their matriarchal societies.`,

        'Benefits of OOD': `The relationship between elephants and humans spans millennia, weaving through the tapestry of human civilization like golden threads through ancient silk. Archaeological evidence suggests that early humans coexisted with elephant ancestors over two million years ago, when massive creatures like the woolly mammoth roamed the frozen landscapes of the Ice Age. Cave paintings in France and Spain, dating back 30,000 years, depict these magnificent beasts alongside human hunters, showcasing the profound impact elephants had on early human culture.

In ancient civilizations, elephants transcended their role as mere animals to become symbols of power, wisdom, and divine connection. The ancient Egyptians revered elephants as sacred creatures, associating them with the god Seth and incorporating their ivory into religious ceremonies and royal regalia. Hindu mythology elevated the elephant to divine status through Ganesha, the beloved elephant-headed deity who removes obstacles and brings good fortune to millions of devotees worldwide.

The military use of elephants revolutionized ancient warfare, most famously demonstrated by Hannibal's crossing of the Alps with 37 war elephants in 218 BCE. These living tanks could break enemy lines and strike terror into opposing forces, though they proved as dangerous to their own armies as to their enemies. Asian kingdoms from India to Thailand developed sophisticated elephant training programs, creating an entire culture around these magnificent war machines that influenced military strategy for over a millennium.`,

        'Object-Oriented vs Procedural Programming': `Understanding elephants requires grasping several fundamental concepts that define their existence and behavior in the wild. The matriarchal social structure forms the cornerstone of elephant society, where experienced female leaders guide their herds through seasonal migrations, locate water sources during droughts, and make crucial decisions that determine the survival of entire families. These matriarchs, often the oldest and largest females, possess decades of accumulated wisdom that they pass down through generations.

Communication among elephants operates on multiple sophisticated levels that scientists are still working to fully understand. Beyond the obvious trumpet calls that can be heard for miles, elephants communicate through infrasonic rumbles below human hearing range, ground vibrations detected through specialized cells in their feet and trunks, and complex body language involving ear positions, trunk movements, and tail gestures. This multi-modal communication system allows herds to coordinate activities across vast distances and maintain social bonds even when separated.

The concept of ecological keystone species perfectly describes elephants' role in their ecosystems. As they move through forests and savannas, elephants create pathways used by countless other species, disperse seeds across hundreds of miles, and shape entire landscapes through their feeding habits. Their dung provides fertile ground for new plant growth and serves as habitat for numerous insects and small animals. When elephants disappear from an ecosystem, the ripple effects cascade through the entire environmental web, often leading to biodiversity collapse and habitat degradation.`,

        'History of OOP': `Modern elephant conservation represents one of the most complex and multifaceted applications of wildlife science, combining cutting-edge technology with traditional ecological knowledge to protect these magnificent creatures. GPS collar tracking systems provide researchers with unprecedented insights into elephant migration patterns, allowing conservationists to identify critical corridors and seasonal feeding areas that require protection. Satellite imagery combined with artificial intelligence algorithms can now detect and count elephant populations across vast landscapes, providing accurate census data crucial for management decisions.

The application of elephant intelligence in conservation efforts has yielded remarkable results, particularly in human-elephant conflict mitigation programs. Farmers in Kenya and India now use bee-fence technology, exploiting elephants' natural fear of bees to create effective, non-harmful barriers around crops. Early warning systems using seismic sensors detect approaching elephant herds and alert communities, allowing people to take preventive measures without harming the animals. These innovative applications demonstrate how understanding animal behavior can create win-win solutions for both humans and wildlife.

Tourism applications centered around elephants generate billions of dollars annually while funding conservation programs across Africa and Asia. Ethical elephant viewing experiences provide economic incentives for local communities to protect these animals rather than poach them for ivory. Educational programs in zoos and wildlife parks use elephants as ambassadors for their species, teaching millions of visitors about conservation challenges and inspiring the next generation of wildlife protectors through direct encounters with these remarkable creatures.`,

        'UML Introduction': `One of the most compelling examples of elephant intelligence occurred at Amboseli National Park in Kenya, where researchers documented a matriarch named Echo leading her family to a rarely used water source during a severe drought. What made this remarkable was that Echo hadn't visited this location for over fifteen years, yet she remembered its exact location and led her entire herd across dangerous territory to reach it. This journey saved the lives of twelve family members, including three young calves, demonstrating the practical value of elephant memory in survival situations.

Another extraordinary example comes from Thailand's Elephant Nature Park, where a rescued elephant named Jokia, despite being blind, serves as a guide and protector for other disabled elephants in the sanctuary. Jokia uses her trunk to lead her friend Mae Perm, who suffers from severe arthritis, to food sources and comfortable resting spots. This example illustrates the remarkable empathy and caregiving behaviors that elephants display toward members of their community, even those who are not blood relatives.

The famous elephant paintings at Thailand's Maesa Elephant Camp provide a fascinating example of these animals' cognitive abilities and dexterity. While controversial due to training methods, elephants like Suda have created hundreds of paintings, some selling for thousands of dollars to support elephant conservation. Whether the elephants understand art in human terms remains debatable, but their ability to hold brushes, select colors, and create recognizable images demonstrates remarkable motor control and perhaps even aesthetic preferences in these incredible creatures.`,

        'Classes and Objects': `The Tsavo elephant population in Kenya presents one of conservation's most remarkable success stories, demonstrating how dedicated protection efforts can bring a species back from the brink of extinction. In the 1970s, rampant poaching reduced Tsavo's elephant population from 45,000 to fewer than 6,000 individuals. The Kenya Wildlife Service, working with international partners, implemented aggressive anti-poaching measures, community engagement programs, and habitat restoration projects that have helped the population recover to over 15,000 elephants today.

This recovery wasn't without challenges. The case study reveals how human-elephant conflict increased as populations grew and expanded into traditional migration routes now occupied by human settlements. Innovative solutions emerged, including the development of chili-pepper fences that use elephants' sensitive trunks against them, creating effective barriers without causing harm. Community conservancies now employ former poachers as elephant guardians, providing alternative livelihoods while protecting the very animals they once hunted.

The psychological trauma experienced by elephants during the poaching crisis created unexpected challenges for conservationists. Young elephants who witnessed their mothers' deaths exhibited aggressive behaviors toward humans and other elephants, disrupting normal social structures. Rehabilitation programs developed specialized techniques to help traumatized elephants reintegrate into healthy family groups, often involving the introduction of surrogate matriarchs who could provide the guidance and stability that orphaned elephants desperately needed for their psychological and social development.`,

        'Attributes and Operations': `The neurological complexity of elephant brains presents fascinating parallels to human cognition while revealing unique adaptations that have evolved over millions of years. Elephant brains weigh approximately 12 pounds and contain over 250 billion neurons, three times more than human brains. The highly developed hippocampus, responsible for memory formation, is proportionally much larger in elephants than in humans, explaining their extraordinary ability to remember locations, individuals, and experiences across their lengthy lifespans.

Recent advances in elephant cognition research have revealed sophisticated problem-solving abilities that challenge our understanding of animal intelligence. Elephants demonstrate metacognition – the ability to think about their own thinking – when they assess their capabilities before attempting tasks. In controlled experiments, elephants will refuse to participate in activities they recognize as beyond their physical abilities, suggesting a level of self-awareness previously attributed only to humans, great apes, and dolphins.

The emerging field of elephant communication studies has uncovered a complex language system that includes grammatical structures and regional dialects. Different elephant populations across Africa have distinct "accents" in their vocalizations, and families develop unique greeting ceremonies and call-and-response patterns. Long-distance infrasonic communication allows elephants to coordinate activities across territories spanning hundreds of square miles, with some messages carrying information about food sources, danger, and mating opportunities to receivers over 20 kilometers away.`,

        'Relationships': `Successful elephant conservation requires implementing comprehensive best practices that address the multifaceted challenges these magnificent creatures face in the modern world. Habitat connectivity stands as perhaps the most critical component, as elephants require vast territories that often span multiple countries and jurisdictions. Conservation organizations have developed innovative corridor management strategies that work with local communities to maintain traditional migration routes, often compensating farmers for crop damage while providing incentives to keep pathways open.

Community-based conservation represents the gold standard for sustainable elephant protection, recognizing that local people must benefit from conservation efforts for them to succeed long-term. Programs in Namibia and Botswana have demonstrated how communities can manage elephant populations as valuable natural resources, generating income through carefully regulated tourism and trophy hunting while maintaining healthy population levels. These initiatives provide alternative livelihoods for people who might otherwise turn to poaching for economic survival.

Anti-poaching strategies have evolved from simple patrols to sophisticated operations involving aerial surveillance, rapid response teams, and intelligence networks that target the international ivory trade at its source. Modern conservation employs former military personnel, advanced communication systems, and even specially trained dogs to detect ivory at ports and airports. Perhaps most importantly, demand reduction campaigns in consumer countries like China have begun changing cultural attitudes toward ivory products, addressing the root economic drivers that fuel the poaching crisis threatening elephant populations across Africa.`,

        'Inheritance Hierarchies': `One of the most significant pitfalls in elephant conservation involves the well-intentioned but ultimately harmful practice of relocating problem elephants without addressing underlying causes of human-elephant conflict. Moving elephants to new areas often simply transfers the conflict to different communities while causing severe psychological stress to the animals. Elephants have strong attachments to their home ranges and family groups, and relocated individuals frequently attempt dangerous journeys back to their original territories or fail to integrate successfully into new environments.

The oversimplification of elephant behavior by tourists and even some conservationists creates unrealistic expectations and potentially dangerous situations. Elephants are not gentle giants who welcome human interaction – they are powerful wild animals with complex emotions and unpredictable responses to stress or threat. Tourist activities that promise close contact with elephants often involve cruel training methods and unhealthy living conditions that compromise animal welfare while perpetuating misconceptions about appropriate human-elephant relationships.

Fragmentary conservation approaches that focus solely on protecting elephants while ignoring broader ecosystem health often lead to long-term failure. Elephants require intact landscapes with diverse plant communities, adequate water sources, and minimal human disturbance. Conservation projects that create isolated elephant populations in small reserves frequently result in habitat degradation from overuse, increased human-elephant conflict at reserve boundaries, and genetic isolation that reduces population viability. Successful elephant conservation demands landscape-scale thinking that considers the needs of entire ecosystems rather than single species in isolation.`,

        'Packages and Modules': `The future of elephant conservation increasingly relies on technological innovations that promise to revolutionize how we study, protect, and coexist with these magnificent creatures. Artificial intelligence systems now analyze thousands of hours of elephant vocalizations to decode their complex communication patterns, potentially unlocking secrets of elephant language that could inform conservation strategies. Advanced genetic sequencing techniques help researchers track elephant populations, identify individuals from dung samples, and understand genetic diversity within fragmented populations, providing crucial data for breeding programs and population management decisions.

Climate change presents both challenges and opportunities for elephant conservation, as shifting weather patterns alter traditional migration routes and seasonal feeding areas. Future conservation strategies must incorporate climate modeling to predict how elephant habitats will change over the coming decades and develop adaptive management plans that help both elephants and human communities adjust to new environmental realities. This includes identifying and protecting climate refugia where elephants can find food and water during extreme weather events that are becoming increasingly common.

The emerging concept of "elephant-friendly" development promises to transform how humans plan and construct infrastructure in elephant habitats. Future urban planning in elephant range countries will incorporate wildlife corridors, elephant-proof building designs, and early warning systems that prevent dangerous encounters. Agricultural innovations including elephant-deterrent crops, automated warning systems, and alternative livelihood programs for communities living near elephant populations will create sustainable coexistence models that benefit both humans and elephants while preserving the natural landscapes both species need to thrive.`
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

    // Simple text selection handler
    useEffect(() => {
        const handleSelection = () => {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    // Check if selection is within content area
                    const target = range.commonAncestorContainer;
                    const contentArea = target.nodeType === Node.TEXT_NODE 
                        ? target.parentElement?.closest('.selectable-content')
                        : (target as Element)?.closest('.selectable-content');
                    
                    if (contentArea) {
                        setShowColorPicker(false);
                        setShowNoteInput(false);
                        
                        // Position menu above selection
                        let top = window.scrollY + rect.top - 70;
                        let left = window.scrollX + rect.left + (rect.width / 2) - 125;
                        
                        // Keep menu within viewport
                        const viewportWidth = window.innerWidth;
                        if (left < 10) left = 10;
                        if (left + 250 > viewportWidth) left = viewportWidth - 260;
                        if (top < 70) top = window.scrollY + rect.bottom + 10;
                        
                        setHighlightMenu({
                            top: top,
                            left: left,
                            show: true
                        });
                    }
                }
            }, 100);
        };

        // Listen for text selection
        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('touchend', handleSelection);

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
        };
    }, []);

    const hideMenu = useCallback(() => {
        setHighlightMenu(prev => ({ ...prev, show: false }));
    }, []);

    const renderSubtopicContent = (subtopic: string) => {
        let content = subtopicContent[subtopic] || 'Content for this subtopic will be added soon. Click the Explain button above for an AI explanation.';
        
        // Wrap in paragraph with proper styling
        const styledContent = `<p class="theme-text-secondary leading-relaxed text-justify" style="line-height: 1.8; font-size: 15px; font-family: Georgia, serif;">${content}</p>`;
        
        // Apply highlights to this content
        const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);
        let html = styledContent;
        
        chapterHighlights.forEach(highlight => {
            let highlightStyle = '';
            switch(highlight.color) {
                case 'yellow':
                    highlightStyle = 'background-color: rgba(255, 235, 59, 0.6); padding: 2px; border-radius: 3px;';
                    break;
                case 'green':
                    highlightStyle = 'background-color: rgba(76, 175, 80, 0.6); padding: 2px; border-radius: 3px;';
                    break;
                case 'blue':
                    highlightStyle = 'background-color: rgba(33, 150, 243, 0.6); padding: 2px; border-radius: 3px;';
                    break;
                case 'red':
                    highlightStyle = 'background-color: rgba(244, 67, 54, 0.6); padding: 2px; border-radius: 3px;';
                    break;
                default:
                    highlightStyle = 'background-color: rgba(255, 235, 59, 0.6); padding: 2px; border-radius: 3px;';
            }
            if (content.includes(highlight.text)) {
                const markElement = `<mark style="${highlightStyle}" data-highlight-id="${highlight.id}">${highlight.text}</mark>`;
                html = html.replace(new RegExp(escapeRegExp(highlight.text), 'g'), markElement);
            }
        });
        
        return html;
    };

    const handleMouseUp = useCallback((e: React.MouseEvent | MouseEvent) => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            // Check if selection is within any selectable content area
            const target = e.target as HTMLElement;
            const selectableContent = target.closest('.selectable-content, .content-wrapper');
            
            if (selectableContent) {
                // Prevent default browser selection menu on mobile
                e.preventDefault();
                
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const containerRect = selectableContent.getBoundingClientRect();

                setShowColorPicker(false);
                setShowNoteInput(false);
                
                // Calculate position with screen bounds checking
                let top = rect.top - containerRect.top - 80;
                let left = rect.left - containerRect.left + rect.width / 2 - 125; // Center the menu better
                
                // Ensure menu stays within bounds
                if (left < 10) left = 10;
                if (left > containerRect.width - 250) left = containerRect.width - 250;
                if (top < 10) top = rect.bottom - containerRect.top + 10;
                
                setHighlightMenu({
                    top: rect.top + window.scrollY - 80,
                    left: rect.left + window.scrollX + rect.width / 2 - 125,
                    show: true
                });
            }
        }
    }, []);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        // Prevent default to avoid browser selection menu
        e.preventDefault();
        
        // Small delay to allow selection to complete
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const target = e.target as HTMLElement;
                const selectableContent = target.closest('.selectable-content, .content-wrapper');
                
                if (selectableContent) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    setShowColorPicker(false);
                    setShowNoteInput(false);
                    
                    // Position menu above selection for mobile
                    let top = window.scrollY + rect.top - 80;
                    let left = window.scrollX + rect.left + (rect.width / 2) - 125;
                    
                    // Ensure menu stays within viewport bounds
                    const viewportWidth = window.innerWidth;
                    if (left < 10) left = 10;
                    if (left + 250 > viewportWidth) left = viewportWidth - 260;
                    if (top < 10) top = window.scrollY + rect.bottom + 10;
                    
                    setHighlightMenu({
                        top: top,
                        left: left,
                        show: true
                    });
                }
            }
        }, 150); // Increased delay for mobile
    }, []);

    // Handle click outside to hide menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setHighlightMenu({ top: 0, left: 0, show: false });
                setShowColorPicker(false);
                setShowNoteInput(false);
                window.getSelection()?.removeAllRanges();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Add CSS for text selection and highlighting
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .selectable-content {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
            
            .selectable-content::selection {
                background: rgba(59, 130, 246, 0.2);
            }
            .selectable-content::-moz-selection {
                background: rgba(59, 130, 246, 0.2);
            }
            
            /* Highlight styles */
            .highlight-yellow {
                background: linear-gradient(120deg, rgba(255, 235, 59, 0.4) 0%, rgba(255, 235, 59, 0.6) 100%) !important;
                padding: 1px 2px;
                border-radius: 2px;
            }
            
            .highlight-green {
                background: linear-gradient(120deg, rgba(76, 175, 80, 0.4) 0%, rgba(76, 175, 80, 0.6) 100%) !important;
                padding: 1px 2px;
                border-radius: 2px;
            }
            
            .highlight-blue {
                background: linear-gradient(120deg, rgba(33, 150, 243, 0.4) 0%, rgba(33, 150, 243, 0.6) 100%) !important;
                padding: 1px 2px;
                border-radius: 2px;
            }
            
            .highlight-red {
                background: linear-gradient(120deg, rgba(244, 67, 54, 0.4) 0%, rgba(244, 67, 54, 0.6) 100%) !important;
                padding: 1px 2px;
                border-radius: 2px;
            }
            
            .highlight-menu {
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(8px);
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    const applyHighlight = (color: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            hideMenu();
            return;
        }

        try {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString().trim();
            
            if (selectedText.length === 0) {
                hideMenu();
                return;
            }
            
            // Create highlight span with proper styling
            const span = document.createElement('span');
            span.className = `highlight-${color}`;
            span.setAttribute('data-highlight-id', Date.now().toString());
            span.setAttribute('data-highlight-color', color);
            span.style.backgroundColor = getColorStyle(color);
            span.style.padding = '2px 4px';
            span.style.borderRadius = '3px';
            span.style.boxDecorationBreak = 'clone';
            
            // Wrap the selected text
            try {
                range.surroundContents(span);
            } catch (e) {
                // Fallback for complex selections
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
            
            // Save to highlights store
            addHighlight({ 
                text: selectedText, 
                color, 
                chapterId: currentBook
            });
            
            console.log(`✅ Text highlighted with ${color}: "${selectedText}"`);
            
        } catch (error) {
            console.error('Highlighting failed:', error);
        } finally {
            // Clear selection and hide menu
            setTimeout(() => {
                if (selection) {
                    selection.removeAllRanges();
                }
            }, 100);
            hideMenu();
            setShowColorPicker(false);
        }
    };

    // Helper function to get color styles
    const getColorStyle = (color: string): string => {
        const colorMap: Record<string, string> = {
            'yellow': 'rgba(255, 235, 59, 0.6)',
            'green': 'rgba(76, 175, 80, 0.6)',
            'blue': 'rgba(33, 150, 243, 0.6)',
            'red': 'rgba(244, 67, 54, 0.6)'
        };
        return colorMap[color] || colorMap['yellow'];
    };
    
    const addNote = () => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && noteText.trim()) {
            const text = selection.toString().trim();
            if (text.length > 0) {
                // In a real app, this would save the note to a database
                addHighlight({ text, color: 'blue', chapterId: currentBook }); // Using blue for notes
                console.log('Note added:', { text, note: noteText });
                
                setTimeout(() => {
                    selection.removeAllRanges();
                }, 100);
            }
            setNoteText('');
        }
        setShowNoteInput(false);
        hideMenu();
    };
    
    const handleExplain = () => {
        const selection = window.getSelection();
        if (selection) {
            const selectedText = selection.toString().trim();
            if (selectedText) {
                openAIGuru(selectedText);
            }
        }
        hideMenu();
    };

    const handleSubtopicExplain = (subtopic: string) => {
        openAIGuru(`Explain "${subtopic}" from ${currentChapter} chapter of ${currentBook} subject in detail.`);
    };

    const handleVideoLink = (subtopic: string) => {
        console.log(`Video for: ${subtopic} from ${currentChapter} - ${currentBook}`);
        alert(`Video feature for "${subtopic}" will be implemented with YouTube links later.`);
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
                <div className="py-4 flex flex-wrap gap-2 text-sm">
                    <button className="btn-secondary">Read</button>
                    <button 
                        onClick={() => navigate(`/practice/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)} 
                        className="btn-secondary hover:btn-primary"
                    >
                        Practice
                    </button>
                    <button className="btn-secondary">NCERT Solutions</button>
                    <button 
                        onClick={() => navigate(`/highlights/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)} 
                        className="btn-secondary"
                    >
                        Highlights & Notes
                    </button>
                </div>

                {/* Subtopics - Expandable with individual content */}
                {currentSubtopics.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold theme-text mb-4">
                            Chapter Topics ({currentSubtopics.length})
                        </h2>
                        <div className="space-y-4">
                            {currentSubtopics.map((subtopic, index) => (
                                <div key={index} className="theme-transition">
                                    {/* Keep box styling for subtopic headers */}
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
                                    
                                    {/* Content outside the box */}
                                    {expandedSubtopics.has(subtopic) && (
                                        <div className="mt-6 mb-8 px-0">
                                            <div 
                                                className="prose prose-sm sm:prose-base lg:prose-lg max-w-none theme-text selectable-content"
                                                key={`${subtopic}-${highlights.length}`}
                                                dangerouslySetInnerHTML={{ 
                                                    __html: renderSubtopicContent(subtopic) 
                                                }}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div 
                    className="relative pb-16 content-wrapper" 
                    ref={contentRef}
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                >
                    {highlightMenu.show && (
                        <div 
                            ref={menuRef} 
                            className="highlight-menu fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700"
                            style={{ 
                                top: `${highlightMenu.top}px`, 
                                left: `${highlightMenu.left}px`,
                                minWidth: '250px',
                                maxWidth: '90vw'
                            }}
                        >
                            {showColorPicker ? (
                                <div className="flex items-center gap-2 p-3">
                                    <span className="text-xs text-gray-600 dark:text-gray-300 mr-2">Color:</span>
                                    <button onClick={() => applyHighlight('yellow')} className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Yellow"></button>
                                    <button onClick={() => applyHighlight('green')} className="w-6 h-6 bg-green-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Green"></button>
                                    <button onClick={() => applyHighlight('blue')} className="w-6 h-6 bg-blue-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Blue"></button>
                                    <button onClick={() => applyHighlight('red')} className="w-6 h-6 bg-red-400 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform" title="Red"></button>
                                    <button onClick={() => setShowColorPicker(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2">✕</button>
                                </div>
                            ) : showNoteInput ? (
                                <div className="p-3 w-64">
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="Write your note..."
                                        className="w-full h-16 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-gray-600 resize-none mb-2"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowNoteInput(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
                                        <button onClick={addNote} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <button 
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-r border-gray-200 dark:border-gray-600"
                                        onClick={() => setShowColorPicker(true)}
                                    >
                                        <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                                        Highlight
                                    </button>
                                    <button 
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-r border-gray-200 dark:border-gray-600"
                                        onClick={() => setShowNoteInput(true)}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Notes
                                    </button>
                                    <button 
                                        onClick={handleExplain} 
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                        <SparklesIcon className="w-3 h-3 text-purple-400"/>
                                        Explain
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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

export default ReaderPage;
