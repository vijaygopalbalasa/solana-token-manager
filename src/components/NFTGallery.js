import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Metaplex } from '@metaplex-foundation/js';
import { useTheme } from '../contexts/ThemeContext';
import LoadingIndicator from './LoadingIndicator';

function NFTGallery() {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const { darkMode } = useTheme();
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (publicKey) {
            fetchNFTs();
        }
    }, [publicKey, connection]);

    const fetchNFTs = async () => {
        setLoading(true);
        try {
            const metaplex = new Metaplex(connection);
            const myNfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
            setNfts(myNfts);
        } catch (error) {
            console.error('Error fetching NFTs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>My NFTs</h2>
            {loading ? (
                <LoadingIndicator />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {nfts.map((nft, index) => (
                        <div key={index} className={`p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <img src={nft.json.image} alt={nft.name} className="w-full h-48 object-cover rounded mb-2" />
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>{nft.name}</p>
                        </div>
                    ))}
                    {nfts.length === 0 && (
                        <p className={darkMode ? 'text-white' : 'text-black'}>No NFTs found.</p>
                    )}
                </div>
            )}
            <button
                onClick={fetchNFTs}
                className={`mt-4 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded transition-colors duration-200`}
            >
                Refresh NFTs
            </button>
        </div>
    );
}

export default NFTGallery;