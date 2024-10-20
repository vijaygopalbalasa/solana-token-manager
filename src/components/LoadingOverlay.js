import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import LoadingIndicator from './LoadingIndicator';

function LoadingOverlay({ isLoading }) {
    const { darkMode } = useTheme();

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <LoadingIndicator />
                <p className={`mt-4 text-center ${darkMode ? 'text-white' : 'text-black'}`}>Loading...</p>
            </div>
        </div>
    );
}

export default LoadingOverlay;