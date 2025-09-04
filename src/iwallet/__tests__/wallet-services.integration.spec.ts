import { Test, TestingModule } from '@nestjs/testing';
import { HDKey } from '@scure/bip32';

import { BtcMainnetWalletService } from '../BtcMainnetWallet.service';
import { BtcTestnetWalletService } from '../BtcTestnetWallet.service';
import { EthMainnetWalletService } from '../EthMainnetWallet.service';
import { EthTestnetWalletService } from '../EthTestnetWallet.service';
import { IWallet } from '../Iwallet.types';
import { SolMainnetWalletService } from '../SolMainnetWallet.service';
import { SolTestnetWalletService } from '../SolTestnetWallet.service';

describe('Wallet Services Integration Tests', () => {
  let btcMainnetService: BtcMainnetWalletService;
  let btcTestnetService: BtcTestnetWalletService;
  let ethMainnetService: EthMainnetWalletService;
  let ethTestnetService: EthTestnetWalletService;
  let solMainnetService: SolMainnetWalletService;
  let solTestnetService: SolTestnetWalletService;

  // Test seed for deterministic results
  const testSeed =
    'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BtcMainnetWalletService,
        BtcTestnetWalletService,
        EthMainnetWalletService,
        EthTestnetWalletService,
        SolMainnetWalletService,
        SolTestnetWalletService,
      ],
    }).compile();

    btcMainnetService = module.get<BtcMainnetWalletService>(BtcMainnetWalletService);
    btcTestnetService = module.get<BtcTestnetWalletService>(BtcTestnetWalletService);
    ethMainnetService = module.get<EthMainnetWalletService>(EthMainnetWalletService);
    ethTestnetService = module.get<EthTestnetWalletService>(EthTestnetWalletService);
    solMainnetService = module.get<SolMainnetWalletService>(SolMainnetWalletService);
    solTestnetService = module.get<SolTestnetWalletService>(SolTestnetWalletService);
  });

  describe('Bitcoin Wallets', () => {
    let btcMainnetWallet: IWallet;
    let btcTestnetWallet: IWallet;

    beforeEach(async () => {
      const masterKey = HDKey.fromMasterSeed(Buffer.from(testSeed, 'hex'));

      btcMainnetWallet = await btcMainnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/84'/0'/0'/0/0",
      });

      btcTestnetWallet = await btcTestnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/84'/1'/0'/0/0",
      });
    });

    it('should generate Bitcoin mainnet address', async () => {
      const address = await btcMainnetWallet.getAddress();
      expect(address).toBeTruthy();
      expect(address).toMatch(/^bc1/); // Bech32 address format
    });

    it('should generate Bitcoin testnet address', async () => {
      const address = await btcTestnetWallet.getAddress();
      expect(address).toBeTruthy();
      expect(address).toMatch(/^tb1/); // Testnet Bech32 address format
    });

    it('should sign Bitcoin transaction', async () => {
      const transactionData = {
        inputs: [
          {
            txid: 'a'.repeat(64),
            vout: 0,
            value: 100000,
            scriptPubKey: '0014' + '0'.repeat(40),
          },
        ],
        outputs: [
          {
            address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            value: 50000,
          },
        ],
      };

      const result = (await btcMainnetWallet.signTransaction(
        transactionData,
      )) as typeof transactionData & { signedTransaction: string };
      expect(result).toHaveProperty('signedTransaction');
      expect(typeof result.signedTransaction).toBe('string');
    });
  });

  describe('Ethereum Wallets', () => {
    let ethMainnetWallet: IWallet;
    let ethTestnetWallet: IWallet;

    beforeEach(async () => {
      const masterKey = HDKey.fromMasterSeed(Buffer.from(testSeed, 'hex'));

      ethMainnetWallet = await ethMainnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/44'/60'/0'/0/0",
      });

      ethTestnetWallet = await ethTestnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/44'/60'/0'/0/0",
      });
    });

    it('should generate Ethereum mainnet address', async () => {
      const address = await ethMainnetWallet.getAddress();
      expect(address).toBeTruthy();
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/); // Ethereum address format
    });

    it('should generate Ethereum testnet address', async () => {
      const address = await ethTestnetWallet.getAddress();
      expect(address).toBeTruthy();
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/); // Ethereum address format
    });

    it('should sign Ethereum transaction', async () => {
      const transactionData = {
        params: {
          to: '0x742d35Cc6634C0532925a3b8D403c4088d5d2D14',
          value: '1.0',
          gasLimit: 21000,
          gasPrice: '20',
        },
      };

      const result = (await ethMainnetWallet.signTransaction(
        transactionData,
      )) as typeof transactionData & { signedTransaction: string };
      expect(result).toHaveProperty('signedTransaction');
      expect(typeof result.signedTransaction).toBe('string');
    }, 10000); // Increase timeout for network calls
  });

  describe('Solana Wallets', () => {
    let solMainnetWallet: IWallet;
    let solTestnetWallet: IWallet;

    beforeEach(async () => {
      const masterKey = HDKey.fromMasterSeed(Buffer.from(testSeed, 'hex'));

      solMainnetWallet = await solMainnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/44'/501'/0'/0'",
      });

      solTestnetWallet = await solTestnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/44'/501'/0'/0'",
      });
    });

    it('should generate Solana mainnet address', async () => {
      const address = await solMainnetWallet.getAddress();
      expect(address).toBeTruthy();
      expect(address.length).toBeGreaterThan(32); // Base58 encoded public key
    });

    it('should generate Solana testnet address', async () => {
      const address = await solTestnetWallet.getAddress();
      expect(address).toBeTruthy();
      expect(address.length).toBeGreaterThan(32); // Base58 encoded public key
    });

    it('should sign Solana transaction', async () => {
      const transactionData = {
        params: {
          to: 'GrDMoeqMLFjeXQ24H56S1RLgT4R76UERmBWob9nAzBB',
          amount: 1.0,
        },
      };

      const result = (await solMainnetWallet.signTransaction(
        transactionData,
      )) as typeof transactionData & { signedTransaction: string };
      expect(result).toHaveProperty('signedTransaction');
      expect(typeof result.signedTransaction).toBe('string');
    }, 15000); // Increase timeout for network calls
  });

  describe('Error Handling', () => {
    it('should handle invalid derivation path', async () => {
      const masterKey = HDKey.fromMasterSeed(Buffer.from(testSeed, 'hex'));

      await expect(
        btcMainnetService.derivedPathToWallet({
          masterKey,
          derivationPath: 'invalid/path',
        }),
      ).rejects.toThrow();
    });

    it('should handle invalid transaction data', async () => {
      const masterKey = HDKey.fromMasterSeed(Buffer.from(testSeed, 'hex'));
      const wallet = await btcMainnetService.derivedPathToWallet({
        masterKey,
        derivationPath: "m/84'/0'/0'/0/0",
      });

      await expect(wallet.signTransaction({ invalid: 'data' })).rejects.toThrow(
        'Invalid transaction data format',
      );
    });
  });
});
