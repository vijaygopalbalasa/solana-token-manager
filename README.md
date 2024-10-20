# Solana Token Manager

A comprehensive web application for creating and managing tokens on the Solana blockchain. This project allows users to interact with both fungible tokens and NFTs, supporting various token standards and Metaplex programs.

## Features

- Wallet connection using @solana/wallet-adapter-react
- Token creation (fungible tokens and NFTs)
- Support for both original Token and Token-2022 standards
- NFT minting with choice of Metaplex programs (Token Metadata, Core, Bubblegum)
- Token management actions: burn, transfer, delegate, revoke, close
- NFT collection management
- Responsive design for various devices

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- A Solana wallet (e.g., Phantom, Solflare)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/vijaygopalbalasa/solana-token-manager.git
   cd solana-token-manager
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your RPC URL:
   ```
   NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
   ```

4. Run the development server:
   ```
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. Connect your Solana wallet using the "Connect Wallet" button.
2. To create a new token:
   - Choose the token standard (Token or Token-2022)
   - Enter the token details (name, symbol, initial supply)
   - For NFTs, upload metadata and choose the Metaplex program
   - Click "Create Token"
3. Manage your tokens:
   - Select a token from the dropdown menu
   - Choose an action (burn, transfer, delegate, revoke, close)
   - Enter the required information for the chosen action
   - Click "Confirm Action"
4. For NFT collections:
   - Use the "Create Collection" form to create a new collection
   - Add NFTs to collections using the "Add NFT to Collection" form

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- Solana Foundation
- Metaplex Foundation
- All the amazing developers in the Solana ecosystem
