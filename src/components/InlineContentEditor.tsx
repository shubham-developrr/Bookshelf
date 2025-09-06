import React, { useState, useRef } from 'react';
import { PlusIcon, TrashIcon } from './icons';
import KindleStyleTextViewer from './KindleStyleTextViewerFixed';

/**
 * @interface ContentBlock
 * @description Defines the structure of a content block, which can be either text or an image.
 * @property {string} id - The unique identifier for the content block.
 * @property {'text' | 'image'} type - The type of the content block.
 * @property {string} content - The text content or image URL.
 * @property {number} position - The position of the block in the content flow.
 */
interface ContentBlock {
    id: string;
    type: 'text' | 'image';
    content: string; // text content or image URL
    position: number;
}

/**
 * @interface InlineContentEditorProps
 * @description Defines the props for the InlineContentEditor component.
 * @property {string} subtopicId - The ID of the subtopic being edited.
 * @property {string} initialContent - The initial text content.
 * @property {string[]} images - An array of image URLs.
 * @property {string[]} [imageCaptions] - An optional array of image captions.
 * @property {function} onContentUpdate - Callback function to update the content.
 * @property {function} onImageUpload - Callback function to handle image uploads.
 * @property {string} [className] - An optional class name for the component.
 * @property {boolean} [isEditing] - Whether the editor is in editing mode.
 * @property {Array<object>} [highlights] - An optional array of highlight objects.
 * @property {string} [currentBook] - The name of the current book.
 * @property {function} [onHighlight] - Callback function to handle text highlighting.
 * @property {function} [onRemoveHighlight] - Callback function to remove a highlight.
 * @property {function} [onExplainWithAI] - Callback function to explain text with AI.
 */
interface InlineContentEditorProps {
    subtopicId: string;
    initialContent: string;
    images: string[];
    imageCaptions?: string[];
    onContentUpdate: (content: string, images: string[], imageCaptions: string[]) => void;
    onImageUpload: (subtopicId: string, file: File) => void;
    className?: string;
    isEditing?: boolean;
    // Add props for highlighting functionality
    highlights?: Array<{
        id: string;
        text: string;
        color: string;
        chapterId: string;
    }>;
    currentBook?: string;
    onHighlight?: (text: string, color: string) => void;
    onRemoveHighlight?: (highlightId: string) => void;
    onExplainWithAI?: (text: string, context: string) => void;
}

/**
 * @description A component for editing and displaying inline content, including text and images, with support for highlighting.
 * @param {InlineContentEditorProps} props - The props for the component.
 * @returns {JSX.Element} The inline content editor component.
 */
const InlineContentEditor: React.FC<InlineContentEditorProps> = ({
    subtopicId,
    initialContent,
    images,
    imageCaptions = [],
    onContentUpdate,
    onImageUpload,
    className = '',
    isEditing = true,
    highlights = [],
    currentBook = '',
    onHighlight,
    onRemoveHighlight,
    onExplainWithAI
}) => {
    const [isEditingState, setIsEditingState] = useState(isEditing);
    const [textBlocks, setTextBlocks] = useState<string[]>(
        initialContent ? initialContent.split('\n\n') : ['']
    );
    const [currentImageCaptions, setCurrentImageCaptions] = useState<string[]>(
        imageCaptions.length > 0 ? imageCaptions : images.map(() => '')
    );
    
    const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

    /**
     * @description Initializes the content blocks from the initial text and images.
     * @returns {ContentBlock[]} An array of content blocks.
     */
    const initializeContentBlocks = (): ContentBlock[] => {
        const blocks: ContentBlock[] = [];
        let position = 0;

        // Add text blocks
        textBlocks.forEach((text, index) => {
            if (text.trim()) {
                blocks.push({
                    id: `text-${index}`,
                    type: 'text',
                    content: text,
                    position: position++
                });
            }
        });

        // Add image blocks (for now, they go at the end, but can be reordered)
        images.forEach((img, index) => {
            blocks.push({
                id: `image-${index}`,
                type: 'image',
                content: img,
                position: position++
            });
        });

        return blocks.sort((a, b) => a.position - b.position);
    };

    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(initializeContentBlocks());

    /**
     * @description Handles changes to a text block.
     * @param {number} blockIndex - The index of the text block to update.
     * @param {string} newText - The new text for the block.
     */
    const handleTextChange = (blockIndex: number, newText: string) => {
        const updatedBlocks = textBlocks.map((block, index) => 
            index === blockIndex ? newText : block
        );
        setTextBlocks(updatedBlocks);
    };

    /**
     * @description Adds a new text block after the specified index.
     * @param {number} afterIndex - The index after which to add the new text block.
     */
    const addTextBlock = (afterIndex: number) => {
        const newBlocks = [...textBlocks];
        newBlocks.splice(afterIndex + 1, 0, '');
        setTextBlocks(newBlocks);
        
        // Focus the new textarea after render
        setTimeout(() => {
            textareaRefs.current[afterIndex + 1]?.focus();
        }, 100);
    };

    /**
     * @description Removes a text block at the specified index.
     * @param {number} blockIndex - The index of the text block to remove.
     */
    const removeTextBlock = (blockIndex: number) => {
        if (textBlocks.length > 1) {
            const updatedBlocks = textBlocks.filter((_, index) => index !== blockIndex);
            setTextBlocks(updatedBlocks);
        }
    };

    /**
     * @description Opens a file dialog to add an image at the specified position.
     * @param {number} afterIndex - The index after which to add the new image.
     */
    const addImageAtPosition = (afterIndex: number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                onImageUpload(subtopicId, file);
                // The parent component will handle updating the images array
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    };

    /**
     * @description Adds a new text block at the specified position.
     * @param {number} afterIndex - The index after which to add the new text block.
     */
    const addTextBlockAtPosition = (afterIndex: number) => {
        const newBlocks = [...textBlocks];
        newBlocks.splice(afterIndex + 1, 0, '');
        setTextBlocks(newBlocks);
        
        // Focus the new textarea after render
        setTimeout(() => {
            textareaRefs.current[afterIndex + 1]?.focus();
        }, 0);
    };

    /**
     * @description Updates the caption for an image.
     * @param {number} imageIndex - The index of the image to update.
     * @param {string} caption - The new caption for the image.
     */
    const updateImageCaption = (imageIndex: number, caption: string) => {
        const updatedCaptions = [...currentImageCaptions];
        updatedCaptions[imageIndex] = caption;
        setCurrentImageCaptions(updatedCaptions);
        onContentUpdate(textBlocks.join('\n\n'), images, updatedCaptions);
    };

    /**
     * @description Removes an image at the specified index.
     * @param {number} imageIndex - The index of the image to remove.
     */
    const removeImage = (imageIndex: number) => {
        if (confirm('Are you sure you want to delete this image?')) {
            const updatedImages = images.filter((_, index) => index !== imageIndex);
            const updatedCaptions = currentImageCaptions.filter((_, index) => index !== imageIndex);
            setCurrentImageCaptions(updatedCaptions);
            onContentUpdate(textBlocks.join('\n\n'), updatedImages, updatedCaptions);
        }
    };

    /**
     * @description Moves an image up or down in the content flow.
     * @param {number} imageIndex - The index of the image to move.
     * @param {'up' | 'down'} direction - The direction to move the image.
     */
    const moveImage = (imageIndex: number, direction: 'up' | 'down') => {
        const updatedImages = [...images];
        const updatedCaptions = [...currentImageCaptions];
        const newIndex = direction === 'up' ? imageIndex - 1 : imageIndex + 1;
        
        if (newIndex >= 0 && newIndex < images.length) {
            [updatedImages[imageIndex], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[imageIndex]];
            [updatedCaptions[imageIndex], updatedCaptions[newIndex]] = [updatedCaptions[newIndex], updatedCaptions[imageIndex]];
            setCurrentImageCaptions(updatedCaptions);
            onContentUpdate(textBlocks.join('\n\n'), updatedImages, updatedCaptions);
        }
    };

    /**
     * @description Saves the content and exits editing mode.
     */
    const handleSave = () => {
        const content = textBlocks.join('\n\n');
        onContentUpdate(content, images, currentImageCaptions);
        setIsEditingState(false);
    };

    if (!isEditingState) {
        // Display mode - render content with text highlighting functionality
        return (
            <div 
                className={`prose prose-sm sm:prose-base lg:prose-lg max-w-none theme-text ${className}`} 
                style={{
                    lineHeight: '1.6'
                } as React.CSSProperties}
            >
                <div 
                    className="space-y-0" 
                    style={{
                        gap: '0', 
                        display: 'flex', 
                        flexDirection: 'column'
                    }}
                >
                    {/* Render text blocks with highlighting if we have callbacks */}
                    {textBlocks.map((textBlock, textIndex) => (
                        <div key={`text-${textIndex}`} className="mb-0" style={{margin: '0', padding: '0'}}>
                            {/* Render text block if it has content */}
                            {textBlock.trim() && (
                                onExplainWithAI ? (
                                    // Use KindleStyleTextViewer for highlighting functionality
                                    <div style={{margin: '0', padding: '0'}}>
                                        <KindleStyleTextViewer
                                            content={textBlock}
                                            highlights={highlights || []}
                                            currentBook={currentBook}
                                            onHighlight={onHighlight}
                                            onRemoveHighlight={onRemoveHighlight}
                                            onExplainWithAI={onExplainWithAI}
                                            className="subtopic-content-enhanced"
                                        />
                                    </div>
                                ) : (
                                    // Simple text display if no highlighting needed
                                    <div className="whitespace-pre-wrap mb-0 leading-relaxed" style={{margin: '0', padding: '0'}}>{textBlock}</div>
                                )
                            )}
                        </div>
                    ))}
                    
                    {/* Render all images in sequence after content */}
                    {images.length > 0 && (
                        <div className="space-y-6 mt-6">
                            {images.map((img, imgIndex) => (
                                <div key={`image-${imgIndex}`} className="text-center">
                                    <img
                                        src={img}
                                        alt={currentImageCaptions[imgIndex] || `Content image ${imgIndex + 1}`}
                                        className="max-w-full h-auto max-h-96 object-contain rounded-lg shadow-md mx-auto"
                                    />
                                    {/* Image Caption */}
                                    {currentImageCaptions[imgIndex] && (
                                        <p className="text-sm theme-text-secondary mt-2 italic">
                                            {currentImageCaptions[imgIndex]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <button
                    onClick={() => setIsEditingState(true)}
                    className="mt-4 px-4 py-2 text-sm theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                >
                    Edit Content
                </button>
            </div>
        );
    }

    // Edit mode - render editable interface
    return (
        <div className={`space-y-4 ${className}`}>
            <h4 className="text-sm font-medium theme-text-secondary">Edit Content (Images will be inserted between text blocks)</h4>
            
            {textBlocks.map((textBlock, blockIndex) => (
                <div key={`edit-${blockIndex}`} className="space-y-2">
                    {/* Text Editor */}
                    <div className="relative">
                        <textarea
                            ref={(el) => textareaRefs.current[blockIndex] = el}
                            value={textBlock}
                            onChange={(e) => handleTextChange(blockIndex, e.target.value)}
                            placeholder={blockIndex === 0 ? "Enter content..." : "Additional text block..."}
                            className="w-full p-3 theme-surface border theme-border rounded-lg theme-text resize-y min-h-[100px]"
                        />
                        
                        {/* Text Block Controls */}
                        <div className="absolute top-2 right-2 flex gap-1 bg-black/20 rounded-md p-1">
                            <button
                                onClick={() => addTextBlock(blockIndex)}
                                className="p-1 text-green-400 hover:text-green-300 theme-transition"
                                title="Add text block below"
                            >
                                <PlusIcon />
                            </button>
                            {textBlocks.length > 1 && (
                                <button
                                    onClick={() => removeTextBlock(blockIndex)}
                                    className="p-1 text-red-400 hover:text-red-300 theme-transition"
                                    title="Remove text block"
                                >
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Insertion Controls */}
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => addTextBlockAtPosition(blockIndex)}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 theme-transition flex items-center gap-1"
                        >
                            <PlusIcon />
                            Insert Text Here
                        </button>
                        <button
                            onClick={() => addImageAtPosition(blockIndex)}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition flex items-center gap-1"
                        >
                            <PlusIcon />
                            Insert Image Here
                        </button>
                    </div>
                    
                    {/* Show images that will appear after this text block */}
                    {images.slice(blockIndex, blockIndex + 1).map((img, imgRelativeIndex) => {
                        const imgIndex = blockIndex + imgRelativeIndex;
                        return (
                            <div key={`preview-image-${imgIndex}`} className="relative group">
                                <div className="text-center">
                                    <img
                                        src={img}
                                        alt={currentImageCaptions[imgIndex] || `Preview image ${imgIndex + 1}`}
                                        className="max-w-full h-auto max-h-64 object-contain rounded-lg shadow-md mx-auto"
                                    />
                                    
                                    {/* Image Caption Input */}
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            value={currentImageCaptions[imgIndex] || ''}
                                            onChange={(e) => updateImageCaption(imgIndex, e.target.value)}
                                            placeholder="Add image caption..."
                                            className="w-full text-sm px-2 py-1 theme-surface border theme-border rounded theme-text text-center"
                                        />
                                    </div>
                                    
                                    {/* Image Controls */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 theme-transition">
                                        <div className="flex gap-1 bg-black/50 rounded-md p-1">
                                            {imgIndex > 0 && (
                                                <button
                                                    onClick={() => moveImage(imgIndex, 'up')}
                                                    className="p-1 text-white/80 hover:text-white theme-transition"
                                                    title="Move up"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14l5-5 5 5" />
                                                    </svg>
                                                </button>
                                            )}
                                            
                                            {imgIndex < images.length - 1 && (
                                                <button
                                                    onClick={() => moveImage(imgIndex, 'down')}
                                                    className="p-1 text-white/80 hover:text-white theme-transition"
                                                    title="Move down"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 10l-5 5-5-5" />
                                                    </svg>
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={() => removeImage(imgIndex)}
                                                className="p-1 text-red-400 hover:text-red-300 theme-transition"
                                                title="Delete image"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
            
            {/* Final insertion controls */}
            <div className="flex justify-center gap-2">
                <button
                    onClick={() => addTextBlockAtPosition(textBlocks.length - 1)}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30 theme-transition flex items-center gap-1"
                >
                    <PlusIcon />
                    Add Text at End
                </button>
                <button
                    onClick={() => addImageAtPosition(textBlocks.length - 1)}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition flex items-center gap-1"
                >
                    <PlusIcon />
                    Add Image at End
                </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t theme-border">
                <button
                    onClick={() => setIsEditingState(false)}
                    className="px-4 py-2 text-sm font-medium rounded-md theme-text-secondary hover:theme-surface theme-transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium rounded-md theme-accent text-white hover:bg-opacity-90 theme-transition"
                >
                    Save Content
                </button>
            </div>
        </div>
    );
};

export default InlineContentEditor;
