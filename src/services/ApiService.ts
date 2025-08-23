/**
 * API Service for communicating with the backend
 * Replaces localStorage with REST API calls
 */

class ApiService {
    constructor() {
        this.baseURL = process.env.NODE_ENV === 'production' 
            ? 'https://your-backend-domain.com/api'
            : 'http://localhost:5000/api';
        
        this.token = this.getAuthToken();
    }
    
    // Authentication token management
    getAuthToken() {
        return localStorage.getItem('authToken');
    }
    
    setAuthToken(token) {
        if (token) {
            localStorage.setItem('authToken', token);
            this.token = token;
        } else {
            localStorage.removeItem('authToken');
            this.token = null;
        }
    }
    
    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add auth token if available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    // User authentication methods
    async login(email, password) {
        const response = await this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.token) {
            this.setAuthToken(response.token);
        }
        
        return response;
    }
    
    async register(userData) {
        const response = await this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.token) {
            this.setAuthToken(response.token);
        }
        
        return response;
    }
    
    async logout() {
        this.setAuthToken(null);
        return { success: true };
    }
    
    async verifyToken() {
        if (!this.token) return { valid: false };
        
        try {
            const response = await this.request('/users/verify-token', {
                method: 'POST',
                body: JSON.stringify({ token: this.token })
            });
            return response;
        } catch (error) {
            this.setAuthToken(null);
            return { valid: false };
        }
    }
    
    // User profile methods
    async getUserProfile(userId) {
        return await this.request(`/users/profile/${userId}`);
    }
    
    async updateUserProfile(userId, profileData) {
        return await this.request(`/users/profile/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
    
    async updateUserPreferences(userId, preferences) {
        return await this.request(`/users/${userId}/preferences`, {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
    }
    
    // Book management methods
    async getBooks(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await this.request(`/books?${searchParams}`);
    }
    
    async getBook(bookId) {
        return await this.request(`/books/${bookId}`);
    }
    
    async createBook(bookData) {
        return await this.request('/books', {
            method: 'POST',
            body: JSON.stringify(bookData)
        });
    }
    
    async updateBook(bookId, bookData) {
        return await this.request(`/books/${bookId}`, {
            method: 'PUT',
            body: JSON.stringify(bookData)
        });
    }
    
    async deleteBook(bookId) {
        return await this.request(`/books/${bookId}`, {
            method: 'DELETE'
        });
    }
    
    // Highlights management
    async getHighlights(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await this.request(`/highlights?${searchParams}`);
    }
    
    async createHighlight(highlightData) {
        return await this.request('/highlights', {
            method: 'POST',
            body: JSON.stringify(highlightData)
        });
    }
    
    async updateHighlight(highlightId, highlightData) {
        return await this.request(`/highlights/${highlightId}`, {
            method: 'PUT',
            body: JSON.stringify(highlightData)
        });
    }
    
    async deleteHighlight(highlightId) {
        return await this.request(`/highlights/${highlightId}`, {
            method: 'DELETE'
        });
    }
    
    async searchHighlights(query, userId, bookId = null) {
        const params = { query, userId };
        if (bookId) params.bookId = bookId;
        const searchParams = new URLSearchParams(params);
        return await this.request(`/highlights/search?${searchParams}`);
    }
    
    // Tab content management
    async getTabs(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await this.request(`/tabs?${searchParams}`);
    }
    
    async createTab(tabData) {
        return await this.request('/tabs', {
            method: 'POST',
            body: JSON.stringify(tabData)
        });
    }
    
    async updateTab(tabId, tabData) {
        return await this.request(`/tabs/${tabId}`, {
            method: 'PUT',
            body: JSON.stringify(tabData)
        });
    }
    
    async deleteTab(tabId) {
        return await this.request(`/tabs/${tabId}`, {
            method: 'DELETE'
        });
    }
    
    // Exam and question papers
    async getQuestionPapers(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await this.request(`/exams/papers?${searchParams}`);
    }
    
    async createQuestionPaper(paperData) {
        return await this.request('/exams/papers', {
            method: 'POST',
            body: JSON.stringify(paperData)
        });
    }
    
    async updateQuestionPaper(paperId, paperData) {
        return await this.request(`/exams/papers/${paperId}`, {
            method: 'PUT',
            body: JSON.stringify(paperData)
        });
    }
    
    async getEvaluationReports(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await this.request(`/exams/reports?${searchParams}`);
    }
    
    // File upload methods
    async uploadBookCover(file, bookId) {
        const formData = new FormData();
        formData.append('cover', file);
        formData.append('bookId', bookId);
        
        return await this.uploadFile('/uploads/book-cover', formData);
    }
    
    async uploadDocument(file, userId, category = 'general') {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('userId', userId);
        formData.append('category', category);
        
        return await this.uploadFile('/uploads/document', formData);
    }
    
    async uploadMedia(file, userId, mediaType = 'general', isPublic = false) {
        const formData = new FormData();
        formData.append('media', file);
        formData.append('userId', userId);
        formData.append('mediaType', mediaType);
        formData.append('isPublic', isPublic);
        
        return await this.uploadFile('/uploads/media', formData);
    }
    
    async uploadFile(endpoint, formData) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {};
        
        // Add auth token if available (don't set Content-Type for FormData)
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`File upload failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    // Health check
    async healthCheck() {
        return await this.request('/health');
    }
    
    // Cache management (for localStorage migration)
    async syncLocalDataToServer(userId) {
        try {
            const results = {
                highlights: { success: 0, failed: 0 },
                tabs: { success: 0, failed: 0 },
                preferences: { success: false, failed: false }
            };
            
            // Sync highlights
            const localHighlights = JSON.parse(localStorage.getItem('highlights') || '[]');
            for (const highlight of localHighlights) {
                try {
                    await this.createHighlight({ ...highlight, userId });
                    results.highlights.success++;
                } catch (error) {
                    console.error('Failed to sync highlight:', error);
                    results.highlights.failed++;
                }
            }
            
            // Sync user preferences
            const themeMode = localStorage.getItem('theme-mode');
            const customColors = localStorage.getItem('custom-theme-colors');
            
            if (themeMode || customColors) {
                try {
                    const preferences = {};
                    if (themeMode) preferences.theme = themeMode;
                    if (customColors) preferences.customColors = JSON.parse(customColors);
                    
                    await this.updateUserPreferences(userId, preferences);
                    results.preferences.success = true;
                } catch (error) {
                    console.error('Failed to sync preferences:', error);
                    results.preferences.failed = true;
                }
            }
            
            return results;
        } catch (error) {
            console.error('Data sync failed:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
const apiService = new ApiService();

export default apiService;