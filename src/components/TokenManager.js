'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
    PublicKey,
    Transaction,
    SendTransactionError,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
    createBurnInstruction,
    createCloseAccountInstruction,
    createTransferInstruction,
    createApproveInstruction,
    createRevokeInstruction,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import TokenCreation from './TokenCreation';

export default function TokenManager() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const { addNotification } = useNotification();
    const [userTokens, setUserTokens] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [action, setAction] = useState('');
    const [amount, setAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const fetchUserTokens = useCallback(async () => {
        if (!wallet.publicKey) return;

        setIsLoading(true);
        setStatusMessage('Fetching your tokens...');
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
                programId: TOKEN_PROGRAM_ID
            });

            const token2022Accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
                programId: TOKEN_2022_PROGRAM_ID
            });

            const metaplex = Metaplex.make(connection);

            const allTokens = [...tokenAccounts.value, ...token2022Accounts.value];
            const tokenDetailsPromises = allTokens.map(async (account) => {
                const mintAddress = new PublicKey(account.account.data.parsed.info.mint);
                let tokenMetadata = null;
                try {
                    tokenMetadata = await metaplex.nfts().findByMint({ mintAddress });
                } catch (error) {
                    // Silently ignore metadata not found errors
                }
                return {
                    ...account.account.data.parsed.info,
                    mintAddress: mintAddress.toBase58(),
                    metadata: tokenMetadata,
                    programId: account.account.owner
                };
            });

            const tokenDetails = await Promise.all(tokenDetailsPromises);
            setUserTokens(tokenDetails);
            setStatusMessage('');
        } catch (error) {
            console.error('Error fetching user tokens:', error);
            addNotification('Failed to fetch tokens', 'error');
            setStatusMessage('Failed to fetch tokens. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [wallet.publicKey, connection, addNotification]);

    const fetchTokenDelegate = useCallback(async (tokenAddress) => {
        try {
            const accountInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
            if (accountInfo.value && accountInfo.value.data.parsed.info.delegate) {
                return accountInfo.value.data.parsed.info.delegate;
            }
            return null;
        } catch (error) {
            console.error('Error fetching token delegate:', error);
            return null;
        }
    }, [connection]);

    useEffect(() => {
        if (wallet.publicKey) {
            fetchUserTokens();
        }
    }, [wallet.publicKey, fetchUserTokens]);

    const handleAction = useCallback(async () => {
        if (!selectedToken || !action) {
            addNotification('Please select a token and an action', 'error');
            return;
        }

        if ((action === 'burn' || action === 'transfer' || action === 'delegate') && !amount) {
            addNotification('Please enter an amount', 'error');
            return;
        }

        if ((action === 'transfer' || action === 'delegate') && !recipientAddress) {
            addNotification('Please enter a recipient address', 'error');
            return;
        }

        setIsLoading(true);
        setStatusMessage(`Preparing to ${action} token...`);
        try {
            const tokenMintAddress = new PublicKey(selectedToken.mintAddress);
            const tokenAddress = await getAssociatedTokenAddress(
                tokenMintAddress,
                wallet.publicKey
            );

            let instructions = [];

            switch (action) {
                case 'burn':
                    const amountToBurn = Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.tokenAmount.decimals));
                    instructions.push(
                        createBurnInstruction(
                            tokenAddress,
                            tokenMintAddress,
                            wallet.publicKey,
                            amountToBurn
                        )
                    );
                    break;
                case 'transfer':
                    const amountToTransfer = Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.tokenAmount.decimals));
                    const recipientPublicKey = new PublicKey(recipientAddress);
                    const recipientTokenAddress = await getAssociatedTokenAddress(
                        tokenMintAddress,
                        recipientPublicKey
                    );

                    const recipientTokenAccountInfo = await connection.getAccountInfo(recipientTokenAddress);
                    if (!recipientTokenAccountInfo) {
                        instructions.push(
                            createAssociatedTokenAccountInstruction(
                                wallet.publicKey,
                                recipientTokenAddress,
                                recipientPublicKey,
                                tokenMintAddress
                            )
                        );
                    }

                    instructions.push(
                        createTransferInstruction(
                            tokenAddress,
                            recipientTokenAddress,
                            wallet.publicKey,
                            amountToTransfer
                        )
                    );
                    break;
                case 'delegate':
                    const amountToDelegate = Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.tokenAmount.decimals));
                    instructions.push(
                        createApproveInstruction(
                            tokenAddress,
                            new PublicKey(recipientAddress),
                            wallet.publicKey,
                            amountToDelegate
                        )
                    );
                    break;
                case 'revoke':
                    const currentDelegate = await fetchTokenDelegate(tokenAddress);
                    if (!currentDelegate) {
                        throw new Error('No delegate found for this token.');
                    }
                    instructions.push(
                        createRevokeInstruction(
                            tokenAddress,
                            wallet.publicKey,
                            []
                        )
                    );
                    break;
                case 'close':
                    const accountInfo = await connection.getTokenAccountBalance(tokenAddress);
                    if (accountInfo.value.uiAmount > 0) {
                        throw new Error('Cannot close account with non-zero balance. Please transfer or burn remaining tokens first.');
                    }
                    instructions.push(
                        createCloseAccountInstruction(
                            tokenAddress,
                            wallet.publicKey,
                            wallet.publicKey,
                            []
                        )
                    );
                    break;
                default:
                    throw new Error('Invalid action');
            }

            setStatusMessage('Creating transaction...');
            const transaction = new Transaction().add(...instructions);

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            setStatusMessage('Signing transaction...');
            const signedTransaction = await wallet.signTransaction(transaction);

            setStatusMessage('Sending transaction...');
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());

            setStatusMessage('Confirming transaction...');
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed to confirm');
            }

            let actionMessage = '';
            switch (action) {
                case 'burn':
                    actionMessage = `Burned ${amount} tokens successfully.`;
                    break;
                case 'transfer':
                    actionMessage = `Transferred ${amount} tokens to ${recipientAddress} successfully.`;
                    break;
                case 'delegate':
                    actionMessage = `Delegated ${amount} tokens to ${recipientAddress} successfully.`;
                    break;
                case 'revoke':
                    actionMessage = `Revoked delegation for the token successfully.`;
                    break;
                case 'close':
                    actionMessage = `Closed the token account successfully.`;
                    break;
            }

            setStatusMessage(actionMessage);
            addNotification(actionMessage, 'success');
            await fetchUserTokens();

            // Clear input fields after successful action
            setAmount('');
            setRecipientAddress('');
        } catch (error) {
            console.error(`Error performing ${action} action:`, error);

            if (error instanceof SendTransactionError) {
                const logs = error.logs;
                console.error('Transaction logs:', logs);
                if (logs && logs.some(log => log.includes('insufficient funds'))) {
                    setStatusMessage('Insufficient funds to complete this transaction. Please check your balance and try again.');
                    addNotification('Insufficient funds to complete this transaction. Please check your balance and try again.', 'error');
                } else if (logs && logs.some(log => log.includes('Non-native account can only be closed if its balance is zero'))) {
                    setStatusMessage('Cannot close account with non-zero balance. Please transfer or burn remaining tokens first.');
                    addNotification('Cannot close account with non-zero balance. Please transfer or burn remaining tokens first.', 'error');
                } else {
                    setStatusMessage(`Failed to ${action} token. ${error.message}`);
                    addNotification(`Failed to ${action} token. ${error.message}`, 'error');
                }
            } else {
                setStatusMessage(`Failed to ${action} token. ${error.message}`);
                addNotification(`Failed to ${action} token. ${error.message}`, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedToken, action, amount, recipientAddress, wallet, connection, addNotification, fetchUserTokens, fetchTokenDelegate]);

    const handleTokenCreated = useCallback(() => {
        fetchUserTokens();
    }, [fetchUserTokens]);

    return (
        <div className={`max-w-6xl mx-auto p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-lg transition-all duration-300`}>
            <TokenCreation setIsLoading={setIsLoading} onTokenCreated={handleTokenCreated} />

            <div className="space-y-6 mt-8">
                <h2 className="text-2xl font-semibold mb-4">Manage Your Tokens</h2>
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-center text-gray-500">{statusMessage}</p>
                    </div>
                ) : userTokens.length > 0 ? (
                    <>
                        <select
                            value={selectedToken ? selectedToken.mintAddress : ''}
                            onChange={(e) => setSelectedToken(userTokens.find(t => t.mintAddress === e.target.value))}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select a token</option>
                            {userTokens.map((token) => (
                                <option key={token.mintAddress} value={token.mintAddress}>
                                    {token.metadata ? token.metadata.name : token.mintAddress} ({token.tokenAmount.uiAmount})
                                </option>
                            ))}
                        </select>

                        {selectedToken && (
                            <div className="space-y-4">
                                <div className="flex space-x-2">
                                    {['burn', 'transfer', 'delegate', 'revoke', 'close'].map((actionType) => (
                                        <button
                                            key={actionType}
                                            onClick={() => setAction(actionType)}
                                            className={`flex-1 py-2 px-4 rounded ${action === actionType ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} transition-colors duration-200`}
                                        >
                                            {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {(action === 'burn' || action === 'transfer' || action === 'delegate') && (
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Amount"
                                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {(action === 'transfer' || action === 'delegate') && (
                                    <input
                                        type="text"
                                        value={recipientAddress}
                                        onChange={(e) => setRecipientAddress(e.target.value)}
                                        placeholder="Recipient Address"
                                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                <button
                                    onClick={handleAction}
                                    disabled={isLoading}
                                    className={`w-full ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Processing...' : 'Confirm Action'}
                                </button>

                                {statusMessage && (
                                    <div className={`mt-4 p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        {statusMessage}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-center text-gray-500">No tokens found. Create a token to get started!</p>
                )}
            </div>
        </div>
    );
}