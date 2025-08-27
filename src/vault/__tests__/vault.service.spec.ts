import { Test, TestingModule } from '@nestjs/testing';
import { VaultService } from '../vault.service';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Mock node-vault
const mockVaultClient = {
  health: jest.fn(),
  status: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  approleLogin: jest.fn(),
  tokenLookupSelf: jest.fn(),
  tokenRevokeSelf: jest.fn(),
  generateDatabaseCredentials: jest.fn(),
  generateDataKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  createPolicy: jest.fn(),
  getPolicy: jest.fn(),
  deletePolicy: jest.fn(),
  tokenCreate: jest.fn(),
  help: jest.fn(),
};

// Mock vault module
jest.mock('node-vault', () => {
  return jest.fn().mockImplementation(() => mockVaultClient);
});

const mockHealthResponse = {
  initialized: true,
  sealed: false,
  standby: false,
  performance_standby: false,
  replication_performance_mode: 'disabled',
  replication_dr_mode: 'disabled',
  server_time_utc: 1672531200,
  version: '1.12.0',
  cluster_name: 'vault-cluster-1',
  cluster_id: 'test-cluster-id',
};

const mockSecretData = {
  request_id: 'test-request-id',
  lease_id: '',
  renewable: false,
  lease_duration: 0,
  data: {
    username: 'testuser',
    password: 'testpass123',
    metadata: {
      created_time: '2023-01-01T00:00:00.000Z',
      version: 1,
    },
  },
};

const mockEncryptResponse = {
  data: {
    ciphertext: 'vault:v1:encrypted-data-here',
  },
};

const mockDecryptResponse = {
  data: {
    plaintext: Buffer.from('test data').toString('base64'),
  },
};

describe('VaultService', () => {
  let service: VaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        WinstonModule.forRoot({
          transports: [
            new winston.transports.Console({
              level: 'error',
              silent: true,
            }),
          ],
        }),
      ],
      providers: [VaultService],
    }).compile();

    service = module.get<VaultService>(VaultService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize vault client on module init', async () => {
      // Act
      await service.onModuleInit();

      // Assert - Service should be initialized without errors
      expect(service).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return health status when vault is healthy', async () => {
      // Arrange
      mockVaultClient.health.mockResolvedValue(mockHealthResponse);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toEqual(mockHealthResponse);
      expect(mockVaultClient.health).toHaveBeenCalledTimes(1);
    });

    it('should handle vault health check errors', async () => {
      // Arrange
      const error = new Error('Connection refused');
      mockVaultClient.health.mockRejectedValue(error);

      // Act & Assert
      await expect(service.healthCheck()).rejects.toThrow('Connection refused');
    });

    it('should handle vault sealed status', async () => {
      // Arrange
      const sealedResponse = { ...mockHealthResponse, sealed: true };
      mockVaultClient.health.mockResolvedValue(sealedResponse);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toEqual(sealedResponse);
      expect(result.sealed).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('should return true when vault is healthy', async () => {
      // Arrange
      mockVaultClient.health.mockResolvedValue(mockHealthResponse);

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when vault is unhealthy', async () => {
      // Arrange
      mockVaultClient.health.mockRejectedValue(new Error('Vault error'));

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when vault is sealed', async () => {
      // Arrange
      const sealedResponse = { ...mockHealthResponse, sealed: true };
      mockVaultClient.health.mockResolvedValue(sealedResponse);

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when vault is not initialized', async () => {
      // Arrange
      const uninitializedResponse = { ...mockHealthResponse, initialized: false };
      mockVaultClient.health.mockResolvedValue(uninitializedResponse);

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getSecret', () => {
    it('should read secret successfully', async () => {
      // Arrange
      const path = 'secret/test';
      mockVaultClient.read.mockResolvedValue(mockSecretData);

      // Act
      const result = await service.getSecret(path);

      // Assert
      expect(result).toEqual(mockSecretData);
      expect(mockVaultClient.read).toHaveBeenCalledWith(path);
    });

    it('should handle non-existent secret', async () => {
      // Arrange
      const path = 'secret/nonexistent';
      const error = new Error('404');
      mockVaultClient.read.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getSecret(path)).rejects.toThrow('404');
    });

    it('should handle permission denied', async () => {
      // Arrange
      const path = 'secret/forbidden';
      const error = new Error('permission denied');
      mockVaultClient.read.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getSecret(path)).rejects.toThrow('permission denied');
    });
  });

  describe('writeSecret', () => {
    it('should write secret successfully', async () => {
      // Arrange
      const path = 'secret/test';
      const data = { username: 'testuser', password: 'testpass' };
      const writeResponse = { request_id: 'test-request' };
      mockVaultClient.write.mockResolvedValue(writeResponse);

      // Act
      const result = await service.writeSecret(path, data);

      // Assert
      expect(result).toEqual(writeResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(path, data);
    });

    it('should handle write errors', async () => {
      // Arrange
      const path = 'secret/test';
      const data = { username: 'testuser' };
      const error = new Error('Write failed');
      mockVaultClient.write.mockRejectedValue(error);

      // Act & Assert
      await expect(service.writeSecret(path, data)).rejects.toThrow('Write failed');
    });
  });

  describe('deleteSecret', () => {
    it('should delete secret successfully', async () => {
      // Arrange
      const path = 'secret/test';
      const deleteResponse = { request_id: 'delete-request' };
      mockVaultClient.delete.mockResolvedValue(deleteResponse);

      // Act
      const result = await service.deleteSecret(path);

      // Assert
      expect(result).toEqual(deleteResponse);
      expect(mockVaultClient.delete).toHaveBeenCalledWith(path);
    });

    it('should handle delete errors', async () => {
      // Arrange
      const path = 'secret/test';
      const error = new Error('Delete failed');
      mockVaultClient.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.deleteSecret(path)).rejects.toThrow('Delete failed');
    });
  });

  describe('encryptData', () => {
    it('should encrypt data successfully', async () => {
      // Arrange
      const keyName = 'test-key';
      const plaintext = 'sensitive data';
      const context = 'test-context';
      
      mockVaultClient.write.mockResolvedValue(mockEncryptResponse);

      // Act
      const result = await service.encryptData(keyName, plaintext, context);

      // Assert
      expect(result).toEqual(mockEncryptResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `transit/encrypt/${keyName}`,
        {
          plaintext: Buffer.from(plaintext).toString('base64'),
          context: context ? Buffer.from(context).toString('base64') : undefined,
        }
      );
    });

    it('should encrypt data without context', async () => {
      // Arrange
      const keyName = 'test-key';
      const plaintext = 'sensitive data';
      
      mockVaultClient.write.mockResolvedValue(mockEncryptResponse);

      // Act
      const result = await service.encryptData(keyName, plaintext);

      // Assert
      expect(result).toEqual(mockEncryptResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `transit/encrypt/${keyName}`,
        {
          plaintext: Buffer.from(plaintext).toString('base64'),
          context: undefined,
        }
      );
    });

    it('should handle encryption errors', async () => {
      // Arrange
      const keyName = 'test-key';
      const plaintext = 'data';
      const error = new Error('Encryption failed');
      mockVaultClient.write.mockRejectedValue(error);

      // Act & Assert
      await expect(service.encryptData(keyName, plaintext)).rejects.toThrow('Encryption failed');
    });
  });

  describe('decryptData', () => {
    it('should decrypt data successfully', async () => {
      // Arrange
      const keyName = 'test-key';
      const ciphertext = 'vault:v1:encrypted-data';
      const context = 'test-context';
      
      mockVaultClient.write.mockResolvedValue(mockDecryptResponse);

      // Act
      const result = await service.decryptData(keyName, ciphertext, context);

      // Assert
      expect(result).toEqual(mockDecryptResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `transit/decrypt/${keyName}`,
        {
          ciphertext,
          context: context ? Buffer.from(context).toString('base64') : undefined,
        }
      );
    });

    it('should decrypt data without context', async () => {
      // Arrange
      const keyName = 'test-key';
      const ciphertext = 'vault:v1:encrypted-data';
      
      mockVaultClient.write.mockResolvedValue(mockDecryptResponse);

      // Act
      const result = await service.decryptData(keyName, ciphertext);

      // Assert
      expect(result).toEqual(mockDecryptResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `transit/decrypt/${keyName}`,
        {
          ciphertext,
          context: undefined,
        }
      );
    });

    it('should handle decryption errors', async () => {
      // Arrange
      const keyName = 'test-key';
      const ciphertext = 'invalid-ciphertext';
      const error = new Error('Decryption failed');
      mockVaultClient.write.mockRejectedValue(error);

      // Act & Assert
      await expect(service.decryptData(keyName, ciphertext)).rejects.toThrow('Decryption failed');
    });
  });

  describe('createTransitKey', () => {
    it('should create transit key successfully', async () => {
      // Arrange
      const keyName = 'new-key';
      const keyType = 'aes256-gcm96';
      const createResponse = { request_id: 'key-create-request' };
      mockVaultClient.write.mockResolvedValue(createResponse);

      // Act
      const result = await service.createTransitKey(keyName, keyType);

      // Assert
      expect(result).toEqual(createResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `transit/keys/${keyName}`,
        { type: keyType }
      );
    });

    it('should create key with default type', async () => {
      // Arrange
      const keyName = 'new-key';
      const createResponse = { request_id: 'key-create-request' };
      mockVaultClient.write.mockResolvedValue(createResponse);

      // Act
      const result = await service.createTransitKey(keyName);

      // Assert
      expect(result).toEqual(createResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `transit/keys/${keyName}`,
        { type: 'aes256-gcm96' }
      );
    });

    it('should handle key creation errors', async () => {
      // Arrange
      const keyName = 'existing-key';
      const error = new Error('Key already exists');
      mockVaultClient.write.mockRejectedValue(error);

      // Act & Assert
      await expect(service.createTransitKey(keyName)).rejects.toThrow('Key already exists');
    });
  });

  describe('getDatabaseCredentials', () => {
    it('should generate database credentials successfully', async () => {
      // Arrange
      const roleName = 'readonly';
      const credentialsResponse = {
        data: {
          username: 'v-root-readonly-abc123',
          password: 'generated-password-xyz789',
        },
        lease_duration: 3600,
        renewable: true,
      };
      mockVaultClient.read.mockResolvedValue(credentialsResponse);

      // Act
      const result = await service.getDatabaseCredentials(roleName);

      // Assert
      expect(result).toEqual(credentialsResponse);
      expect(mockVaultClient.read).toHaveBeenCalledWith(`database/creds/${roleName}`);
    });

    it('should handle database credential errors', async () => {
      // Arrange
      const roleName = 'nonexistent-role';
      const error = new Error('Role not found');
      mockVaultClient.read.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getDatabaseCredentials(roleName)).rejects.toThrow('Role not found');
    });
  });

  describe('createPolicy', () => {
    it('should create policy successfully', async () => {
      // Arrange
      const policyName = 'test-policy';
      const rules = 'path "secret/*" { capabilities = ["read", "list"] }';
      const policyResponse = { request_id: 'policy-create' };
      mockVaultClient.write.mockResolvedValue(policyResponse);

      // Act
      const result = await service.createPolicy(policyName, rules);

      // Assert
      expect(result).toEqual(policyResponse);
      expect(mockVaultClient.write).toHaveBeenCalledWith(
        `sys/policies/acl/${policyName}`,
        { policy: rules }
      );
    });

    it('should handle policy creation errors', async () => {
      // Arrange
      const policyName = 'invalid-policy';
      const rules = 'invalid rules';
      const error = new Error('Invalid policy format');
      mockVaultClient.write.mockRejectedValue(error);

      // Act & Assert
      await expect(service.createPolicy(policyName, rules)).rejects.toThrow('Invalid policy format');
    });
  });

  describe('getPolicy', () => {
    it('should get policy successfully', async () => {
      // Arrange
      const policyName = 'test-policy';
      const policyResponse = {
        data: {
          name: policyName,
          rules: 'path "secret/*" { capabilities = ["read"] }',
        },
      };
      mockVaultClient.read.mockResolvedValue(policyResponse);

      // Act
      const result = await service.getPolicy(policyName);

      // Assert
      expect(result).toEqual(policyResponse);
      expect(mockVaultClient.read).toHaveBeenCalledWith(`sys/policies/acl/${policyName}`);
    });

    it('should handle non-existent policy', async () => {
      // Arrange
      const policyName = 'nonexistent-policy';
      const error = new Error('Policy not found');
      mockVaultClient.read.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getPolicy(policyName)).rejects.toThrow('Policy not found');
    });
  });

  describe('deletePolicy', () => {
    it('should delete policy successfully', async () => {
      // Arrange
      const policyName = 'test-policy';
      const deleteResponse = { request_id: 'policy-delete' };
      mockVaultClient.delete.mockResolvedValue(deleteResponse);

      // Act
      const result = await service.deletePolicy(policyName);

      // Assert
      expect(result).toEqual(deleteResponse);
      expect(mockVaultClient.delete).toHaveBeenCalledWith(`sys/policies/acl/${policyName}`);
    });

    it('should handle policy deletion errors', async () => {
      // Arrange
      const policyName = 'protected-policy';
      const error = new Error('Cannot delete protected policy');
      mockVaultClient.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.deletePolicy(policyName)).rejects.toThrow('Cannot delete protected policy');
    });
  });

  describe('Wallet-specific methods', () => {
    describe('encryptData for mnemonics', () => {
      it('should encrypt mnemonic using transit engine', async () => {
        // Arrange
        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        mockVaultClient.write.mockResolvedValue(mockEncryptResponse);

        // Act
        const result = await service.encryptData('wallet-key', mnemonic);

        // Assert
        expect(result).toEqual(mockEncryptResponse);
        expect(mockVaultClient.write).toHaveBeenCalledWith(
          'transit/encrypt/wallet-key',
          {
            plaintext: Buffer.from(mnemonic).toString('base64'),
            context: undefined,
          }
        );
      });
    });

    describe('decryptData for mnemonics', () => {
      it('should decrypt mnemonic using transit engine', async () => {
        // Arrange
        const encryptedMnemonic = 'vault:v1:encrypted-mnemonic';
        const decryptedData = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        
        mockVaultClient.write.mockResolvedValue({
          data: {
            plaintext: Buffer.from(decryptedData).toString('base64'),
          },
        });

        // Act
        const result = await service.decryptData('wallet-key', encryptedMnemonic);

        // Assert
        expect(result).toEqual({
          data: {
            plaintext: Buffer.from(decryptedData).toString('base64'),
          },
        });
        expect(mockVaultClient.write).toHaveBeenCalledWith(
          'transit/decrypt/wallet-key',
          {
            ciphertext: encryptedMnemonic,
            context: undefined,
          }
        );
      });
    });

    describe('writeKv2Secret for wallet config', () => {
      it('should store wallet configuration', async () => {
        // Arrange
        const walletId = '123';
        const config = { name: 'Test Wallet', created: new Date().toISOString() };
        mockVaultClient.write.mockResolvedValue({ request_id: 'config-store' });

        // Act
        await service.writeKv2Secret(`wallets/${walletId}/config`, config);

        // Assert
        expect(mockVaultClient.write).toHaveBeenCalledWith(
          `kv/data/wallets/${walletId}/config`,
          { data: config }
        );
      });
    });

    describe('getKv2Secret for wallet config', () => {
      it('should retrieve wallet configuration', async () => {
        // Arrange
        const walletId = '123';
        const configData = { name: 'Test Wallet', created: '2023-01-01T00:00:00.000Z' };
        mockVaultClient.read.mockResolvedValue({ data: { data: configData } });

        // Act
        const result = await service.getKv2Secret(`wallets/${walletId}/config`);

        // Assert
        expect(result).toEqual({ data: { data: configData } });
        expect(mockVaultClient.read).toHaveBeenCalledWith(`kv/data/wallets/${walletId}/config`);
      });
    });
  });
});
