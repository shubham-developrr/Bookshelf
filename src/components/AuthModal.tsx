import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login, register } = useAuth();

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await register({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    profile: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        role: 'student'
                    }
                });
            }
            
            onClose();
            
            // Reset form
            setFormData({
                username: '',
                email: '',
                password: '',
                firstName: '',
                lastName: ''
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="theme-surface rounded-lg p-6 w-full max-w-md mx-4 theme-transition">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold theme-text">
                        {isLogin ? 'Login' : 'Register'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="theme-text-secondary hover:theme-accent-text theme-transition"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required={!isLogin}
                                    className="w-full p-3 border border-gray-300 rounded-lg theme-bg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter username"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium theme-text mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg theme-bg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="First name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium theme-text mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg theme-bg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Last name"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg theme-bg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter email"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                            className="w-full p-3 border border-gray-300 rounded-lg theme-bg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                    >
                        {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="theme-text-secondary">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="ml-2 text-blue-500 hover:text-blue-600 font-medium"
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </button>
                    </p>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                        <strong>Backend Integration:</strong> This form connects to the Node.js/Express backend. 
                        Register to create an account or use demo credentials.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;