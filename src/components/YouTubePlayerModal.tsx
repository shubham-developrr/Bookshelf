import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface VideoData {
    id: string;
    title: string;
    youtubeUrl: string;
    startTime?: number; // in seconds
    endTime?: number; // in seconds
}

interface YouTubePlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoData: VideoData | null;
    onSave?: (videoData: VideoData) => void;
    subtopicTitle: string;
    mode?: 'play' | 'edit'; // New prop to control modal behavior
}

const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
    isOpen,
    onClose,
    videoData,
    onSave,
    subtopicTitle,
    mode = 'edit'
}) => {
    const { theme } = useTheme();
    const [isEditMode, setIsEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [editStartTime, setEditStartTime] = useState<number | string | ''>('');
    const [editEndTime, setEditEndTime] = useState<number | string | ''>('');

    // Initialize edit form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit') {
                // Edit mode - always show form and overwrite with existing data if present
                setEditTitle(videoData?.title || '');
                setEditUrl(videoData?.youtubeUrl || '');
                setEditStartTime(videoData?.startTime || '');
                setEditEndTime(videoData?.endTime || '');
                setIsEditMode(true);
            } else {
                // Play mode - show player only, don't show details
                setIsEditMode(false);
            }
        }
    }, [isOpen, videoData, mode]);

    // Extract YouTube video ID from URL
    const extractVideoId = (url: string): string | null => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    // Convert time string (MM:SS or HH:MM:SS) to seconds
    const timeToSeconds = (timeStr: string): number => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1]; // MM:SS
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
        }
        return 0;
    };

    // Convert seconds to time string
    const secondsToTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Generate YouTube embed URL
    const getEmbedUrl = (url: string, startTime?: number, endTime?: number, autoplay: boolean = false): string => {
        const videoId = extractVideoId(url);
        if (!videoId) return '';
        
        let embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const params: string[] = [];
        
        if (startTime) params.push(`start=${startTime}`);
        if (endTime) params.push(`end=${endTime}`);
        if (autoplay) params.push('autoplay=1');
        
        if (params.length > 0) {
            embedUrl += `?${params.join('&')}`;
        }
        
        return embedUrl;
    };

    const handleSave = () => {
        if (!onSave) return; // No save function provided
        
        if (!editUrl.trim() || !editTitle.trim()) {
            alert('Please provide both title and YouTube URL');
            return;
        }

        const startSeconds = typeof editStartTime === 'string' && editStartTime.includes(':') 
            ? timeToSeconds(editStartTime) 
            : (typeof editStartTime === 'number' ? editStartTime : undefined);
        
        const endSeconds = typeof editEndTime === 'string' && editEndTime.includes(':')
            ? timeToSeconds(editEndTime)
            : (typeof editEndTime === 'number' ? editEndTime : undefined);

        const newVideoData: VideoData = {
            id: videoData?.id || Date.now().toString(),
            title: editTitle.trim(),
            youtubeUrl: editUrl.trim(),
            startTime: startSeconds,
            endTime: endSeconds
        };

        onSave(newVideoData);
        setIsEditMode(false);
    };

    const handleTimeInputChange = (
        value: string, 
        setter: React.Dispatch<React.SetStateAction<number | string | ''>>
    ) => {
        if (value === '') {
            setter('');
            return;
        }
        
        // Allow time format (MM:SS or HH:MM:SS) or plain seconds
        if (value.includes(':')) {
            setter(value);
        } else {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
                setter(num);
            }
        }
    };

    if (!isOpen) return null;

    const currentVideoData = videoData || {
        id: 'new',
        title: editTitle,
        youtubeUrl: editUrl,
        startTime: typeof editStartTime === 'number' ? editStartTime : undefined,
        endTime: typeof editEndTime === 'number' ? editEndTime : undefined
    };

    const embedUrl = getEmbedUrl(
        currentVideoData.youtubeUrl, 
        currentVideoData.startTime, 
        currentVideoData.endTime,
        mode === 'play' // Auto-play only in play mode
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`theme-surface theme-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b theme-border">
                    <div>
                        <h2 className="text-xl font-semibold theme-text">
                            {videoData ? currentVideoData.title : 'Add Video'}
                        </h2>
                        <p className="text-sm theme-text-secondary">
                            {subtopicTitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'edit' && videoData && !isEditMode && (
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 theme-transition"
                            >
                                Edit
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 theme-transition"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
                    {/* Video Player - only show in play mode or when not in edit form */}
                    {embedUrl && !isEditMode && (
                        <div className="aspect-video">
                            <iframe
                                src={embedUrl}
                                className="w-full h-full rounded-lg"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={currentVideoData.title}
                                onLoad={() => {
                                    // Add event listener for video end if in play mode
                                    if (mode === 'play') {
                                        // Set up auto-close when video ends (after estimated duration + buffer)
                                        const estimatedDuration = currentVideoData.endTime 
                                            ? (currentVideoData.endTime - (currentVideoData.startTime || 0)) * 1000
                                            : 180000; // Default 3 minutes if no end time
                                        
                                        setTimeout(() => {
                                            // Only close if modal is still open and in play mode
                                            if (mode === 'play') {
                                                onClose();
                                            }
                                        }, estimatedDuration + 5000); // Add 5 second buffer
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Don't show video info in play mode - only show player */}
                    {mode === 'edit' && !isEditMode && videoData && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium theme-text-secondary mb-1">
                                    Video Title
                                </label>
                                <div className="theme-surface theme-border rounded-md px-3 py-2 text-sm theme-text">
                                    {currentVideoData.title}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium theme-text-secondary mb-1">
                                    YouTube URL
                                </label>
                                <div className="theme-surface theme-border rounded-md px-3 py-2 text-sm theme-text break-all">
                                    {currentVideoData.youtubeUrl}
                                </div>
                            </div>
                            {(currentVideoData.startTime || currentVideoData.endTime) && (
                                <div className="flex gap-4">
                                    {currentVideoData.startTime && (
                                        <div>
                                            <label className="block text-sm font-medium theme-text-secondary mb-1">
                                                Start Time
                                            </label>
                                            <div className="theme-surface theme-border rounded-md px-3 py-2 text-sm theme-text">
                                                {secondsToTime(currentVideoData.startTime)}
                                            </div>
                                        </div>
                                    )}
                                    {currentVideoData.endTime && (
                                        <div>
                                            <label className="block text-sm font-medium theme-text-secondary mb-1">
                                                End Time
                                            </label>
                                            <div className="theme-surface theme-border rounded-md px-3 py-2 text-sm theme-text">
                                                {secondsToTime(currentVideoData.endTime)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Edit Form */}
                    {isEditMode && (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="video-title" className="block text-sm font-medium theme-text-secondary mb-2">
                                    Video Title *
                                </label>
                                <input
                                    id="video-title"
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Enter video title"
                                    className="w-full px-3 py-2 theme-surface theme-border rounded-md theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="video-url" className="block text-sm font-medium theme-text-secondary mb-2">
                                    YouTube URL *
                                </label>
                                <input
                                    id="video-url"
                                    type="url"
                                    value={editUrl}
                                    onChange={(e) => setEditUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-3 py-2 theme-surface theme-border rounded-md theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start-time" className="block text-sm font-medium theme-text-secondary mb-2">
                                        Start Time (optional)
                                    </label>
                                    <input
                                        id="start-time"
                                        type="text"
                                        value={editStartTime}
                                        onChange={(e) => handleTimeInputChange(e.target.value, setEditStartTime)}
                                        placeholder="0:30 or 30"
                                        className="w-full px-3 py-2 theme-surface theme-border rounded-md theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs theme-text-secondary mt-1">
                                        Format: MM:SS, HH:MM:SS, or seconds
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="end-time" className="block text-sm font-medium theme-text-secondary mb-2">
                                        End Time (optional)
                                    </label>
                                    <input
                                        id="end-time"
                                        type="text"
                                        value={editEndTime}
                                        onChange={(e) => handleTimeInputChange(e.target.value, setEditEndTime)}
                                        placeholder="5:30 or 330"
                                        className="w-full px-3 py-2 theme-surface theme-border rounded-md theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs theme-text-secondary mt-1">
                                        Format: MM:SS, HH:MM:SS, or seconds
                                    </p>
                                </div>
                            </div>

                            {/* Preview */}
                            {editUrl && extractVideoId(editUrl) && (
                                <div>
                                    <label className="block text-sm font-medium theme-text-secondary mb-2">
                                        Preview
                                    </label>
                                    <div className="aspect-video">
                                        <iframe
                                            src={getEmbedUrl(editUrl, 
                                                typeof editStartTime === 'number' ? editStartTime : 
                                                typeof editStartTime === 'string' && editStartTime.includes(':') ? timeToSeconds(editStartTime) : undefined,
                                                typeof editEndTime === 'number' ? editEndTime :
                                                typeof editEndTime === 'string' && editEndTime.includes(':') ? timeToSeconds(editEndTime) : undefined
                                            )}
                                            className="w-full h-full rounded-lg"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title="Preview"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        if (videoData) {
                                            setIsEditMode(false);
                                        } else {
                                            onClose();
                                        }
                                    }}
                                    className="px-4 py-2 text-sm font-medium rounded-md theme-text-secondary hover:theme-surface theme-transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 theme-transition"
                                >
                                    {videoData ? 'Save Changes' : 'Add Video'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YouTubePlayerModal;
