import React, { useState, useEffect } from 'react';
import { geminiAPIService } from '../services/GeminiAPIService';

interface PremiumAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PremiumAIModal: React.FC<PremiumAIModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStatus, setCurrentStatus] = useState(geminiAPIService.getStatus());

  useEffect(() => {
    if (isOpen) {
      setCurrentStatus(geminiAPIService.getStatus());
      setStatus('idle');
      setErrorMessage('');
      setApiKey('');
    }
  }, [isOpen]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setStatus('testing');
    setErrorMessage('');

    try {
      const success = await geminiAPIService.setUserApiKey(apiKey.trim());
      
      if (success) {
        setStatus('success');
        setCurrentStatus(geminiAPIService.getStatus());
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage('Invalid API key or no quota available');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to validate API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApiKey = () => {
    geminiAPIService.clearApiKey();
    setCurrentStatus(geminiAPIService.getStatus());
    setApiKey('');
    setStatus('idle');
    setErrorMessage('');
  };

  const instructions = geminiAPIService.getApiKeyInstructions();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="theme-surface rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold theme-text">Premium AI Settings</h2>
            <button
              onClick={onClose}
              className="theme-text hover:theme-accent-text theme-transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Status */}
          {currentStatus.configured && (
            <div className="mb-6 p-4 theme-bg-secondary rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium theme-text">✅ Premium AI Active</h3>
                  <p className="text-sm theme-text-secondary">
                    API Key: {currentStatus.apiKey}
                  </p>
                  <p className="text-xs theme-text-secondary">
                    🔄 Cascading Models: 2.5-Pro → 2.5-Flash → 2.0-Flash → Groq
                  </p>
                  <p className="text-xs theme-text-secondary">
                    🧠 Dynamic thinking enabled for enhanced reasoning
                  </p>
                  {currentStatus.lastValidated && (
                    <p className="text-xs theme-text-secondary">
                      Last validated: {new Date(currentStatus.lastValidated).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleRemoveApiKey}
                  className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded theme-transition"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6">
            <h3 className="font-semibold theme-text mb-3">{instructions.title}</h3>
            
            <div className="space-y-4">
              {/* Steps */}
              <div>
                <h4 className="font-medium theme-text mb-2">Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm theme-text-secondary">
                  {instructions.steps.map((step, index) => (
                    <li key={index}>
                      {step.includes('https://') ? (
                        <>
                          Go to{' '}
                          <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            https://aistudio.google.com/app/apikey
                          </a>
                        </>
                      ) : (
                        step
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Benefits */}
              <div>
                <h4 className="font-medium theme-text mb-2">Benefits:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm theme-text-secondary">
                  {instructions.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>

              {/* Quota Info */}
              <div className="p-3 theme-bg-accent rounded-lg">
                <p className="text-sm font-medium theme-accent-text">
                  🎯 {instructions.quotaInfo}
                </p>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium theme-text mb-2">
                Your Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md theme-surface theme-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            {/* Status Messages */}
            {status === 'testing' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Testing API key...</span>
              </div>
            )}

            {status === 'success' && (
              <div className="text-green-600 text-sm">
                ✅ API key validated successfully! Closing modal...
              </div>
            )}

            {status === 'error' && errorMessage && (
              <div className="text-red-600 text-sm">
                ❌ {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleSaveApiKey}
                disabled={isLoading || !apiKey.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md theme-transition"
              >
                {isLoading ? 'Testing...' : 'Save & Test API Key'}
              </button>
              
              <button
                onClick={onClose}
                className="px-4 py-2 theme-surface border border-gray-300 theme-text rounded-md hover:theme-bg-secondary theme-transition"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700">
              🔒 <strong>Security:</strong> Your API key is stored locally in your browser and never sent to our servers. 
              It's only used to make direct requests to Google's Gemini API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumAIModal;
