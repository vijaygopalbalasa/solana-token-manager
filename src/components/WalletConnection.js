import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useTheme } from '../contexts/ThemeContext';

function WalletConnection() {
    const { publicKey } = useWallet();
    const { darkMode } = useTheme();

    return (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <WalletMultiButton className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-colors duration-200`} />
            {publicKey && (
                <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Connected: {publicKey.toBase58()}
                </p>
            )}
        </div>
    );
}

export default WalletConnection;