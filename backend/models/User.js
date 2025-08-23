import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    profile: {
        firstName: String,
        lastName: String,
        avatar: String,
        bio: String,
        institution: String,
        role: {
            type: String,
            enum: ['student', 'teacher', 'admin'],
            default: 'student'
        }
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'blue', 'amoled'],
            default: 'light'
        },
        language: {
            type: String,
            default: 'en'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            }
        }
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'premium', 'pro'],
            default: 'free'
        },
        expiresAt: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for search and authentication
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

const User = mongoose.model('User', UserSchema);

export default User;