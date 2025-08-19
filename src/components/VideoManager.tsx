import React, { useState } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon, VideoIcon } from './icons';

interface VideoItem {
    id: string;
    title: string;
    youtubeUrl: string;
    thumbnail?: string;
    duration?: string;
    category?: string;
    description?: string;
    isPlaylist?: boolean;
    playlistVideos?: VideoItem[];
    timestamp: Date;
    isExpanded?: boolean; // For playlist expansion
}

interface VideoCategory {
    id: string;
    name: string;
    color: string;
}

interface VideoManagerProps {
    currentBook: string;
    currentChapter: string;
    className?: string;
    onPlayVideo?: (videoUrl: string, title: string) => void;
}

const VideoManager: React.FC<VideoManagerProps> = ({
    currentBook,
    currentChapter,
    className = '',
    onPlayVideo
}) => {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [categories, setCategories] = useState<VideoCategory[]>([
        { id: 'lectures', name: 'Lectures', color: '#3B82F6' },
        { id: 'tutorials', name: 'Tutorials', color: '#10B981' },
        { id: 'examples', name: 'Examples', color: '#F59E0B' },
        { id: 'revision', name: 'Revision', color: '#EF4444' },
        { id: 'oneshot', name: 'One Shot', color: '#8B5CF6' }
    ]);
    const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
    const [newCustomCategory, setNewCustomCategory] = useState('');
    const [mode, setMode] = useState<'view' | 'add' | 'manage'>('view');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newVideoCategory, setNewVideoCategory] = useState('lectures');

    const storageKey = `videos_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load videos from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const videoData = JSON.parse(saved).map((v: any) => ({
                ...v,
                timestamp: new Date(v.timestamp)
            }));
            setVideos(videoData);
        }
    }, [storageKey]);

    // Save videos to localStorage
    const saveVideos = (videoList: VideoItem[]) => {
        localStorage.setItem(storageKey, JSON.stringify(videoList));
        setVideos(videoList);
    };

    // Extract YouTube video ID from URL (enhanced)
    const getYouTubeVideoId = (url: string): string | null => {
        const patterns = [
            // Regular video patterns
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
            // Playlist patterns - extract the video if present
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)&list=/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    // Extract playlist ID from URL
    const getPlaylistId = (url: string): string | null => {
        const playlistPattern = /[?&]list=([^&\n?#]+)/;
        const match = url.match(playlistPattern);
        return match ? match[1] : null;
    };

    // Check if URL is a YouTube playlist
    const isPlaylistUrl = (url: string): boolean => {
        return url.includes('list=') && (url.includes('youtube.com') || url.includes('youtu.be'));
    };

    // Generate thumbnail URL from YouTube video ID
    const getThumbnailUrl = (videoId: string): string => {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    };

    // Fetch video title from YouTube oEmbed API
    const fetchVideoTitle = async (videoId: string, url: string): Promise<string> => {
        try {
            // Use YouTube oEmbed API to get video title
            const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (response.ok) {
                const data = await response.json();
                return data.title || 'Video Title';
            }
        } catch (error) {
            console.log('Could not fetch title, using fallback');
        }
        return 'YouTube Video';
    };

    // Fetch playlist videos from YouTube (enhanced approach using oEmbed)
    const fetchPlaylistVideos = async (playlistId: string, originalUrl: string): Promise<VideoItem[]> => {
        try {
            // Extract individual video from playlist URL if present
            const videoMatch = originalUrl.match(/[?&]v=([^&]+)/);
            const currentVideoId = videoMatch ? videoMatch[1] : null;
            
            if (currentVideoId) {
                // Get video info using oEmbed
                const videoTitle = await fetchVideoTitle(currentVideoId, `https://www.youtube.com/watch?v=${currentVideoId}`);
                
                const playlistVideo: VideoItem = {
                    id: `${playlistId}_${currentVideoId}`,
                    title: videoTitle,
                    youtubeUrl: `https://www.youtube.com/watch?v=${currentVideoId}`,
                    thumbnail: getThumbnailUrl(currentVideoId),
                    category: newVideoCategory,
                    timestamp: new Date(),
                    isPlaylist: false,
                    isExpanded: false
                };
                
                return [playlistVideo];
            }
            
            // Note: For full playlist extraction, you would need:
            // 1. YouTube Data API key
            // 2. API call to: https://www.googleapis.com/youtube/v3/playlistItems
            // 3. Parse all video IDs from the playlist
            // For now, we extract the current video if available
            
            return [];
        } catch (error) {
            console.error('Error fetching playlist videos:', error);
            return [];
        }
    };

    // Toggle playlist expansion
    const togglePlaylistExpansion = (videoId: string) => {
        const updatedVideos = videos.map(video => 
            video.id === videoId 
                ? { ...video, isExpanded: !video.isExpanded }
                : video
        );
        saveVideos(updatedVideos);
    };

    // Add custom category
    const handleAddCustomCategory = () => {
        if (!newCustomCategory.trim()) return;
        
        const categoryId = newCustomCategory.toLowerCase().replace(/\s+/g, '');
        const colors = ['#F97316', '#EC4899', '#06B6D4', '#84CC16', '#A855F7', '#F43F5E'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const newCategory: VideoCategory = {
            id: categoryId,
            name: newCustomCategory.trim(),
            color: randomColor
        };
        
        setCategories(prev => [...prev, newCategory]);
        setNewCustomCategory('');
        setShowCustomCategoryInput(false);
    };

    // Get categories that have videos
    const getCategoriesWithVideos = () => {
        return categories.filter(category => 
            videos.some(video => video.category === category.id)
        );
    };

    // Add new video
    const handleAddVideo = async () => {
        if (!newVideoUrl.trim()) return;

        const isPlaylist = isPlaylistUrl(newVideoUrl);
        let videoId: string | null = null;
        let playlistId: string | null = null;
        let title = 'YouTube Video';

        if (isPlaylist) {
            playlistId = getPlaylistId(newVideoUrl);
            // For playlist, try to get the current video ID if available
            const currentVideoMatch = newVideoUrl.match(/[?&]v=([^&]+)/);
            videoId = currentVideoMatch ? currentVideoMatch[1] : playlistId;
            
            if (!playlistId) {
                alert('Please enter a valid YouTube playlist URL');
                return;
            }
            
            // Use playlist title format
            title = 'YouTube Playlist';
            try {
                // Try to get more descriptive title from oEmbed if there's a video
                if (currentVideoMatch) {
                    const videoUrl = `https://www.youtube.com/watch?v=${currentVideoMatch[1]}`;
                    const videoTitle = await fetchVideoTitle(currentVideoMatch[1], videoUrl);
                    title = `${videoTitle} (from playlist)`;
                }
            } catch (e) {
                console.log('Could not fetch playlist video title');
            }
        } else {
            videoId = getYouTubeVideoId(newVideoUrl);
            if (!videoId) {
                alert('Please enter a valid YouTube URL');
                return;
            }
            
            // Fetch the actual video title
            title = await fetchVideoTitle(videoId, newVideoUrl);
        }

        const newVideo: VideoItem = {
            id: Date.now().toString(),
            title: title,
            youtubeUrl: newVideoUrl,
            thumbnail: videoId ? getThumbnailUrl(videoId) : undefined,
            category: newVideoCategory,
            isPlaylist,
            isExpanded: false,
            timestamp: new Date()
        };

        // If it's a playlist, extract available videos
        if (isPlaylist && playlistId) {
            newVideo.playlistVideos = await fetchPlaylistVideos(playlistId, newVideoUrl);
        }

        const updatedVideos = [...videos, newVideo];
        saveVideos(updatedVideos);

        // Reset form
        setNewVideoUrl('');
        setNewVideoCategory('lectures');
        setMode('view');
    };

    // Get filtered videos by category
    const getFilteredVideos = () => {
        if (!selectedCategory) return videos;
        return videos.filter(video => video.category === selectedCategory);
    };

    const filteredVideos = getFilteredVideos();

    if (mode === 'add') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <PlusIcon />
                        Add Video
                    </h2>
                    <button
                        onClick={() => setMode('view')}
                        className="btn-secondary text-sm"
                    >
                        Back to Videos
                    </button>
                </div>

                <div className="space-y-4 max-w-2xl">
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            YouTube URL:
                        </label>
                        <input
                            type="url"
                            value={newVideoUrl}
                            onChange={(e) => setNewVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=... or playlist link"
                            className="w-full p-3 theme-surface border rounded-lg theme-text"
                        />
                        <p className="text-xs theme-text-secondary mt-1">
                            Supports individual videos and playlists - click playlist titles to expand
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Category:
                        </label>
                        <div className="flex gap-2 items-center">
                            <select
                                value={newVideoCategory}
                                onChange={(e) => setNewVideoCategory(e.target.value)}
                                className="flex-1 p-2 theme-surface border rounded theme-text"
                            >
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowCustomCategoryInput(true)}
                                className="px-3 py-2 btn-secondary text-sm"
                                title="Add custom category"
                            >
                                +
                            </button>
                        </div>
                        
                        {showCustomCategoryInput && (
                            <div className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={newCustomCategory}
                                    onChange={(e) => setNewCustomCategory(e.target.value)}
                                    placeholder="Enter category name"
                                    className="flex-1 p-2 theme-surface border rounded theme-text text-sm"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomCategory}
                                    className="px-3 py-2 btn-primary text-sm"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCustomCategoryInput(false);
                                        setNewCustomCategory('');
                                    }}
                                    className="px-3 py-2 btn-secondary text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAddVideo}
                        disabled={!newVideoUrl.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Video
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`theme-surface rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    <VideoIcon />
                    Video Library
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('add')}
                        className="btn-secondary text-sm flex items-center gap-2"
                    >
                        <PlusIcon />
                        Add Video
                    </button>
                    <button
                        onClick={() => setMode('manage')}
                        className="btn-secondary text-sm"
                    >
                        Manage ({videos.length})
                    </button>
                </div>
            </div>

            {/* Category filter */}
            {videos.length > 0 && (
                <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory('')}
                            className={`px-3 py-1 text-sm rounded ${
                                !selectedCategory 
                                    ? 'theme-accent text-white' 
                                    : 'btn-secondary'
                            }`}
                        >
                            All ({videos.length})
                        </button>
                        {getCategoriesWithVideos().map(category => {
                            const count = videos.filter(v => v.category === category.id).length;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`px-3 py-1 text-sm rounded ${
                                        selectedCategory === category.id
                                            ? 'text-white'
                                            : 'btn-secondary'
                                    }`}
                                    style={{
                                        backgroundColor: selectedCategory === category.id ? category.color : undefined
                                    }}
                                >
                                    {category.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Videos display */}
            {filteredVideos.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                        <VideoIcon />
                    </div>
                    <h3 className="text-lg font-medium theme-text mb-2">
                        {videos.length === 0 ? 'No videos yet' : 'No videos in this category'}
                    </h3>
                    <p className="theme-text-secondary mb-4">
                        {videos.length === 0 
                            ? 'Add YouTube videos and playlists to build your library'
                            : 'Try selecting a different category or clear the filter'
                        }
                    </p>
                    {videos.length === 0 && (
                        <button
                            onClick={() => setMode('add')}
                            className="btn-primary flex items-center gap-2 mx-auto"
                        >
                            <PlusIcon />
                            Add First Video
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredVideos.map((video) => {
                        const category = categories.find(c => c.id === video.category);
                        
                        return (
                            <div key={video.id}>
                                <div className="flex gap-4 p-4 border theme-border rounded-lg hover:shadow-md transition-shadow">
                                    {/* Thumbnail - Left side */}
                                    <div className="flex-shrink-0 w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                                        {video.thumbnail ? (
                                            <img 
                                                src={video.thumbnail} 
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <VideoIcon />
                                            </div>
                                        )}
                                        {video.isPlaylist && (
                                            <span className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                                                Playlist
                                            </span>
                                        )}
                                    </div>

                                    {/* Video info - Right side */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-medium theme-text text-sm line-clamp-2 mb-1 cursor-pointer hover:text-blue-500"
                                                onClick={() => video.isPlaylist && togglePlaylistExpansion(video.id)}>
                                                {video.title}
                                                {video.isPlaylist && (
                                                    <svg 
                                                        className={`inline ml-2 w-4 h-4 transition-transform ${video.isExpanded ? 'rotate-180' : ''}`} 
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                )}
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    const updatedVideos = videos.filter(v => v.id !== video.id);
                                                    saveVideos(updatedVideos);
                                                }}
                                                className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs ml-2"
                                                title="Delete video"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        
                                        {category && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <span 
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                ></span>
                                                <span className="text-xs theme-text-secondary">
                                                    {category.name}
                                                </span>
                                            </div>
                                        )}

                                        <div className="text-xs theme-text-secondary mb-3">
                                            Added {video.timestamp.toLocaleDateString()}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (onPlayVideo) {
                                                        onPlayVideo(video.youtubeUrl, video.title);
                                                    } else {
                                                        console.log('Play video:', video);
                                                    }
                                                }}
                                                className="px-3 py-1 btn-primary text-xs"
                                            >
                                                Watch
                                            </button>
                                            <button
                                                onClick={() => window.open(video.youtubeUrl, '_blank')}
                                                className="px-3 py-1 btn-secondary text-xs"
                                                title="Open in YouTube"
                                            >
                                                Open in App
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Playlist videos - expandable section */}
                                {video.isPlaylist && video.isExpanded && video.playlistVideos && video.playlistVideos.length > 0 && (
                                    <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                        {video.playlistVideos.map((playlistVideo, index) => (
                                            <div key={playlistVideo.id} className="flex gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                                                <div className="flex-shrink-0 w-20 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                                    {playlistVideo.thumbnail && (
                                                        <img 
                                                            src={playlistVideo.thumbnail} 
                                                            alt={playlistVideo.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium theme-text line-clamp-1">
                                                        {index + 1}. {playlistVideo.title}
                                                    </p>
                                                    <div className="flex gap-1 mt-1">
                                                        <button
                                                            onClick={() => onPlayVideo && onPlayVideo(playlistVideo.youtubeUrl, playlistVideo.title)}
                                                            className="px-2 py-0.5 btn-primary text-xs"
                                                        >
                                                            Play
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default VideoManager;
