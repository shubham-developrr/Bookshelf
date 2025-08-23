import React, { useState, useEffect } from 'react';
import apiService from '../services/ApiService';

interface BackendStatusProps {
    className?: string;
}

const BackendStatus: React.FC<BackendStatusProps> = ({ className = '' }) => {
    const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    useEffect(() => {
        checkBackendStatus();
        
        // Check status every 30 seconds
        const interval = setInterval(checkBackendStatus, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const checkBackendStatus = async () => {
        try {
            setStatus('checking');
            await apiService.healthCheck();
            setStatus('online');
            setLastChecked(new Date());
        } catch (error) {
            console.error('Backend health check failed:', error);
            setStatus('offline');
            setLastChecked(new Date());
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'checking':
                return (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                );
            case 'online':
                return (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                );
            case 'offline':
                return (
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                );
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'checking':
                return 'Checking...';
            case 'online':
                return 'Backend Online';
            case 'offline':
                return 'Backend Offline';
        }
    };

    return (
        <div 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg theme-surface2 ${className}`}
            title={lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking backend status...'}
        >
            {getStatusIcon()}
            <span className="text-sm theme-text-secondary">
                {getStatusText()}
            </span>
            <button
                onClick={checkBackendStatus}
                className="text-xs theme-text-secondary hover:theme-accent-text theme-transition ml-2"
                disabled={status === 'checking'}
            >
                {status === 'checking' ? '⟳' : '↻'}
            </button>
        </div>
    );
};

export default BackendStatus;