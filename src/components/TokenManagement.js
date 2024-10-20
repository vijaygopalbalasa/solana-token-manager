import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, burn, transfer, approve, closeAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';

function TokenManagement({ setIsLoading }) {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const { addNotification } = useNotification();
    const [tokenAddress, setTokenAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');

    const handleAction = async (action) => {
        if (!publicKey) {
            addNotification('Please connect your wallet', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const tokenPublicKey = new PublicKey(tokenAddress);
            const associatedTokenAddress = await getAssociatedTokenAddress(tokenPublicKey, publicKey);

            switch (action) {
                case 'burn':
                    await burnTokens(tokenPublicKey, associatedTokenAddress);
                    break;
                case 'transfer':
                    await transferTokens(tokenPublicKey, associatedTokenAddress);
                    break;
                case 'delegate':
                    await delegateTokens(tokenPublicKey, associatedTokenAddress);
                    break;
                case 'close':
                    await closeTokenAccount(tokenPublicKey, associatedTokenAddress);
                    break;
                default:
                    throw new Error('Invalid action');
            }

            addNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} action completed successfully!`, 'success');
        } catch (error) {
            console.error(`Error performing ${action} action:`, error);
            addNotification(`Failed to ${action}. Check console for details.`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const burnTokens = async (tokenPublicKey, associatedTokenAddress) => {
        await burn(
            connection,
            {
                publicKey,
                signTransaction: async (tx) => {
                    const signedTx = await signTransaction(tx);
                    return signedTx;
                },
            },
            associatedTokenAddress,
            tokenPublicKey,
            publicKey,
            parseInt(amount)
        );
    };

    const transferTokens = async (tokenPublicKey, associatedTokenAddress) => {
        const recipientTokenAddress = await getAssociatedTokenAddress(tokenPublicKey, new PublicKey(recipientAddress));
        await transfer(
            connection,
            {
                publicKey,
                signTransaction: async (tx) => {
                    const signedTx = await signTransaction(tx);
                    return signedTx;
                },
            },
            associatedTokenAddress,
            recipientTokenAddress,
            publicKey,
            parseInt(amount)
        );
    };

    const delegateTokens = async (tokenPublicKey, associatedTokenAddress) => {
        await approve(
            connection,
            {
                publicKey,
                signTransaction: async (tx) => {
                    const signedTx = await signTransaction(tx);
                    return signedTx;
                },
            },
            associatedTokenAddress,
            new PublicKey(recipientAddress),
            publicKey,
            parseInt(amount)
        );
    };

    const closeTokenAccount = async (tokenPublicKey, associatedTokenAddress) => {
        await closeAccount(
            connection,
            {
                publicKey,
                signTransaction: async (tx) => {
                    const signedTx = await signTransaction(tx);
                    return signedTx;
                },
            },
            associatedTokenAddress,
            publicKey,
            publicKey
        );
    };

    return (
        <div className="mb-6">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Manage Tokens</h2>
            <form className="space-y-4">
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Token Address</label>
                    <input
                        type="text"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Recipient Address (for transfer and delegate)</label>
                    <input
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="flex space-x-2">
                    {['burn', 'transfer', 'delegate', 'close'].map((action) => (
                        <button
                            key={action}
                            onClick={() => handleAction(action)}
                            className={`flex-1 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded transition-colors duration-200`}
                            type="button"
                        >
                            {action.charAt(0).toUpperCase() + action.slice(1)}
                        </button>
                    ))}
                </div>
            </form>
        </div>
    );
}

export default TokenManagement;