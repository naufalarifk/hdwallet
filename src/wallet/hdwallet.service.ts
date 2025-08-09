import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { EncryptionService } from '../encryption/encription.service';
import {BIP32Factory, BIP32Interface} from 'bip32';
import * as ecPair from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { wallets, accounts, addresses } from '../database/schema';
import { eq } from 'drizzle-orm';
import { WalletCreateResult, AccountResult } from '../types/database';

@Injectable()
export class HdWalletService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly encryption: EncryptionService,
  ) {}

  async createWallet(name: string, passphrase?: string): Promise<WalletCreateResult> {
    const mnemonic = bip39.generateMnemonic();
    const bip32 = BIP32Factory(ecc)
    const node: BIP32Interface = bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi');
    const child: BIP32Interface = node.derivePath('m/0/0');
    
    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    
    const masterKey = bip32.fromSeed(seed);
    
    // Encrypt sensitive data
    const encryptedMnemonic = this.encryption.encrypt(mnemonic);
    const encryptedSeed = this.encryption.encrypt(seed.toString('hex'));
    const encryptedMasterPrivateKey = this.encryption.encrypt(masterKey.toBase58());
    
    // Save wallet to database
    const [wallet] = await this.drizzle.db.insert(wallets).values({
      name,
      mnemonic: encryptedMnemonic,
      seed: encryptedSeed,
      masterPrivateKey: encryptedMasterPrivateKey,

      masterPublicKey: masterKey.neutered().toBase58(),
    }).returning();

    return {
      walletId: wallet.id,
      mnemonic, // Return unencrypted for user to backup
      masterPublicKey: masterKey.neutered().toBase58(),
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

  getWalletBalance(walletId: number): number {

    const balance = 0
    // Implementation would involve querying blockchain for UTXO
    // This is a placeholder
    return balance;
  }

  async signTransaction(addressId: number, transactionData: any): Promise<string> {


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
    
    return psbt.extractTransaction().toHex();
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