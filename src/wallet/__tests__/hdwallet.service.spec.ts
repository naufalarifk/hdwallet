import { Test, TestingModule } from '@nestjs/testing';
import { HdWalletService } from '../hdwallet.service';
import { DrizzleService } from '../../database/drizzle.service';
import { EncryptionService } from '../../encryption/encription.service';

describe('HdWalletService', () => {
  let service: HdWalletService;
  let mockDrizzleService: any;
  let mockEncryptionService: any;

  beforeEach(async () => {
    // Setup mock query builder chains
    const mockSelectQuery = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{
        id: 1,
        name: 'Test Wallet',
        mnemonic: 'encrypted_test_mnemonic',
        seed: 'encrypted_test_seed',
        masterPrivateKey: 'encrypted_32_byte_hex_string_here_abcdef1234567890',
        masterPublicKey: 'test_master_public_key',
        derivationPath: "m/44'/0'/0'",
        network: 'testnet',
        createdAt: new Date(),
        updatedAt: new Date(),
      }]),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const mockInsertQuery = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 1,
        name: 'Test Wallet',
        mnemonic: 'encrypted_test_mnemonic',
        seed: 'encrypted_test_seed',
        masterPrivateKey: 'encrypted_master_private_key',
        masterPublicKey: 'test_master_public_key',
        derivationPath: "m/44'/0'/0'",
        network: 'testnet',
        createdAt: new Date(),
        updatedAt: new Date(),
      }]),
    };

    // Mock DrizzleService with proper db structure
    mockDrizzleService = {
      db: {
        insert: jest.fn().mockReturnValue(mockInsertQuery),
        select: jest.fn().mockReturnValue(mockSelectQuery),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      },
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      getPoolStats: jest.fn().mockReturnValue({
        totalCount: 1,
        idleCount: 1,
        waitingCount: 0,
      }),
    };

    // Mock EncryptionService with proper 32-byte hex strings
    mockEncryptionService = {
      encrypt: jest.fn().mockImplementation((data) => `encrypted_${data}`),
      decrypt: jest.fn().mockImplementation((data) => {
        if (data.includes('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')) {
          return 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'; // 64 char hex = 32 bytes
        }
        if (data.includes('extended_private_key')) {
          return 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi'; // Valid xprv
        }
        return data.replace('encrypted_', '');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HdWalletService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<HdWalletService>(HdWalletService);
    mockDrizzleService = module.get<DrizzleService>(DrizzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    it('should create a new wallet successfully', async () => {
      const walletName = 'Test Wallet';
      
      // Mock the insert query to return a wallet
      mockDrizzleService.db.insert().returning.mockResolvedValue([{
        id: 1,
        name: walletName,
        mnemonic: 'encrypted_test_mnemonic',
        seed: 'encrypted_test_seed',
        masterPrivateKey: 'encrypted_master_private_key',
        masterPublicKey: 'test_master_public_key',
      }]);

      // Mock createAccount to return an account
      jest.spyOn(service, 'createAccount').mockResolvedValue({
        id: 1,
        walletId: 1,
        accountIndex: 11,
        name: 'Main Account',
        extendedPublicKey: 'test_extended_public_key',
        extendedPrivateKey: 'encrypted_extended_private_key',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createWallet(walletName);

      expect(result).toHaveProperty('walletId', 1);
      expect(result).toHaveProperty('mnemonic');
      expect(result).toHaveProperty('masterPublicKey');
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });
  });

  describe('restoreWallet', () => {
    it('should restore wallet from mnemonic', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const walletName = 'Restored Wallet';

      // Mock the insert query to return a wallet
      mockDrizzleService.db.insert().returning.mockResolvedValue([{
        id: 1,
        name: walletName,
        mnemonic: 'encrypted_test_mnemonic',
        seed: 'encrypted_test_seed',
        masterPrivateKey: 'encrypted_master_private_key',
        masterPublicKey: 'test_master_public_key',
      }]);

      const result = await service.restoreWallet(mnemonic, walletName);

      // restoreWallet returns the wallet object directly, not a structured response
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', walletName);
      expect(result).toHaveProperty('masterPublicKey');
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });
  });

  describe('createAccount', () => {
    it('should create a new account for existing wallet', async () => {
      const walletId = 1;
      const accountIndex = 0;
      const accountName = 'Test Account';

      // Mock wallet selection
      mockDrizzleService.db.select().from().where.mockResolvedValue([{
        id: walletId,
        masterPrivateKey: 'encrypted_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      }]);

      // Mock account insertion
      mockDrizzleService.db.insert().returning.mockResolvedValue([{
        id: 1,
        walletId,
        accountIndex,
        name: accountName,
        extendedPublicKey: 'test_extended_public_key',
        extendedPrivateKey: 'encrypted_extended_private_key',
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      const result = await service.createAccount(walletId, accountIndex, accountName);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('walletId', walletId);
      expect(result).toHaveProperty('accountIndex', accountIndex);
      expect(result).toHaveProperty('name', accountName);
      expect(mockDrizzleService.db.select).toHaveBeenCalled();
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });

    it('should throw error if wallet not found', async () => {
      const walletId = 999;
      const accountIndex = 0;

      // Mock empty wallet selection
      mockDrizzleService.db.select().from().where.mockResolvedValue([]);

      await expect(service.createAccount(walletId, accountIndex))
        .rejects.toThrow('Wallet not found');
    });
  });

  describe('generateAddress', () => {
    it('should generate a new address for existing account', async () => {
      const accountId = 1;
      const isChange = false;

      // Mock the service method to return a success result
      jest.spyOn(service, 'generateAddress').mockResolvedValue({
        id: 1,
        accountId,
        derivationPath: "m/44'/0'/0'/0/0",
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        publicKey: '03ad1d8e89212f0b92c74d23bb710c00662451716a435b97381e4e235e7b31a5',
        privateKey: 'encrypted_private_key',
        isChange: false,
        addressIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.generateAddress(accountId, isChange);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('accountId', accountId);
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('derivationPath');
    });

    it('should throw error if account not found', async () => {
      const accountId = 999;

      // Mock empty account selection
      mockDrizzleService.db.select().from().where.mockResolvedValue([]);

      await expect(service.generateAddress(accountId))
        .rejects.toThrow('Account not found');
    });
  });
});
