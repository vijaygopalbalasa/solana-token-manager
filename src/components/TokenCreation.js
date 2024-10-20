import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { WebBundlr } from '@bundlr-network/client';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { FaCoins, FaPalette, FaCheckCircle, FaExternalLinkAlt, FaCopy } from 'react-icons/fa';

function TokenCreation({ setIsLoading, onTokenCreated }) {
    const wallet = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const { addNotification } = useNotification();
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [tokenSupply, setTokenSupply] = useState('');
    const [tokenStandard, setTokenStandard] = useState('original');
    const [isNFT, setIsNFT] = useState(false);
    const [nftProgram, setNftProgram] = useState('tokenMetadata');
    const [nftUri, setNftUri] = useState('');
    const [createdTokenInfo, setCreatedTokenInfo] = useState(null);

    const handleCreateToken = useCallback(async (e) => {
        e.preventDefault();
        console.log('Create Token button clicked');

        if (!wallet.publicKey || !wallet.sendTransaction) {
            console.log('Wallet not connected or does not support transactions');
            addNotification('Please connect a wallet that supports transactions', 'error');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Starting token creation process');
            if (isNFT) {
                console.log('Creating NFT');
                await createNFT();
            } else {
                console.log('Creating fungible token');
                await createFungibleToken();
            }
            onTokenCreated(); // Call this after successful token creation
        } catch (error) {
            console.error('Error creating token:', error);
            addNotification(`Failed to create token: ${error.message}`, 'error');
            setCreatedTokenInfo(null);
        } finally {
            setIsLoading(false);
        }
    }, [wallet, connection, isNFT, tokenName, tokenSymbol, tokenSupply, tokenStandard, nftProgram, nftUri, addNotification, setIsLoading, onTokenCreated]);

    const createNFT = useCallback(async () => {
        console.log('Inside createNFT function');
        const metaplex = Metaplex.make(connection)
            .use(walletAdapterIdentity(wallet));

        try {
            const bundlr = new WebBundlr("https://node1.bundlr.network", "solana", wallet);
            await bundlr.ready();

            const metadata = {
                name: tokenName,
                symbol: tokenSymbol,
                description: "NFT description",
                image: nftUri
            };
            const metadataString = JSON.stringify(metadata);
            const metadataBuffer = Buffer.from(metadataString);

            const metadataTransaction = bundlr.createTransaction(metadataBuffer, {
                tags: [{ name: "Content-Type", value: "application/json" }]
            });
            await metadataTransaction.sign();
            const uploadResponse = await metadataTransaction.upload();
            console.log('Metadata uploaded:', uploadResponse);

            const metadataUri = `https://arweave.net/${uploadResponse.id}`;

            let nftMint;

            switch (nftProgram) {
                case 'tokenMetadata':
                case 'core':
                case 'bubblegum':
                    nftMint = await metaplex.nfts().create({
                        uri: metadataUri,
                        name: tokenName,
                        sellerFeeBasisPoints: 500,
                    });
                    break;
                default:
                    throw new Error('Invalid NFT program selected');
            }

            setCreatedTokenInfo({
                mintAddress: nftMint.mintAddress.toBase58(),
                tokenName,
                tokenSymbol,
                tokenSupply: '1',
                txid: nftMint.response.signature,
                isNFT: true,
                metadataUri
            });
            addNotification(`NFT created successfully! Mint address: ${nftMint.mintAddress.toBase58()}`, 'success');
        } catch (error) {
            console.error('Error in createNFT:', error);
            throw error;
        }
    }, [wallet, connection, tokenName, tokenSymbol, nftUri, nftProgram, addNotification]);

    const createFungibleToken = useCallback(async () => {
        console.log('Inside createFungibleToken function');
        const programId = tokenStandard === 'original' ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

        if (!wallet.publicKey) throw new Error('Wallet public key is undefined');

        // Create a new keypair for the mint
        const mintKeypair = Keypair.generate();
        console.log('Mint public key:', mintKeypair.publicKey.toBase58());

        try {
            // Create mint account
            const createAccountInstruction = SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: 82,
                lamports: await connection.getMinimumBalanceForRentExemption(82),
                programId
            });

            // Initialize mint instruction
            const initializeMintInstruction = createInitializeMintInstruction(
                mintKeypair.publicKey,
                9,
                wallet.publicKey,
                wallet.publicKey,
                programId
            );

            // Create associated token account for the wallet
            const associatedTokenAddress = await getAssociatedTokenAddress(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                programId
            );

            const createATAInstruction = createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                associatedTokenAddress,
                wallet.publicKey,
                mintKeypair.publicKey,
                programId,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            // Mint to instruction
            const mintToInstruction = createMintToInstruction(
                mintKeypair.publicKey,
                associatedTokenAddress,
                wallet.publicKey,
                Number(tokenSupply) * (10 ** 9), // Adjust for decimals
                [],
                programId
            );

            const transaction = new Transaction();
            transaction.add(
                createAccountInstruction,
                initializeMintInstruction,
                createATAInstruction,
                mintToInstruction
            );

            // Use the wallet's sendTransaction method
            const txid = await wallet.sendTransaction(transaction, connection, {
                signers: [mintKeypair],
                preflightCommitment: 'confirmed',
                skipPreflight: false
            });

            console.log('Transaction sent:', txid);

            // Wait for confirmation
            const confirmation = await connection.confirmTransaction(txid, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }

            console.log('Transaction confirmed:', txid);
            const newTokenInfo = {
                mintAddress: mintKeypair.publicKey.toBase58(),
                tokenName,
                tokenSymbol,
                tokenSupply,
                txid,
                isNFT: false
            };
            setCreatedTokenInfo(newTokenInfo);
            addNotification(`Token created successfully! Mint address: ${mintKeypair.publicKey.toBase58()}`, 'success');
        } catch (error) {
            console.error('Error in createFungibleToken:', error);
            throw error;
        }
    }, [wallet, connection, tokenStandard, tokenSupply, tokenName, tokenSymbol, addNotification]);

    const TruncatedField = ({ label, value, copyable = true }) => {
        const truncatedValue = value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-10)}` : value;

        const copyToClipboard = () => {
            navigator.clipboard.writeText(value);
            addNotification('Copied to clipboard!', 'success');
        };

        return (
            <div className="flex items-center justify-between">
                <span><strong>{label}:</strong> {truncatedValue}</span>
                {copyable && (
                    <button
                        onClick={copyToClipboard}
                        className="ml-2 p-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors duration-200"
                        title="Copy to clipboard"
                    >
                        <FaCopy className="text-gray-600" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={`max-w-4xl mx-auto p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-lg transition-all duration-300`}>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
                {isNFT ? <FaPalette className="mr-3 text-purple-500" /> : <FaCoins className="mr-3 text-yellow-500" />}
                Create {isNFT ? 'NFT' : 'Token'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">Token Type</label>
                        <div className="flex">
                            <button
                                onClick={() => setIsNFT(false)}
                                className={`flex-1 py-2 px-4 rounded-l-lg ${!isNFT ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} transition-colors duration-200`}
                            >
                                Fungible Token
                            </button>
                            <button
                                onClick={() => setIsNFT(true)}
                                className={`flex-1 py-2 px-4 rounded-r-lg ${isNFT ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'} transition-colors duration-200`}
                            >
                                NFT
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Token Name</label>
                        <input
                            type="text"
                            value={tokenName}
                            onChange={(e) => setTokenName(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Token Symbol</label>
                        <input
                            type="text"
                            value={tokenSymbol}
                            onChange={(e) => setTokenSymbol(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {!isNFT && (
                        <>
                            <div>
                                <label className="block mb-1 font-medium">Initial Supply</label>
                                <input
                                    type="number"
                                    value={tokenSupply}
                                    onChange={(e) => setTokenSupply(e.target.value)}
                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">Token Standard</label>
                                <select
                                    value={tokenStandard}
                                    onChange={(e) => setTokenStandard(e.target.value)}
                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="original">Original Token</option>
                                    <option value="token2022">Token-2022</option>
                                </select>
                            </div>
                        </>
                    )}
                    {isNFT && (
                        <>
                            <div>
                                <label className="block mb-1 font-medium">NFT Program</label>
                                <select
                                    value={nftProgram}
                                    onChange={(e) => setNftProgram(e.target.value)}
                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="tokenMetadata">Token Metadata</option>
                                    <option value="core">Core</option>
                                    <option value="bubblegum">Bubblegum</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">NFT Image URI</label>
                                <input
                                    type="text"
                                    value={nftUri}
                                    onChange={(e) => setNftUri(e.target.value)}
                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </>
                    )}
                    <button
                        onClick={handleCreateToken}
                        className={`w-full ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300`}
                        disabled={!wallet.publicKey}
                    >
                        {wallet.publicKey ? `Create ${isNFT ? 'NFT' : 'Token'}` : 'Connect Wallet to Create'}
                    </button>
                </div>

                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-6 rounded-lg transition-all duration-300`}>
                    {createdTokenInfo ? (
                        <div className="space-y-4">
                            <div className="flex items-center text-green-500 mb-4">
                                <FaCheckCircle className="mr-2" />
                                <h3 className="text-xl font-semibold">
                                    {createdTokenInfo.isNFT ? 'NFT' : 'Token'} Created Successfully!
                                </h3>
                            </div>
                            <TruncatedField label="Mint Address" value={createdTokenInfo.mintAddress} />
                            <TruncatedField label="Name" value={createdTokenInfo.tokenName} copyable={false} />
                            <TruncatedField label="Symbol" value={createdTokenInfo.tokenSymbol} copyable={false} />
                            {!createdTokenInfo.isNFT && (
                                <TruncatedField label="Initial Supply" value={createdTokenInfo.tokenSupply} copyable={false} />
                            )}
                            {createdTokenInfo.isNFT && (
                                <TruncatedField label="Metadata URI" value={createdTokenInfo.metadataUri} />
                            )}
                            <TruncatedField label="Transaction ID" value={createdTokenInfo.txid} />
                            <a
                                href={`https://explorer.solana.com/tx/${createdTokenInfo.txid}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center ${darkMode ? 'text-blue-300 hover:text-blue-400' : 'text-blue-500 hover:text-blue-600'}`}
                            >
                                View on Solana Explorer
                                <FaExternalLinkAlt className="ml-2" />
                            </a>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p className="text-xl mb-2">No token created yet</p>
                            <p>Fill out the form and click "Create" to mint your token or NFT</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TokenCreation;