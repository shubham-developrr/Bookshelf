import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookContentManager from '../components/BookContentManager';

// Mock data store - in a real app this would be from a database or state management
const mockBookStore: { [key: string]: { name: string; chapters: any[] } } = {};

const BookContentPage: React.FC = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [bookData, setBookData] = useState<{ name: string; chapters: any[] } | null>(null);

    useEffect(() => {
        if (bookId) {
            // In a real app, you would fetch book data from an API
            // For now, we'll create a mock entry or get it from localStorage
            let book = mockBookStore[bookId];
            
            if (!book) {
                // Try to get from localStorage (created books)
                const createdBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
                const foundBook = createdBooks.find((b: any) => b.id === bookId);
                
                if (foundBook) {
                    book = {
                        name: foundBook.name,
                        chapters: foundBook.chapters || []
                    };
                    mockBookStore[bookId] = book;
                } else {
                    // Book not found, redirect back
                    navigate('/');
                    return;
                }
            }
            
            setBookData(book);
        }
    }, [bookId, navigate]);

    if (!bookData) {
        return (
            <div className="theme-bg min-h-screen theme-transition flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 theme-accent mx-auto mb-4"></div>
                    <p className="theme-text">Loading book...</p>
                </div>
            </div>
        );
    }

    return (
        <BookContentManager 
            bookName={bookData.name}
            initialChapters={bookData.chapters}
        />
    );
};

export default BookContentPage;
