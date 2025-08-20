import React from 'react';

interface AILoadingAnimationProps {
    message?: string;
    emoji?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const AILoadingAnimation: React.FC<AILoadingAnimationProps> = ({ 
    message = "AI is processing...", 
    emoji = "🧠", 
    size = 'md',
    className = ""
}) => {
    const sizeClasses = {
        sm: { spinner: 'w-3 h-3', text: 'text-xs' },
        md: { spinner: 'w-4 h-4', text: 'text-sm' },
        lg: { spinner: 'w-6 h-6', text: 'text-base' }
    };

    const currentSize = sizeClasses[size];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Spinning brain animation */}
            <div className="relative">
                <div className={`animate-spin ${currentSize.spinner} border-2 border-white border-t-transparent rounded-full`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'} animate-pulse opacity-80`}>
                        {emoji}
                    </span>
                </div>
            </div>
            
            {/* Animated message */}
            <span className={`${currentSize.text} animate-pulse font-medium`}>
                {message}
            </span>
            
            {/* Cute thinking dots */}
            <div className="flex gap-1">
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
    );
};

export default AILoadingAnimation;
