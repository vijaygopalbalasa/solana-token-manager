import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { WebBundlr } from '@bundlr-network/client';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { FaCheckCircle, FaExternalLinkAlt, FaCopy } from 'react-icons/fa';

// Utility function to safely stringify objects with BigInt values
const safeStringify = (obj) => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    );
};

// Utility function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (error.message.includes('429') && i < maxRetries - 1) {
                const waitTime = baseDelay * Math.pow(2, i);
                console.log(`Rate limited. Retrying in ${waitTime}ms...`);
                await delay(waitTime);
            } else {
                throw error;
            }
        }
    }
};

function NFTCollectionManagement({ setIsLoading }) {
    const wallet = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const { addNotification } = useNotification();
    const [collectionName, setCollectionName] = useState('');
    const [collectionSymbol, setCollectionSymbol] = useState('');
    const [collectionUri, setCollectionUri] = useState('');
    const [nftMint, setNftMint] = useState('');
    const [collectionMint, setCollectionMint] = useState('');
    const [createdCollectionInfo, setCreatedCollectionInfo] = useState(null);
    const [addedNftInfo, setAddedNftInfo] = useState(null);

    const handleCreateCollection = useCallback(async (e) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            addNotification('Please connect your wallet', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const metaplex = Metaplex.make(connection)
                .use(walletAdapterIdentity(wallet));

            // Initialize Bundlr
            const bundlr = new WebBundlr("https://node1.bundlr.network", "solana", wallet);
            await bundlr.ready();

            // Upload metadata to Bundlr
            const metadata = {
                name: collectionName,
                symbol: collectionSymbol,
                description: "Collection description",
                image: collectionUri
            };
            const metadataString = JSON.stringify(metadata);
            const metadataBuffer = Buffer.from(metadataString);

            const metadataTransaction = bundlr.createTransaction(metadataBuffer, {
                tags: [{ name: "Content-Type", value: "application/json" }]
            });
            await metadataTransaction.sign();
            const uploadResponse = await metadataTransaction.upload();
            console.log('Metadata uploaded:', safeStringify(uploadResponse));

            const metadataUri = `https://arweave.net/${uploadResponse.id}`;

            const { nft: collectionNft } = await retryOperation(() =>
                metaplex.nfts().create({
                    uri: metadataUri,
                    name: collectionName,
                    symbol: collectionSymbol,
                    sellerFeeBasisPoints: 0,
                    isCollection: true,
                })
            );

            setCreatedCollectionInfo({
                address: collectionNft.address.toBase58(),
                name: collectionName,
                symbol: collectionSymbol,
                metadataUri,
            });
            setCollectionMint(collectionNft.address.toBase58());
            addNotification(`Collection created successfully!`, 'success');
        } catch (error) {
            console.error('Error creating collection:', error);
            addNotification(`Failed to create collection: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [wallet, connection, collectionName, collectionSymbol, collectionUri, addNotification, setIsLoading]);

    const validateNFTMint = async (mintAddress, metaplex) => {
        try {
            const mintAccountInfo = await connection.getAccountInfo(new PublicKey(mintAddress));
            if (!mintAccountInfo) {
                throw new Error('NFT mint account not found');
            }
            const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) });
            return nft;
        } catch (error) {
            console.error('Error validating NFT mint:', error);
            throw new Error('Invalid NFT mint address');
        }
    };

    const handleAddToCollection = useCallback(async (e) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            addNotification('Please connect your wallet', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const metaplex = Metaplex.make(connection)
                .use(walletAdapterIdentity(wallet));

            // Validate mint addresses
            let nftMintPubkey, collectionMintPubkey;
            try {
                nftMintPubkey = new PublicKey(nftMint);
                collectionMintPubkey = new PublicKey(collectionMint);
            } catch (error) {
                console.error('Invalid public key:', error);
                addNotification('Invalid mint address format. Please check your input.', 'error');
                setIsLoading(false);
                return;
            }

            console.log('Validating NFT:', nftMintPubkey.toBase58());
            const nftToAdd = await retryOperation(() => validateNFTMint(nftMintPubkey, metaplex));
            console.log('NFT validated:', safeStringify(nftToAdd));

            console.log('Finding collection:', collectionMintPubkey.toBase58());
            const collection = await retryOperation(() =>
                metaplex.nfts().findByMint({ mintAddress: collectionMintPubkey })
            );
            console.log('Collection found:', safeStringify(collection));

            console.log('Updating NFT...');
            await retryOperation(() =>
                metaplex.nfts().update({
                    nftOrSft: nftToAdd,
                    collection: collection.address,
                })
            );

            setAddedNftInfo({
                nftMint: nftMintPubkey.toBase58(),
                collectionMint: collectionMintPubkey.toBase58(),
            });
            addNotification(`NFT added to collection successfully!`, 'success');
        } catch (error) {
            console.error('Error adding NFT to collection:', error);
            if (error.message.includes('429')) {
                addNotification(`Rate limit exceeded. Please try again later.`, 'error');
            } else if (error.message.includes('NFT mint account not found')) {
                addNotification(`The provided NFT mint address does not exist on the network.`, 'error');
            } else if (error.message.includes('not a token account')) {
                addNotification(`The provided address is not a valid NFT mint address.`, 'error');
            } else if (error.name === 'UnexpectedAccountError') {
                addNotification(`The provided NFT mint address is not a valid NFT.`, 'error');
            } else {
                addNotification(`Failed to add NFT to collection: ${error.message}`, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [wallet, connection, nftMint, collectionMint, addNotification, setIsLoading, validateNFTMint]);

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
        <div className="mb-6">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Manage NFT Collections</h2>
            <form onSubmit={handleCreateCollection} className="space-y-4 mb-6">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>Create Collection</h3>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Collection Name</label>
                    <input
                        type="text"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Collection Symbol</label>
                    <input
                        type="text"
                        value={collectionSymbol}
                        onChange={(e) => setCollectionSymbol(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Collection Image URI</label>
                    <input
                        type="text"
                        value={collectionUri}
                        onChange={(e) => setCollectionUri(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className={`w-full ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded transition-colors duration-200`}
                >
                    Create Collection
                </button>
            </form>

            {createdCollectionInfo && (
                <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                        <FaCheckCircle className="inline-block mr-2 text-green-500" />
                        Collection Created Successfully
                    </h4>
                    <TruncatedField label="Collection Address" value={createdCollectionInfo.address} />
                    <TruncatedField label="Name" value={createdCollectionInfo.name} copyable={false} />
                    <TruncatedField label="Symbol" value={createdCollectionInfo.symbol} copyable={false} />
                    <TruncatedField label="Metadata URI" value={createdCollectionInfo.metadataUri} />
                    <a
                        href={`https://explorer.solana.com/address/${createdCollectionInfo.address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center mt-2 ${darkMode ? 'text-blue-300 hover:text-blue-400' : 'text-blue-500 hover:text-blue-600'}`}
                    >
                        View on Solana Explorer
                        <FaExternalLinkAlt className="ml-2" />
                    </a>
                </div>
            )}

            <form onSubmit={handleAddToCollection} className="space-y-4">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>Add NFT to Collection</h3>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>NFT Mint Address</label>
                    <input
                        type="text"
                        value={nftMint}
                        onChange={(e) => setNftMint(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className={`block mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>Collection Mint Address</label>
                    <input
                        type="text"
                        value={collectionMint}
                        onChange={(e) => setCollectionMint(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className={`w-full ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded transition-colors duration-200`}
                >
                    Add to Collection
                </button>
            </form>

            {addedNftInfo && (
                <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                        <FaCheckCircle className="inline-block mr-2 text-green-500" />
                        NFT Added to Collection Successfully
                    </h4>
                    <TruncatedField label="NFT Mint" value={addedNftInfo.nftMint} />
                    <TruncatedField label="Collection Mint" value={addedNftInfo.collectionMint} />
                    <a
                        href={`https://explorer.solana.com/address/${addedNftInfo.nftMint}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center mt-2 ${darkMode ? 'text-blue-300 hover:text-blue-400' : 'text-blue-500 hover:text-blue-600'}`}
                    >
                        View NFT on Solana Explorer
                        <FaExternalLinkAlt className="ml-2" />
                    </a>
                </div>
            )}
        </div>
    );
}

export default NFTCollectionManagement;