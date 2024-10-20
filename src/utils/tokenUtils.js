// src/utils/tokenUtils.js
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

export async function burnTokens(connection, walletPublicKey, signTransaction, tokenAddress, amount) {
    const token = new Token(connection, tokenAddress, TOKEN_PROGRAM_ID, walletPublicKey);
    const tokenAccount = await token.getOrCreateAssociatedAccountInfo(walletPublicKey);

    const transaction = new Transaction().add(
        Token.createBurnInstruction(
            TOKEN_PROGRAM_ID,
            tokenAddress,
            tokenAccount.address,
            walletPublicKey,
            [],
            amount
        )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, walletPublicKey, signTransaction);
    return signature;
}

export async function transferTokens(connection, walletPublicKey, signTransaction, tokenAddress, recipientAddress, amount) {
    const token = new Token(connection, tokenAddress, TOKEN_PROGRAM_ID, walletPublicKey);
    const fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(walletPublicKey);
    const toTokenAccount = await token.getOrCreateAssociatedAccountInfo(recipientAddress);

    const transaction = new Transaction().add(
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            fromTokenAccount.address,
            toTokenAccount.address,
            walletPublicKey,
            [],
            amount
        )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, walletPublicKey, signTransaction);
    return signature;
}

export async function delegateTokens(connection, walletPublicKey, signTransaction, tokenAddress, delegateAddress, amount) {
    const token = new Token(connection, tokenAddress, TOKEN_PROGRAM_ID, walletPublicKey);
    const tokenAccount = await token.getOrCreateAssociatedAccountInfo(walletPublicKey);

    const transaction = new Transaction().add(
        Token.createApproveInstruction(
            TOKEN_PROGRAM_ID,
            tokenAccount.address,
            delegateAddress,
            walletPublicKey,
            [],
            amount
        )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, walletPublicKey, signTransaction);
    return signature;
}

export async function closeAccount(connection, walletPublicKey, signTransaction, tokenAddress) {
    const token = new Token(connection, tokenAddress, TOKEN_PROGRAM_ID, walletPublicKey);
    const tokenAccount = await token.getOrCreateAssociatedAccountInfo(walletPublicKey);

    const transaction = new Transaction().add(
        Token.createCloseAccountInstruction(
            TOKEN_PROGRAM_ID,
            tokenAccount.address,
            walletPublicKey,
            walletPublicKey,
            []
        )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, walletPublicKey, signTransaction);
    return signature;
}

async function sendAndConfirmTransaction(connection, transaction, walletPublicKey, signTransaction) {
    transaction.feePayer = walletPublicKey;
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);
    return signature;
}