import React, { useState, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useJupiter } from '@jup-ag/react-hook';
import { PublicKey } from '@solana/web3.js';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingIndicator from './LoadingIndicator';

function TokenSwap({ setIsLoading }) {
    const { publicKey, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const { addNotification } = useNotification();
    const [inputMint, setInputMint] = useState('');
    const [outputMint, setOutputMint] = useState('');
    const [amount, setAmount] = useState('');

    const jupiterProps = useMemo(() => ({
        amount: parseFloat(amount),
        inputMint: new PublicKey(inputMint),
        outputMint: new PublicKey(outputMint),
        slippageBps: 50, // 0.5% slippage
        debounceTime: 250,
    }), [amount, inputMint, outputMint]);

    const { routeMap, allTokenMints, routes, loading: jupiterLoading, exchange } = useJupiter(jupiterProps);

    const handleSwap = async () => {
        if (!routes || routes.length === 0) {
            addNotification('No routes available for this swap', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { transactions } = await exchange({
                wallet: {
                    sendTransaction: connection.sendRawTransaction,
                    publicKey,
                    signAllTransactions,
                },
                route: routes[0],
                confirmationWaitTime: 15000,
            });

            await Promise.all(transactions.map((tx) => connection.confirmTransaction(tx)));
            addNotification('Swap completed successfully!', 'success');
        } catch (error) {
            console.error('Error during swap:', error);
            addNotification('Swap failed. Check console for details.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Token Swap</h2>
            <div className="space-y-4">
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Input Token Mint</label>
                    <input
                        type="text"
                        value={inputMint}
                        onChange={(e) => setInputMint(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter input token mint address"
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Output Token Mint</label>
                    <input
                        type="text"
                        value={outputMint}
                        onChange={(e) => setOutputMint(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter output token mint address"
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter amount to swap"
                    />
                </div>
                <button
                    onClick={handleSwap}
                    disabled={jupiterLoading || !routes || routes.length === 0}
                    className={`w-full ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded transition-colors duration-200`}
                >
                    {jupiterLoading ? <LoadingIndicator /> : 'Swap Tokens'}
                </button>
                {routes && routes.length > 0 && (
                    <div className={`mt-4 ${darkMode ? 'text-white' : 'text-black'}`}>
                        <p>Best route:</p>
                        <p>Input: {routes[0].inputAmount} {routes[0].inputMint}</p>
                        <p>Output: {routes[0].outputAmount} {routes[0].outputMint}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TokenSwap;