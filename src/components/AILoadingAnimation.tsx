import React from 'react';

/**
 * @interface AILoadingAnimationProps
 * @description Defines the props for the AILoadingAnimation component.
 * @property {string} [message] - The loading message to display.
 * @property {string} [emoji] - The emoji to display in the center of the spinner.
 * @property {'sm' | 'md' | 'lg'} [size] - The size of the loading animation.
 * @property {string} [className] - Additional CSS classes to apply to the component.
 */
interface AILoadingAnimationProps {
    message?: string;
    emoji?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * @description A component that displays a visually engaging loading indicator,
 * specifically designed for AI-related processes. It includes a spinner, an emoji,
 * a message, and animated dots.
 * @param {AILoadingAnimationProps} props - The props for the component.
 * @returns {JSX.Element} The AILoadingAnimation component.
 */
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
