import React, { useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NFTCollectionManagement from './components/NFTCollectionManagement';
import TokenManager from './components/TokenManager';
import WalletConnection from './components/WalletConnection';
import LoadingOverlay from './components/LoadingOverlay';
import { FaPalette, FaQuestionCircle, FaWallet } from 'react-icons/fa';

require('@solana/wallet-adapter-react-ui/styles.css');

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ThemeProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 p-2 sm:p-4 md:p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
                  <header className="bg-gray-800 text-white p-4 sm:p-6">
                    <h1 className="text-2xl sm:text-3xl font-bold">Solana Token Manager</h1>
                    <p className="mt-2 text-sm sm:text-base text-gray-300">Create, manage, and explore Solana tokens and NFTs with ease</p>
                  </header>

                  <main className="p-4 sm:p-6">
                    <WalletConnection />

                    <section className="mt-8 sm:mt-12">
                      <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4 flex items-center">
                        <FaWallet className="mr-2 text-blue-500" />
                        Token Creation & Token Management
                      </h2>
                      <p className="mb-4 text-sm sm:text-base text-gray-600">
                        Create your own fungible tokens or NFTs on the Solana blockchain. Choose between different token standards and customize your token properties.
                        Manage your existing tokens. View balances, transfer, burn, or perform other actions on your Solana tokens.
                      </p>
                      <TokenManager />
                    </section>

                    <section className="mt-8 sm:mt-12">
                      <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4 flex items-center">
                        <FaPalette className="mr-2 text-green-500" />
                        NFT Collection Management
                      </h2>
                      <p className="mb-4 text-sm sm:text-base text-gray-600">
                        Create and manage NFT collections. Group your NFTs together and set collection-wide properties.
                      </p>
                      <NFTCollectionManagement setIsLoading={setIsLoading} />
                    </section>

                    <section className="mt-8 sm:mt-12 bg-blue-50 p-4 sm:p-6 rounded-lg">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 flex items-center">
                        <FaQuestionCircle className="mr-2 text-blue-500" />
                        How to Use
                      </h2>
                      <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-gray-700">
                        <li>Connect your Solana wallet using the button at the top of the page.</li>
                        <li>Choose whether you want to create a fungible token or an NFT.</li>
                        <li>Fill in the required details for your token or NFT.</li>
                        <li>Click the "Create" button to mint your token on the Solana blockchain.</li>
                        <li>Use the Token Management section to view and manage your existing tokens.</li>
                        <li>For NFTs, you can also create and manage collections using the NFT Collection Management section.</li>
                      </ol>
                    </section>
                  </main>

                  <footer className="bg-gray-800 text-white p-4 text-center text-sm sm:text-base">
                    <p>&copy; 2024 Solana Token Manager. All rights reserved. </p>
                    <p>Made in 🩷 With Vijaygopal Balasa</p>
                  </footer>
                </div>
                <LoadingOverlay isLoading={isLoading} />
              </div>
            </NotificationProvider>
          </ThemeProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}