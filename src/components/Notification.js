import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';

function Notification() {
    const { notifications, removeNotification } = useNotification();
    const { darkMode } = useTheme();

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`mb-2 p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
                        } ${notification.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'
                        }`}
                >
                    <div className="flex justify-between items-center">
                        <p>{notification.message}</p>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="ml-4 text-gray-500 hover:text-gray-700"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Notification;