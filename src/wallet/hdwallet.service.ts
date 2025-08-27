import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { EncryptionService } from '../encryption/encription.service';
import {BIP32Factory} from 'bip32';
import * as ecPair from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { wallets, accounts, addresses } from '../database/schema';
import { eq } from 'drizzle-orm';
import { WalletCreateResult, AccountResult } from '../types/database';


import { generateMnemonic as _generateMnemonic, mnemonicToSeed } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';

type AllowedKeyEntropyBits = 128 | 256;

@Injectable()
export class HdWalletService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly encryption: EncryptionService,
  ) { }
  



   generateAddressFromSecure(entropy: AllowedKeyEntropyBits = 256): string {
    if (entropy !== 128 && entropy !== 256) {
      throw new Error(`Invalid entropy. Allowed values are 128 or 256 bits. got: ${String(entropy)}`);
    }


    return _generateMnemonic(wordlist, entropy);
  }

  async createWallet(name: string, passphrase?: string, isChange?: boolean): Promise<WalletCreateResult> {
    console.log('Creating wallet:', name);
    const mnemonic = bip39.generateMnemonic();
    const bip32 = BIP32Factory(ecc)
    // const node: BIP32Interface = bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi');
    // const child: BIP32Interface = node.derivePath('m/0/0');
    
    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    
    const masterKey = bip32.fromSeed(seed);
  
    // Encrypt sensitive data
    // const encryptedMnemonic = this.encryption.encrypt(mnemonic);
    // const encryptedSeed = this.encryption.encrypt(seed.toString('hex'));
    // const encryptedMasterPrivateKey = this.encryption.encrypt(masterKey.toBase58());
    
    // Save wallet to database
    // const [wallet] = await this.drizzle.db.insert(wallets).values({
    //   name,
    //   mnemonic: encryptedMnemonic,
    //   seed: encryptedSeed,
    //   masterPrivateKey: encryptedMasterPrivateKey,

    //   masterPublicKey: masterKey.neutered().toBase58(),
    // }).returning();



    const changeIndex = isChange ? 1 : 0;
    const derivationPath = `m/44'/0'/${wallet.id}'/${changeIndex}/`;
    const addressKey = masterKey.derive(changeIndex).derive(1);

  const { address } = bitcoin.payments.p2pkh({ 
      pubkey: addressKey.publicKey as Buffer<ArrayBufferLike>,
      network: bitcoin.networks.bitcoin ,
  });
    
    
    console.log('derivationPath', derivationPath)
    console.log('addressKey', addressKey)
    
    console.log('Generated address for wallet:', address);
    
    return {
      walletId: wallet.id,
      mnemonic,
      masterPublicKey: masterKey.neutered().toBase58(),
      // derivationPath,
      // address: undefined,
    };
  }

  async createAccount(walletId: number, accountIndex: number, name?: string): Promise<AccountResult> {
    const bip32 = BIP32Factory(ecc)
    

    const [wallet] = await this.drizzle.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId));

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Decrypt master private key
    const masterPrivateKeyBase58 = this.encryption.decrypt(wallet.masterPrivateKey);
    const masterKey = bip32.fromPrivateKey(Buffer.from(masterPrivateKeyBase58, 'hex'), Buffer.alloc(32));

    // Derive account key (BIP44: m/44'/0'/account')
    const accountPath = `m/44'/0'/${accountIndex}'`;
    const accountKey = masterKey.derivePath(accountPath);

    // Encrypt account private key
    const encryptedAccountPrivateKey = this.encryption.encrypt(accountKey.toBase58());

    // Save account to database
    const [account] = await this.drizzle.db.insert(accounts).values({
      walletId,
      accountIndex,
      name: name || `Account ${accountIndex}`,
      extendedPublicKey: accountKey.neutered().toBase58(),
      extendedPrivateKey: encryptedAccountPrivateKey,
    }).returning();

    return account;
  }

  async generateAddress(
    accountId: number, 
    isChange: boolean = false, 
    addressIndex?: number
  ): Promise<any> {
    const bip32 = BIP32Factory(ecc)
    
    // Get account
    const [account] = await this.drizzle.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));

    if (!account) {
      throw new Error('Account not found');
    }

    // If no address index provided, get the next available index
    if (addressIndex === undefined) {
      const lastAddress = await this.drizzle.db
        .select()
        .from(addresses)
        .where(eq(addresses.accountId, accountId))
        .orderBy(addresses.addressIndex)
        .limit(1);

      addressIndex = lastAddress.length > 0 ? lastAddress[0].addressIndex + 1 : 0;
    }

    // Decrypt account private key
    const accountPrivateKeyBase58 = this.encryption.decrypt(account.extendedPrivateKey);
    const accountKey = bip32.fromBase58(accountPrivateKeyBase58);

    // Derive address key (BIP44: m/44'/0'/account'/change/address_index)
    const changeIndex = isChange ? 1 : 0;
    const derivationPath = `m/44'/0'/${account.accountIndex}'/${changeIndex}/${addressIndex}`;
    const addressKey = accountKey.derive(changeIndex).derive(addressIndex);

    // Generate Bitcoin address (P2PKH)
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: addressKey.publicKey as Buffer<ArrayBufferLike>,
      network: bitcoin.networks.bitcoin ,
    });

    if (!address) {
      throw new Error('Failed to generate address');
    }

    // Encrypt private key
    const encryptedPrivateKey = this.encryption.encrypt(addressKey.toWIF());

    // Save address to database
    const [savedAddress] = await this.drizzle.db.insert(addresses).values({
      accountId,
      derivationPath,
      address,
      publicKey: addressKey.publicKey.toString(),
      privateKey: encryptedPrivateKey,
      isChange,
      addressIndex,
      createdAt: new Date(),
    }).returning();

    return savedAddress;
  }

  getWalletBalance(walletId: number): { walletId: number; confirmedBalance: number; unconfirmedBalance: number; totalBalance: number; totalBalanceBtc: number; addressCount: number; lastUpdated: string } {
    // Implementation would involve querying blockchain for UTXO
    // This is a placeholder
    const confirmedBalance = 0;
    const unconfirmedBalance = 0;
    const totalBalance = confirmedBalance + unconfirmedBalance;
    const totalBalanceBtc = totalBalance / 100000000; // Convert satoshis to BTC
    const addressCount = 0; // Count of addresses with balance
    
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

  async signTransaction(addressId: number, transactionData: any): Promise<{ addressId: number; signedTransaction: string; transactionHash: string; transactionSize: number; signedAt: string }> {
    const ECPair: ecPair.ECPairAPI = ecPair.ECPairFactory(ecc);
    // Get address with private key
    const [address] = await this.drizzle.db
      .select()
      .from(addresses)
      .where(eq(addresses.id, addressId));

    if (!address) {
      throw new Error('Address not found');
    }

    // Decrypt private key
    const privateKeyWIF = this.encryption.decrypt(address.privateKey);
    const keyPair = ECPair.fromWIF(privateKeyWIF);

    // Sign transaction (implementation depends on transaction structure)
    // This is a simplified example
    const psbt = new bitcoin.Psbt();
    // Add inputs and outputs based on transactionData
    
    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();
    
    const signedTx = psbt.extractTransaction();
    const signedTransaction = signedTx.toHex();
    const transactionHash = signedTx.getId();
    
    return {
      addressId,
      signedTransaction,
      transactionHash,
      transactionSize: signedTransaction.length / 2, // hex string length / 2 = bytes
      signedAt: new Date().toISOString(),
    };
  }

  async restoreWallet(mnemonic: string, name: string, passphrase?: string): Promise<any> {
    const bip32 = BIP32Factory(ecc)
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    
    // Create master key pair
    const masterKey = bip32.fromSeed(seed);
    
    // Encrypt sensitive data
    const encryptedMnemonic = this.encryption.encrypt(mnemonic);
    const encryptedSeed = this.encryption.encrypt(seed.toString('hex'));
    const encryptedMasterPrivateKey = this.encryption.encrypt(masterKey.toBase58());
    
    // Save restored wallet to database
    const [wallet] = await this.drizzle.db.insert(wallets).values({
      name,
      mnemonic: encryptedMnemonic,
      seed: encryptedSeed,
      masterPrivateKey: encryptedMasterPrivateKey,
      masterPublicKey: masterKey.neutered().toBase58(),
    }).returning();

    return wallet;
  }
}