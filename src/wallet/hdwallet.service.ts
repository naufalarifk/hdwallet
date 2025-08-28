import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { EncryptionService } from '../encryption/encription.service';
import {  DiscoveryService } from '@nestjs/core';
import { BIP32Factory } from 'bip32';
import * as accs from 'viem/accounts'
import * as ecPair from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { ed25519} from '@noble/curves/ed25519.js';
import { Keypair } from '@solana/web3.js';
import { wallets, accounts, addresses } from '../database/schema';
import { eq } from 'drizzle-orm';
import { WalletCreateResult, AccountResult } from '../types/database';


import { generateMnemonic as _generateMnemonic, mnemonicToSeed, validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import * as btc from '@scure/btc-signer';

type AllowedKeyEntropyBits = 128 | 256;

    type GenerateWalletResult = {
      addresses: {
        btc: string;
        eth: `0x${string}`;
        solana: string;
      }
      index: number;
      publicKey: string;
      privateKey: string;
      derivationPath: string;
    }

@Injectable()
export class HdWalletService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly encryption: EncryptionService,
    private readonly discoveryService: DiscoveryService
  ) {
    const providers = this.discoveryService.getProviders();
    console.log({ providers })
    const controllers = this.discoveryService.getControllers();
    console.log({
      controllers
    })
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
      throw new Error(`Invalid entropy. Allowed values are 128 or 256 bits. got: ${String(entropy)}`);
    }


    return _generateMnemonic(wordlist, entropy);
  }

async generateWalletSimple() {
  const mnemonic = this.generateAddressFromSecure();
  const masterSeed = await mnemonicToSeed(mnemonic);
  const network_version = {
    mainnet: {
      // zprv
      private: 0x04b2430c,
      // zpub
      public: 0x04b24746,
    },
    testnet: {
      // vprv
      private: 0x045f18bc,
      // vpub
      public: 0x045f1cf6,
    },
  };

  const hdkey = HDKey.fromMasterSeed(masterSeed, network_version.mainnet);

    const receive_path = "m/84'/0'/0'/0/0";

  // then we derive the receive node
  const receive_node = hdkey.derive(receive_path);

  // then we get the address
  const receive_address = btc.getAddress('wpkh', receive_node.privateKey!);

  // then we derive the next receive node
  const next_receive_node = receive_node.deriveChild(1);

  // here is the change path
  const change_path = "m/84'/0'/0'/1/0"; // note the 1

  // then we derive the change node
  const change_node = hdkey.derive(change_path);
  // same as above
  const change_address = btc.getAddress('wpkh', change_node.privateKey!);

  const next_change_node = change_node.deriveChild(1);

return {
  receive_address,
  change_address,
  next_receive_node,
  next_change_node
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
  


  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // m / purpose' / coin_type' / account' / change / address_index                                          //
  // refs: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki                                   //
  // coin types: https://bip-utils.readthedocs.io/en/stable/bip_utils/slip/slip44/slip44.html               //
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // USE THIS METHOD, ADD NEW FUNC TO ENABLE MULTIPLE ADDRESS ASIDE FROM BTC
  
    for (let i = 0; i < count; i++) {
      const btcChildKey = hdkey.derive(`m/44'/0'/0'/0/${i}`);

      if (!btcChildKey.privateKey) {
        throw new Error('Failed to derive private key');
      }


      const { address: btcAddress } = btc.p2pkh(btcChildKey.publicKey ?? Buffer.alloc(0));

      const ethDerivationPath = `m/44'/60'/0'/0/${i}`;
      const ethChildKey = hdkey.derive(ethDerivationPath);

    if (!ethChildKey.privateKey) {
      throw new Error('Failed to derive Ethereum private key');
    }
    
      const ethAddress = accs.privateKeyToAddress(`0x${Buffer.from(ethChildKey.privateKey).toString('hex')}`);
      

    // Solana derivation - uses Ed25519 and different derivation path
    const solanaDerivationPath = `m/44'/501'/0'/0/${i}`;
    const solanaChildKey = hdkey.derive(solanaDerivationPath);
    
    if (!solanaChildKey.privateKey) {
      throw new Error('Failed to derive Solana private key');
    }
    
    // Convert to 32-byte seed for Solana
    const solanaSeed = solanaChildKey.privateKey.slice(0, 32);
    const solanaKeypair = Keypair.fromSeed(solanaSeed);
      const solanaAddress = solanaKeypair.publicKey.toBase58();
      
      addresses.push({
        addresses: {
          btc: btcAddress,
          eth: ethAddress,
          solana: solanaAddress
        },
        index: i,
        publicKey: Buffer.from(btcChildKey.publicKey ?? Buffer.alloc(0)).toString('hex'),
        privateKey: Buffer.from(btcChildKey.privateKey).toString('hex'),
        derivationPath: `m/44'/0'/0'/0/${i}`,
      });
    }

    return addresses;
  }

//kept for later use, if need be ///////////////////////////////////////////////////////////////////////////////////////////

   generateAddressTypes(mnemonic: string, index: number = 0) {
    const hdkey = this.createHDWallet(mnemonic);
    const childKey = hdkey.derive(`m/44'/0'/0'/0/${index}`);
    
    if (!childKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    // Legacy P2PKH (starts with 1)
    const p2pkh = btc.p2pkh(childKey.publicKey ?? Buffer.alloc(0));
    
    // P2SH-wrapped SegWit (starts with 3)
    const p2sh = btc.p2sh(btc.p2wpkh(childKey.publicKey ?? Buffer.alloc(0)));
    
    // Native SegWit (starts with bc1)
    const p2wpkh = btc.p2wpkh(childKey.publicKey ?? Buffer.alloc(0));

    return {
      derivationPath: `m/44'/0'/0'/0/${index}`,
      legacy: {
        type: 'P2PKH',
        address: p2pkh.address
      },
      segwit_wrapped: {
        type: 'P2SH-P2WPKH',
        address: p2sh.address
      },
      native_segwit: {
        type: 'P2WPKH',
        address: p2wpkh.address
      }
    };
  }

  // Get account-level extended public key (for watch-only wallets)
  getAccountXPub(mnemonic: string, account: number = 0): string {
    const hdkey = this.createHDWallet(mnemonic);
    const accountKey = hdkey.derive(`m/44'/0'/${account}'`);
    return accountKey.publicExtendedKey;
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
      derivationPath,
      address: undefined,
    };
  }

///////////////////////////////////////////////////////////////////////////////////////////////////////


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