import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIconSvg, CloseIcon } from './icons';
import { getBookImage } from '../assets/images/index';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Sample search suggestions - these would come from your backend/data
    const searchSuggestions = [
        'Object Oriented System Design with C++',
        'Application of Soft Computing',
        'Database Management System',
        'Web Technology',
        'Design and Analysis of Algorithm',
        'Mechanics of Robots'
    ];

    const filteredSuggestions = searchSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSearch = (query: string) => {
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            onClose();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        navigate(`/subject/${encodeURIComponent(suggestion)}`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 p-4">
            <div className="theme-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 p-6 border-b theme-border">
                    <div className="flex-1 relative">
                        <SearchIconSvg className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                            className="w-full pl-10 pr-4 py-3 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition text-lg"
                            placeholder="Search topics, chapters, subjects..."
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Search Results */}
                <div className="p-6">
                    {searchQuery.trim() ? (
                        <div>
                            <h3 className="text-sm font-medium theme-text-secondary mb-3">
                                Search Results for "{searchQuery}"
                            </h3>
                            {filteredSuggestions.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="w-full text-left p-3 hover:theme-surface2 rounded-lg theme-transition flex items-center gap-3"
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                                                <img 
                                                    src={getBookImage(suggestion)} 
                                                    alt={suggestion}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="theme-text font-medium">{suggestion}</h4>
                                                <p className="text-sm theme-text-secondary">Subject</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <SearchIconSvg className="w-12 h-12 theme-text-secondary mx-auto mb-3" />
                                    <p className="theme-text-secondary">No results found for "{searchQuery}"</p>
                                    <button
                                        onClick={() => handleSearch(searchQuery)}
                                        className="btn-primary mt-3"
                                    >
                                        Search Anyway
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-sm font-medium theme-text-secondary mb-3">
                                Popular Subjects
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {searchSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="w-full text-left p-3 hover:theme-surface2 rounded-lg theme-transition flex items-center gap-3"
                                    >
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                                            <img 
                                                src={getBookImage(suggestion)} 
                                                alt={suggestion}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="theme-text font-medium">{suggestion}</h4>
                                            <p className="text-sm theme-text-secondary">Subject</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
