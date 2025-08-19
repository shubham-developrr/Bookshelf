import React, { useState, useRef } from 'react';
import { PlusIcon, TrashIcon, PlayIcon, ExternalLinkIcon } from './icons';

interface VideoItem {
    id: string;
    title: string;
    youtubeUrl: string;
    thumbnail?: string;
    duration?: string;
    addedDate: Date;
    startTime?: number; // in seconds
    endTime?: number; // in seconds
}

interface VideosManagerProps {
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const VideosManager: React.FC<VideosManagerProps> = ({
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [mode, setMode] = useState<'view' | 'add'>('view');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);
    
    const storageKey = `videos_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load videos from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const videoData = JSON.parse(saved).map((v: any) => ({
                ...v,
                addedDate: new Date(v.addedDate)
            }));
            setVideos(videoData);
        }
    }, [storageKey]);

    // Save videos to localStorage
    const saveVideos = (videoList: VideoItem[]) => {
        localStorage.setItem(storageKey, JSON.stringify(videoList));
        setVideos(videoList);
    };

    // Extract YouTube video ID from URL
    const extractVideoId = (url: string): string | null => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    // Get YouTube thumbnail URL
    const getThumbnailUrl = (url: string): string => {
        const videoId = extractVideoId(url);
        return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
    };

    // Get YouTube embed URL
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

    // Add new video
    const handleAddVideo = () => {
        if (!newTitle.trim() || !newUrl.trim()) {
            alert('Please provide both title and YouTube URL');
            return;
        }

        const videoId = extractVideoId(newUrl);
        if (!videoId) {
            alert('Please provide a valid YouTube URL');
            return;
        }

        const newVideo: VideoItem = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            youtubeUrl: newUrl.trim(),
            thumbnail: getThumbnailUrl(newUrl),
            addedDate: new Date()
        };

        const updatedVideos = [...videos, newVideo];
        saveVideos(updatedVideos);

        // Reset form
        setNewTitle('');
        setNewUrl('');
        setMode('view');
    };

    // Delete video
    const deleteVideo = (id: string) => {
        if (confirm('Are you sure you want to delete this video?')) {
            const updatedVideos = videos.filter(v => v.id !== id);
            saveVideos(updatedVideos);
        }
    };

    // Play video in embedded player
    const playVideoEmbedded = (video: VideoItem) => {
        setSelectedVideo(video);
        setShowPlayer(true);
    };

    // Open video in YouTube directly
    const openInYouTube = (video: VideoItem) => {
        window.open(video.youtubeUrl, '_blank');
    };

    // Close video player
    const closePlayer = () => {
        setShowPlayer(false);
        setSelectedVideo(null);
    };

    // Add mode view
    if (mode === 'add') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <PlusIcon />
                        Add YouTube Video
                    </h2>
                    <button
                        onClick={() => {
                            setMode('view');
                            setNewTitle('');
                            setNewUrl('');
                        }}
                        className="btn-secondary text-sm"
                    >
                        Back to Videos
                    </button>
                </div>

                <div className="space-y-4 max-w-2xl">
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Video Title: <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter a descriptive title for the video"
                            className="w-full p-3 theme-surface border rounded-lg theme-text"
                        />
                        <p className="text-xs theme-text-secondary mt-1">
                            This title will help you identify the video later
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            YouTube URL: <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full p-3 theme-surface border rounded-lg theme-text"
                        />
                        <p className="text-xs theme-text-secondary mt-1">
                            Paste any YouTube video URL here
                        </p>
                    </div>

                    {/* Preview */}
                    {newUrl && extractVideoId(newUrl) && (
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Preview:
                            </label>
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                <img 
                                    src={getThumbnailUrl(newUrl)}
                                    alt="Video thumbnail"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleAddVideo}
                            disabled={!newTitle.trim() || !newUrl.trim()}
                            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ➕ Add Video
                        </button>
                        <button
                            onClick={() => {
                                setMode('view');
                                setNewTitle('');
                                setNewUrl('');
                            }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            🎬 Video Features
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Embedded YouTube player for seamless viewing</li>
                            <li>• Direct YouTube links for external viewing</li>
                            <li>• Automatic thumbnail generation</li>
                            <li>• Grid and list view options</li>
                            <li>• Easy video management and organization</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`theme-surface rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    🎬 YouTube Videos
                </h2>
                <div className="flex gap-2">
                    <div className="flex theme-surface2 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 text-sm rounded ${
                                viewMode === 'grid' 
                                    ? 'theme-surface theme-text shadow-sm' 
                                    : 'theme-text-secondary hover:theme-text'
                            }`}
                        >
                            🔲 Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-sm rounded ${
                                viewMode === 'list' 
                                    ? 'theme-surface theme-text shadow-sm' 
                                    : 'theme-text-secondary hover:theme-text'
                            }`}
                        >
                            📋 List
                        </button>
                    </div>
                    <button
                        onClick={() => setMode('add')}
                        className="btn-secondary text-sm flex items-center gap-2"
                    >
                        <PlusIcon />
                        Add Video
                    </button>
                </div>
            </div>

            {/* Videos display */}
            {videos.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                        🎬
                    </div>
                    <h3 className="text-xl font-semibold mb-2 theme-text">Add YouTube Videos</h3>
                    <p className="theme-text-secondary mb-4">Build a collection of educational videos for this chapter</p>
                    
                    {/* Video Collection Guide */}
                    <div className="mb-6 p-4 theme-surface2 rounded-lg max-w-lg mx-auto">
                        <div className="text-sm theme-text-secondary mb-3 font-medium">Video Collection Benefits:</div>
                        <div className="space-y-2 text-left">
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                                <div className="font-semibold text-red-800 dark:text-red-300 mb-1">📺 Visual Learning</div>
                                <div className="text-sm text-red-700 dark:text-red-200">
                                    Watch expert explanations and demonstrations
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                                <div className="font-semibold text-blue-800 dark:text-blue-300 mb-1">🔗 Easy Access</div>
                                <div className="text-sm text-blue-700 dark:text-blue-200">
                                    Quick links to relevant educational content
                                </div>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                                <div className="font-semibold text-green-800 dark:text-green-300 mb-1">📚 Curated Content</div>
                                <div className="text-sm text-green-700 dark:text-green-200">
                                    Organize videos by topic and difficulty
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setMode('add')}
                        className="px-6 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                    >
                        <PlusIcon className="w-5 h-5 inline mr-2" />
                        Add Your First Video
                    </button>
                </div>
            ) : (
                <div>
                    {viewMode === 'grid' ? (
                        // Grid View
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {videos.map((video) => (
                                <div key={video.id} className="border theme-border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 relative overflow-hidden cursor-pointer group">
                                        <img 
                                            src={video.thumbnail || '/api/placeholder/320/180'}
                                            alt={video.title}
                                            className="w-full h-full object-cover"
                                            onClick={() => playVideoEmbedded(video)}
                                        />
                                        
                                        {/* Play overlay */}
                                        <div 
                                            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center cursor-pointer"
                                            onClick={() => playVideoEmbedded(video)}
                                        >
                                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayIcon className="w-8 h-8 text-white ml-1" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video info */}
                                    <div>
                                        <h3 className="font-medium theme-text text-sm line-clamp-2 mb-2">
                                            {video.title}
                                        </h3>
                                        
                                        <div className="text-xs theme-text-secondary mb-3">
                                            <div>Added {video.addedDate.toLocaleDateString()}</div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => playVideoEmbedded(video)}
                                                className="flex-1 btn-primary text-xs flex items-center justify-center gap-1"
                                            >
                                                <PlayIcon className="w-3 h-3" />
                                                Play
                                            </button>
                                            <button
                                                onClick={() => openInYouTube(video)}
                                                className="px-2 py-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-xs"
                                                title="Open in YouTube"
                                            >
                                                <ExternalLinkIcon className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => deleteVideo(video.id)}
                                                className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs"
                                                title="Delete video"
                                            >
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // List View
                        <div className="space-y-3">
                            {videos.map((video) => (
                                <div key={video.id} className="border theme-border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail */}
                                        <div 
                                            className="w-24 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer group relative"
                                            onClick={() => playVideoEmbedded(video)}
                                        >
                                            <img 
                                                src={video.thumbnail || '/api/placeholder/96/64'}
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                                <PlayIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium theme-text text-sm mb-1 line-clamp-1">
                                                {video.title}
                                            </h3>
                                            <div className="text-xs theme-text-secondary">
                                                Added {video.addedDate.toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => playVideoEmbedded(video)}
                                                className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
                                            >
                                                <PlayIcon className="w-3 h-3" />
                                                Play
                                            </button>
                                            <button
                                                onClick={() => openInYouTube(video)}
                                                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                title="Open in YouTube"
                                            >
                                                <ExternalLinkIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteVideo(video.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title="Delete video"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Embedded Video Player Modal */}
            {showPlayer && selectedVideo && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-black rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
                            <div>
                                <h3 className="font-medium text-lg">{selectedVideo.title}</h3>
                                <p className="text-sm text-gray-300">YouTube Video</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openInYouTube(selectedVideo)}
                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Open in YouTube
                                </button>
                                <button
                                    onClick={closePlayer}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Video Player */}
                        <div className="aspect-video">
                            <iframe
                                src={getEmbedUrl(selectedVideo.youtubeUrl, selectedVideo.startTime, selectedVideo.endTime, true)}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={selectedVideo.title}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideosManager;
