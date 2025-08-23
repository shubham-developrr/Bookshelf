import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, profile } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: 'User already exists with this email or username' 
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const userData = {
            username,
            email,
            password: hashedPassword,
            profile: profile || {}
        };
        
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: savedUser._id, email: savedUser.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        // Return user without password
        const userResponse = {
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            profile: savedUser.profile,
            preferences: savedUser.preferences,
            subscription: savedUser.subscription,
            createdAt: savedUser.createdAt
        };
        
        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            token
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                errors: Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }))
            });
        }
        res.status(500).json({ message: error.message });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        // Find user
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        // Return user without password
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            profile: user.profile,
            preferences: user.preferences,
            subscription: user.subscription,
            lastLogin: user.lastLogin
        };
        
        res.json({
            message: 'Login successful',
            user: userResponse,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user profile
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user profile
router.put('/profile/:id', async (req, res) => {
    try {
        const { profile, preferences } = req.body;
        
        const updateData = {};
        if (profile) updateData.profile = { ...updateData.profile, ...profile };
        if (preferences) updateData.preferences = { ...updateData.preferences, ...preferences };
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user preferences (theme, etc.)
router.put('/:id/preferences', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { preferences: { ...req.body } } },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user.preferences);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Change password
router.put('/:id/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                message: 'Current password and new password are required' 
            });
        }
        
        const user = await User.findById(req.params.id).select('+password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        user.password = hashedNewPassword;
        await user.save();
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all users (admin only - would need auth middleware in production)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, role, isActive } = req.query;
        
        const query = {};
        if (role) query['profile.role'] = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await User.countDocuments(query);
        
        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user account
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ message: 'User account deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify token endpoint
router.post('/verify-token', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        res.json({ 
            valid: true, 
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profile: user.profile,
                preferences: user.preferences,
                subscription: user.subscription
            }
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

export default router;