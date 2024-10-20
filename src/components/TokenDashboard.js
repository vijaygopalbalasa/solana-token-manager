import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useTheme } from '../contexts/ThemeContext';
import LoadingIndicator from './LoadingIndicator';

function TokenDashboard() {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const [tokenAccounts, setTokenAccounts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (publicKey) {
            fetchTokenAccounts();
        }
    }, [publicKey, connection]);

    const fetchTokenAccounts = async () => {
        setLoading(true);
        try {
            const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
            });

            const formattedAccounts = accounts.value.map((account) => ({
                mint: account.account.data.parsed.info.mint,
                amount: account.account.data.parsed.info.tokenAmount.uiAmount,
                decimals: account.account.data.parsed.info.tokenAmount.decimals,
            }));

            setTokenAccounts(formattedAccounts);
        } catch (error) {
            console.error('Error fetching token accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Token Dashboard</h2>
            {loading ? (
                <LoadingIndicator />
            ) : (
                <div className="space-y-2">
                    {tokenAccounts.map((account, index) => (
                        <div key={index} className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <p className={darkMode ? 'text-white' : 'text-black'}>
                                Mint: {account.mint}
                            </p>
                            <p className={darkMode ? 'text-white' : 'text-black'}>
                                Balance: {account.amount} (Decimals: {account.decimals})
                            </p>
                        </div>
                    ))}
                    {tokenAccounts.length === 0 && (
                        <p className={darkMode ? 'text-white' : 'text-black'}>No token accounts found.</p>
                    )}
                </div>
            )}
            <button
                onClick={fetchTokenAccounts}
                className={`mt-4 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded transition-colors duration-200`}
            >
                Refresh Balances
            </button>
        </div>
    );
}

export default TokenDashboard;