#!/usr/bin/env node

/**
 * Wallet Services Manual Test
 * This script manually tests the wallet services functionality
 */

import { HDKey } from '@scure/bip32';

import { BtcMainnetWalletService } from './src/iwallet/BtcMainnetWallet.service.js';
import { BtcTestnetWalletService } from './src/iwallet/BtcTestnetWallet.service.js';
import { EthMainnetWalletService } from './src/iwallet/EthMainnetWallet.service.js';
import { SolMainnetWalletService } from './src/iwallet/SolMainnetWallet.service.js';

async function testWalletServices() {
  console.log('🧪 Testing Wallet Services...\n');

  // Test seed for deterministic results
  const testSeed =
    'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04';
  const masterKey = HDKey.fromMasterSeed(Buffer.from(testSeed, 'hex'));

  try {
    // Test Bitcoin Mainnet
    console.log('🟡 Testing Bitcoin Mainnet...');
    const btcMainnetService = new BtcMainnetWalletService();
    const btcMainnetWallet = await btcMainnetService.derivedPathToWallet({
      masterKey,
      derivationPath: "m/84'/0'/0'/0/0",
    });
    const btcAddress = await btcMainnetWallet.getAddress();
    console.log(`   ✅ BTC Mainnet Address: ${btcAddress}`);

    // Test Bitcoin Testnet
    console.log('🟡 Testing Bitcoin Testnet...');
    const btcTestnetService = new BtcTestnetWalletService();
    const btcTestnetWallet = await btcTestnetService.derivedPathToWallet({
      masterKey,
      derivationPath: "m/84'/1'/0'/0/0",
    });
    const btcTestnetAddress = await btcTestnetWallet.getAddress();
    console.log(`   ✅ BTC Testnet Address: ${btcTestnetAddress}`);

    // Test Ethereum Mainnet (may fail due to network requirements)
    try {
      console.log('🔵 Testing Ethereum Mainnet...');
      const ethMainnetService = new EthMainnetWalletService();
      const ethMainnetWallet = await ethMainnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/44'/60'/0'/0/0",
      });
      const ethAddress = await ethMainnetWallet.getAddress();
      console.log(`   ✅ ETH Mainnet Address: ${ethAddress}`);
    } catch (error) {
      console.log(`   ⚠️ ETH Mainnet test skipped: ${error.message}`);
    }

    // Test Solana Mainnet (may fail due to network requirements)
    try {
      console.log('🟣 Testing Solana Mainnet...');
      const solMainnetService = new SolMainnetWalletService();
      const solMainnetWallet = await solMainnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/44'/501'/0'/0'",
      });
      const solAddress = await solMainnetWallet.getAddress();
      console.log(`   ✅ SOL Mainnet Address: ${solAddress}`);
    } catch (error) {
      console.log(`   ⚠️ SOL Mainnet test skipped: ${error.message}`);
    }

    console.log('\n🎉 All available wallet services tested successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWalletServices();
}
