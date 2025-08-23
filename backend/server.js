import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';

// Import routes
import bookRoutes from './routes/books.js';
import unitRoutes from './routes/units.js';
import tabRoutes from './routes/tabs.js';
import examRoutes from './routes/exams.js';
import highlightRoutes from './routes/highlights.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/uploads.js';
import supabaseStorage from './services/SupabaseStorageService.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/tabs', tabRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);

// Initialize Supabase storage buckets
supabaseStorage.initializeBuckets().catch(console.error);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Interactive Study Bookshelf Backend API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
});

// 404 handler
app.all('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});