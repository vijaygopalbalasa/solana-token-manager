import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

function Footer() {
    const { darkMode } = useTheme();

    return (
        <footer className={`mt-8 py-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <p>&copy; 2024 Token Manager. All rights reserved.</p>
                    <div className="flex space-x-4">
                        <a href="#" className="hover:underline">Documentation</a>
                        <a href="#" className="hover:underline">Twitter</a>
                        <a href="#" className="hover:underline">GitHub</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;