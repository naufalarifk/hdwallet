import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { HDKey } from '@scure/bip32';
import {
  generateMnemonic as _generateMnemonic,
  mnemonicToSeed,
  mnemonicToSeedSync,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import * as btc from '@scure/btc-signer';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import axios from 'axios';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { eq } from 'drizzle-orm';
import * as ecPair from 'ecpair';
import { ECPairAPI, ECPairFactory, TinySecp256k1Interface } from 'ecpair';
import { ethers } from 'ethers';
import * as ecc from 'tiny-secp256k1';
import * as tinysecp from 'tiny-secp256k1';
import * as accs from 'viem/accounts';

import { DrizzleService } from '../database/drizzle.service';
import { accounts, addresses, wallets } from '../database/schema';
import { EncryptionService } from '../encryption/encription.service';
import { AccountResult, WalletCreateResult } from '../types/database';
import { AddressResponseDto, SignatureResponseDto, WalletResponseDto } from './hdwalletdto';

//to-do:
type AllowedKeyEntropyBits = 128 | 256;

type GenerateWalletResult = {
  addresses: {
    btc: string;
    eth: `0x${string}`;
    solana: string;
  };
  index: number;
  publicKeys: {
    btc: string;
    eth: string;
    solana: string;
  };
  privateKeys: {
    btc: string;
    eth: string;
    solana: string;
  };
  derivationPaths: {
    btc: string;
    eth: string;
    solana: string;
  };
};

interface WalletConfig {
  network: 'mainnet' | 'testnet';
  rpcEndpoints: {
    bitcoin: string;
    ethereum: string;
    solana: string;
  };
}

interface TransactionParams {
  to: string;
  amount: number; // in base units (satoshis, wei, lamports)
  from?: string;
}

class MultiChainWallet {
  private config: WalletConfig;
  private connections: {
    solana?: Connection;
    ethereum?: ethers.JsonRpcProvider;
  } = {};

  constructor(config: WalletConfig) {
    this.config = config;
    this.initializeConnections();
  }

  private initializeConnections() {
    this.connections.solana = new Connection(this.config.rpcEndpoints.solana, 'confirmed');

    this.connections.ethereum = new ethers.JsonRpcProvider(this.config.rpcEndpoints.ethereum);

    console.log('this.connection.ethereum', this.connections.ethereum);
  }

  async getSolanaBalance(address: string): Promise<number> {
    if (!this.connections.solana) throw new Error('Solana connection not initialized');

    const publicKey = new PublicKey(address);
    const balance = await this.connections.solana.getBalance(publicKey);
    return balance;
  }

  async sendSolanaTransaction(privateKeyHex: string, params: TransactionParams): Promise<string> {
    if (!this.connections.solana) throw new Error('Solana connection not initialized');

    const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(params.to),
        lamports: params.amount,
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connections.solana, transaction, [
      keypair,
    ]);

    return signature;
  }

  async getEthereumBalance(address: string): Promise<string> {
    if (!this.connections.ethereum) throw new Error('Ethereum connection not initialized');

    const balance = await this.connections.ethereum.getBalance(address);
    return ethers.formatEther(balance);
  }

  async sendEthereumTransaction(privateKeyHex: string, params: TransactionParams): Promise<string> {
    if (!this.connections.ethereum) throw new Error('Ethereum connection not initialized');

    const wallet = new ethers.Wallet(`0x${privateKeyHex}`, this.connections.ethereum);

    const [gasPrice, nonce] = await Promise.all([
      this.connections.ethereum.getFeeData(),
      this.connections.ethereum.getTransactionCount(wallet.address),
    ]);

    const transaction = {
      to: params.to,
      value: params.amount.toString(),
      gasLimit: 21000,
      gasPrice: gasPrice.gasPrice,
      nonce: nonce,
    };

    const txResponse = await wallet.sendTransaction(transaction);
    await txResponse.wait();

    return txResponse.hash;
  }

  async getBitcoinBalance(address: string) {
    // const postData = {
    // 		method: 'gettxout', // The RPC method for getting address data
    // 		params: [address], // The parameters for the method, in this case, the Bitcoin address
    // 		id: 1,
    // 		jsonrpc: '2.0',
    // }

    try {
      const { data } = await axios.get(this.config.rpcEndpoints.bitcoin + `/address/${address}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxBodyLength: Infinity,
      });
      return data;
    } catch (error) {
      console.error(error);
    }
  }

  async getBalances(walletResult: GenerateWalletResult): Promise<{
    btc: number;
    eth: string;
    solana: number;
  }> {
    const [btcBalance, ethBalance, solanaBalance] = await Promise.all([
      this.getBitcoinBalance(walletResult.addresses.btc),
      this.getEthereumBalance(walletResult.addresses.eth),
      this.getSolanaBalance(walletResult.addresses.solana),
    ]);

    return {
      btc: btcBalance,
      eth: ethBalance,
      solana: solanaBalance,
    };
  }
}

@Injectable()
export class HdWalletService {
  public wallet: MultiChainWallet;
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly encryption: EncryptionService,
  ) {
    const network: 'mainnet' | 'testnet' = 'testnet';
    const config = this.getNetworkConfig(network);
    this.wallet = new MultiChainWallet(config);
  }

  private getNetworkConfig(network: 'mainnet' | 'testnet'): WalletConfig {
    return {
      network,
      rpcEndpoints: {
        bitcoin: 'https://blockstream.info/testnet/api',
        ethereum: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
        solana: 'https://api.testnet.solana.com',
      },
    };
  }

  validateMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic, wordlist);
  }

  createHDWallet(mnemonic: string) {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);

    return hdkey;
  }

  generateAddressFromSecure(entropy: AllowedKeyEntropyBits = 256): string {
    if (entropy !== 128 && entropy !== 256) {
      throw new Error(
        `Invalid entropy. Allowed values are 128 or 256 bits. got: ${String(entropy)}`,
      );
    }

    return _generateMnemonic(wordlist, entropy);
  }

  async demonstrateUsage() {
    try {
      const wallets = await this.generateWalletElaborate();
      const balances = await this.wallet.getBalances(wallets[0]);
      console.log('Balances:', balances);
      console.log('wallets', wallets);
      return wallets[0];
    } catch (error) {
      console.error('Error generating wallets:', error);
      throw error;
    }
  }

  async generateWalletElaborate(): Promise<GenerateWalletResult[]> {
    const count = 5;
    const addresses: GenerateWalletResult[] = [];
    const mnemonic = this.generateAddressFromSecure();
    const validatedMnemonic = validateMnemonic(mnemonic, wordlist);

    if (!validatedMnemonic) {
      throw new Error('Invalid mnemonic');
    }

    const seed = await mnemonicToSeed(mnemonic);
    const hdkey = HDKey.fromMasterSeed(seed);

    for (let i = 0; i < count; i++) {
      // Bitcoin derivation
      const btcDerivationPath = `m/44'/0'/0'/0/${i}`;
      const btcChildKey = hdkey.derive(btcDerivationPath);

      if (!btcChildKey.privateKey) {
        throw new Error('Failed to derive Bitcoin private key');
      }

      const { address: btcAddress } = btc.p2pkh(
        btcChildKey.publicKey ?? Buffer.alloc(0),
        btc.TEST_NETWORK,
      );

      // Ethereum derivation
      const ethDerivationPath = `m/44'/60'/0'/0/${i}`;
      const ethChildKey = hdkey.derive(ethDerivationPath);

      if (!ethChildKey.privateKey) {
        throw new Error('Failed to derive Ethereum private key');
      }

      const ethAddress = accs.privateKeyToAddress(
        `0x${Buffer.from(ethChildKey.privateKey).toString('hex')}`,
      );

      // Solana derivation
      const solanaDerivationPath = `m/44'/501'/0'/0/${i}`;
      const solanaChildKey = hdkey.derive(solanaDerivationPath);

      if (!solanaChildKey.privateKey) {
        throw new Error('Failed to derive Solana private key');
      }

      const solanaSeed = solanaChildKey.privateKey.slice(0, 32);
      const solanaKeypair = Keypair.fromSeed(solanaSeed);
      const solanaAddress = solanaKeypair.publicKey.toBase58();

      addresses.push({
        addresses: {
          btc: btcAddress,
          eth: ethAddress,
          solana: solanaAddress,
        },
        index: i,
        publicKeys: {
          btc: Buffer.from(btcChildKey.publicKey ?? Buffer.alloc(0)).toString('hex'),
          eth: Buffer.from(ethChildKey.publicKey ?? Buffer.alloc(0)).toString('hex'),
          solana: solanaKeypair.publicKey.toBase58(),
        },
        privateKeys: {
          btc: Buffer.from(btcChildKey.privateKey).toString('hex'),
          eth: Buffer.from(ethChildKey.privateKey).toString('hex'),
          solana: Buffer.from(solanaKeypair.secretKey).toString('hex'),
        },
        derivationPaths: {
          btc: btcDerivationPath,
          eth: ethDerivationPath,
          solana: solanaDerivationPath,
        },
      });
    }

    return addresses;
  }

  // Multi-chain transaction methods
  // async sendMultiChainTransaction(
  //   walletResult: GenerateWalletResult,
  //   chain: 'btc' | 'eth' | 'solana',
  //   params: TransactionParams
  // ): Promise<string> {
  //   switch (chain) {
  //     case 'solana':
  //       return this.wallet.sendSolanaTransaction(
  //         walletResult.privateKeys.solana,
  //         params
  //       );

  //     case 'eth':
  //       return this.wallet.sendEthereumTransaction(
  //         walletResult.privateKeys.eth,
  //         params
  //       );

  //     case 'btc':
  //       // Bitcoin requires more complex UTXO handling
  //       throw new Error('Bitcoin transactions require UTXO management - use signTransaction method');

  //     default:
  //       throw new Error(`Unsupported chain: ${chain}`);
  //   }
  // }

  // Get balances for all chains
  // async getMultiChainBalances(walletResult: GenerateWalletResult) {
  //   return this.wallet.getBalances(walletResult);
  // }

  // Existing methods with fixes...
  async generateWalletSimple() {
    const mnemonic = this.generateAddressFromSecure();
    const masterSeed = await mnemonicToSeed(mnemonic);
    const network_version = {
      mainnet: {
        private: 0x04b2430c,
        public: 0x04b24746,
      },
      testnet: {
        private: 0x045f18bc,
        public: 0x045f1cf6,
      },
    };

    const hdkey = HDKey.fromMasterSeed(masterSeed, network_version.testnet); // Fixed: use testnet

    const receive_path = "m/84'/0'/0'/0/0";
    const receive_node = hdkey.derive(receive_path);
    const receive_address = btc.getAddress('wpkh', receive_node.privateKey!);

    const next_receive_node = receive_node.deriveChild(1);

    const change_path = "m/84'/0'/0'/1/0";
    const change_node = hdkey.derive(change_path);
    const change_address = btc.getAddress('wpkh', change_node.privateKey!);

    const next_change_node = change_node.deriveChild(1);

    return {
      receive_address,
      change_address,
      next_receive_node,
      next_change_node,
    };
  }

  generateAddressTypes(mnemonic: string, index: number = 0) {
    const hdkey = this.createHDWallet(mnemonic);
    const childKey = hdkey.derive(`m/44'/0'/0'/0/${index}`);

    if (!childKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const p2pkh = btc.p2pkh(childKey.publicKey ?? Buffer.alloc(0));
    const p2sh = btc.p2sh(btc.p2wpkh(childKey.publicKey ?? Buffer.alloc(0)));
    const p2wpkh = btc.p2wpkh(childKey.publicKey ?? Buffer.alloc(0));

    return {
      derivationPath: `m/44'/0'/0'/0/${index}`,
      legacy: {
        type: 'P2PKH',
        address: p2pkh.address,
      },
      segwit_wrapped: {
        type: 'P2SH-P2WPKH',
        address: p2sh.address,
      },
      native_segwit: {
        type: 'P2WPKH',
        address: p2wpkh.address,
      },
    };
  }

  getAccountXPub(mnemonic: string, account: number = 0): string {
    const hdkey = this.createHDWallet(mnemonic);
    const accountKey = hdkey.derive(`m/44'/0'/${account}'`);
    return accountKey.publicExtendedKey;
  }

  async createWallet(
    name: string,
    passphrase?: string,
    isChange?: boolean,
  ): Promise<WalletCreateResult> {
    console.log('Creating wallet:', name);
    const mnemonic = bip39.generateMnemonic();
    const bip32 = BIP32Factory(ecc);

    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    const masterKey = bip32.fromSeed(seed);

    const encryptedMnemonic = this.encryption.encrypt(mnemonic);
    const encryptedSeed = this.encryption.encrypt(seed.toString('hex'));
    const encryptedMasterPrivateKey = this.encryption.encrypt(masterKey.toBase58());

    const [wallet] = await this.drizzle.db
      .insert(wallets)
      .values({
        name,
        mnemonic: encryptedMnemonic,
        seed: encryptedSeed,
        masterPrivateKey: encryptedMasterPrivateKey,
        masterPublicKey: masterKey.neutered().toBase58(),
      })
      .returning();

    const changeIndex = isChange ? 1 : 0;
    const derivationPath = `m/44'/0'/${wallet.id}'/${changeIndex}/0`;
    const addressKey = masterKey.derivePath(derivationPath);

    const { address } = bitcoin.payments.p2pkh({
      pubkey: addressKey.publicKey as Buffer,
      network: bitcoin.networks.bitcoin,
    });

    console.log('derivationPath', derivationPath);
    console.log('Generated address for wallet:', address);

    return {
      walletId: wallet.id,
      mnemonic,
      masterPublicKey: masterKey.neutered().toBase58(),
      derivationPath,
      address: address || '',
    };
  }

  async createAccount(
    walletId: number,
    accountIndex: number,
    name?: string,
  ): Promise<AccountResult> {
    const bip32 = BIP32Factory(ecc);

    const [wallet] = await this.drizzle.db.select().from(wallets).where(eq(wallets.id, walletId));

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const masterPrivateKeyBase58 = this.encryption.decrypt(wallet.masterPrivateKey);
    const masterKey = bip32.fromBase58(masterPrivateKeyBase58); // Fixed: use fromBase58

    const accountPath = `m/44'/0'/${accountIndex}'`;
    const accountKey = masterKey.derivePath(accountPath);

    const encryptedAccountPrivateKey = this.encryption.encrypt(accountKey.toBase58());

    const [account] = await this.drizzle.db
      .insert(accounts)
      .values({
        walletId,
        accountIndex,
        name: name || `Account ${accountIndex}`,
        extendedPublicKey: accountKey.neutered().toBase58(),
        extendedPrivateKey: encryptedAccountPrivateKey,
      })
      .returning();

    return account;
  }

  async generateAddress(
    accountId: number,
    isChange: boolean = false,
    addressIndex?: number,
  ): Promise<AddressResponseDto> {
    const bip32 = BIP32Factory(ecc);

    const [account] = await this.drizzle.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));

    if (!account) {
      throw new Error('Account not found');
    }

    if (addressIndex === undefined) {
      const lastAddresses = await this.drizzle.db
        .select()
        .from(addresses)
        .where(eq(addresses.accountId, accountId))
        .orderBy(addresses.addressIndex);

      addressIndex =
        lastAddresses.length > 0
          ? Math.max(...lastAddresses.map(addr => addr.addressIndex)) + 1
          : 0;
    }

    const accountPrivateKeyBase58 = this.encryption.decrypt(account.extendedPrivateKey);
    const accountKey = bip32.fromBase58(accountPrivateKeyBase58);

    const changeIndex = isChange ? 1 : 0;
    const derivationPath = `m/44'/0'/${account.accountIndex}'/${changeIndex}/${addressIndex}`;
    const addressKey = accountKey.derive(changeIndex).derive(addressIndex);

    const { address } = bitcoin.payments.p2pkh({
      pubkey: addressKey.publicKey as Buffer,
      network: bitcoin.networks.bitcoin,
    });

    if (!address) {
      throw new Error('Failed to generate address');
    }

    const encryptedPrivateKey = this.encryption.encrypt(addressKey.toWIF());

    const [savedAddress] = await this.drizzle.db
      .insert(addresses)
      .values({
        accountId,
        derivationPath,
        address,
        publicKey: addressKey.publicKey?.toString() || '',
        privateKey: encryptedPrivateKey,
        isChange,
        addressIndex,
        createdAt: new Date(),
      })
      .returning();

    return {
      id: savedAddress.id,
      address: savedAddress.address,
      publicKey: savedAddress.publicKey,
      derivationPath: savedAddress.derivationPath,
      isChange: savedAddress.isChange || false,
      addressIndex: savedAddress.addressIndex,
      accountId: savedAddress.accountId || accountId,
      createdAt: savedAddress.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  getWalletBalance(walletId: number): {
    walletId: number;
    confirmedBalance: number;
    unconfirmedBalance: number;
    totalBalance: number;
    totalBalanceBtc: number;
    addressCount: number;
    lastUpdated: string;
  } {
    const confirmedBalance = 0;
    const unconfirmedBalance = 0;
    const totalBalance = confirmedBalance + unconfirmedBalance;
    const totalBalanceBtc = totalBalance / 100000000;
    const addressCount = 0;

    return {
      walletId,
      confirmedBalance,
      unconfirmedBalance,
      totalBalance,
      totalBalanceBtc,
      addressCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  async signTransaction(addressId: number, transactionData: object): Promise<SignatureResponseDto> {
    const ECPair: ecPair.ECPairAPI = ecPair.ECPairFactory(ecc);

    const [address] = await this.drizzle.db
      .select()
      .from(addresses)
      .where(eq(addresses.id, addressId));

    if (!address) {
      throw new Error('Address not found');
    }

    const privateKeyWIF = this.encryption.decrypt(address.privateKey);
    const keyPair = ECPair.fromWIF(privateKeyWIF);

    const psbt = new bitcoin.Psbt();

    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();

    const signedTx = psbt.extractTransaction();
    const signedTransaction = signedTx.toHex();
    const transactionHash = signedTx.getId();

    return {
      addressId,
      signedTransaction,
      transactionHash,
      transactionSize: signedTransaction.length / 2,
      signedAt: new Date().toISOString(),
    };
  }

  async restoreWallet(
    mnemonic: string,
    name: string,
    passphrase?: string,
  ): Promise<WalletResponseDto> {
    const bip32 = BIP32Factory(ecc);

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    const masterKey = bip32.fromSeed(seed);

    const encryptedMnemonic = this.encryption.encrypt(mnemonic);
    const encryptedSeed = this.encryption.encrypt(seed.toString('hex'));
    const encryptedMasterPrivateKey = this.encryption.encrypt(masterKey.toBase58());

    const [wallet] = await this.drizzle.db
      .insert(wallets)
      .values({
        name,
        mnemonic: encryptedMnemonic,
        seed: encryptedSeed,
        masterPrivateKey: encryptedMasterPrivateKey,
        masterPublicKey: masterKey.neutered().toBase58(),
      })
      .returning();

    return {
      id: wallet.id,
      name: wallet.name,
      masterPublicKey: wallet.masterPublicKey,
      derivationPath: "m/44'/0'/0'",
      network: 'mainnet',
      createdAt: wallet.createdAt?.toISOString() || new Date().toISOString(),
      isEncrypted: true,
    };
  }
}
