import { Test, TestingModule } from '@nestjs/testing';
import { VaultController } from '../vault.controller';
import { VaultService } from '../vault.service';

import {
  WriteSecretDto,
  EncryptDataDto,
  DecryptDataDto,
  DatabaseCredentialsDto,
  TransitKeyDto,
  CreatePolicyDto,
} from '../vault.dto';

// Mock data
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
  },
};

const mockEncryptionResult = {
  data: {
    ciphertext: 'vault:v1:encrypted-data-here',
  },
};

const mockDecryptionResult = {
  data: {
    plaintext: Buffer.from('decrypted data').toString('base64'),
  },
};

const mockDatabaseCredentials = {
  data: {
    username: 'v-root-readonly-abc123',
    password: 'generated-password-xyz789',
  },
  lease_duration: 3600,
  renewable: true,
};

// Mock implementations
const mockVaultService = {
  healthCheck: jest.fn(),
  isHealthy: jest.fn(),
  getSecret: jest.fn(),
  getKv2Secret: jest.fn(),
  writeSecret: jest.fn(),
  writeKv2Secret: jest.fn(),
  deleteSecret: jest.fn(),
  getDatabaseCredentials: jest.fn(),
  createTransitKey: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn(),
  createPolicy: jest.fn(),
  getPolicy: jest.fn(),
  deletePolicy: jest.fn(),
  createToken: jest.fn(),
  revokeToken: jest.fn(),
};

describe('VaultController', () => {
  let controller: VaultController;
  let vaultService: VaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VaultController],
      providers: [
        {
          provide: VaultService,
          useValue: mockVaultService,
        },
      ],
    }).compile();

    controller = module.get<VaultController>(VaultController);
    vaultService = module.get<VaultService>(VaultService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have vault service injected', () => {
      expect(vaultService).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return vault health status', async () => {
      // Arrange
      mockVaultService.healthCheck.mockResolvedValue(mockHealthResponse);

      // Act
      const result = await controller.getHealth();

      // Assert
      expect(result).toEqual(mockHealthResponse);
      expect(mockVaultService.healthCheck).toHaveBeenCalledTimes(1);
    });

    it('should handle health check errors', async () => {
      // Arrange
      const error = new Error('Connection refused');
      mockVaultService.healthCheck.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getHealth()).rejects.toThrow('Connection refused');
    });
  });

  describe('getStatus', () => {
    it('should return healthy status when vault is healthy', async () => {
      // Arrange
      mockVaultService.isHealthy.mockResolvedValue(true);

      // Act
      const result = await controller.getStatus();

      // Assert
      expect(result).toEqual({
        healthy: true,
        message: 'Vault service is healthy',
      });
      expect(mockVaultService.isHealthy).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status when vault is down', async () => {
      // Arrange
      mockVaultService.isHealthy.mockResolvedValue(false);

      // Act
      const result = await controller.getStatus();

      // Assert
      expect(result).toEqual({
        healthy: false,
        message: 'Vault service is unhealthy',
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service error');
      mockVaultService.isHealthy.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStatus()).rejects.toThrow('Service error');
    });
  });

  describe('getSecret', () => {
    it('should retrieve secret successfully', async () => {
      // Arrange
      const path = 'test-secret';
      mockVaultService.getSecret.mockResolvedValue(mockSecretData);

      // Act
      const result = await controller.getSecret(path);

      // Assert
      expect(result).toEqual(mockSecretData);
      expect(mockVaultService.getSecret).toHaveBeenCalledWith(path);
    });

    it('should handle non-existent secret', async () => {
      // Arrange
      const path = 'nonexistent';
      const error = new Error('Secret not found');
      mockVaultService.getSecret.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getSecret(path)).rejects.toThrow('Secret not found');
    });
  });

  describe('writeSecret', () => {
    it('should write secret successfully', async () => {
      // Arrange
      const writeSecretDto: WriteSecretDto = {
        path: 'test/secret',
        data: { username: 'testuser', password: 'testpass' },
      };
      const writeResponse = { request_id: 'write-request' };
      mockVaultService.writeSecret.mockResolvedValue(writeResponse);

      // Act
      const result = await controller.writeSecret(writeSecretDto);

      // Assert
      expect(result).toEqual({ message: 'Secret written successfully to test/secret' });
      expect(mockVaultService.writeSecret).toHaveBeenCalledWith(
        writeSecretDto.path,
        writeSecretDto.data
      );
    });

    it('should handle write errors', async () => {
      // Arrange
      const writeSecretDto: WriteSecretDto = {
        path: 'test/secret',
        data: { username: 'testuser' },
      };
      const error = new Error('Write failed');
      mockVaultService.writeSecret.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.writeSecret(writeSecretDto)).rejects.toThrow('Write failed');
    });
  });

  describe('deleteSecret', () => {
    it('should delete secret successfully', async () => {
      // Arrange
      const path = 'test-secret';
      const deleteResponse = { request_id: 'delete-request' };
      mockVaultService.deleteSecret.mockResolvedValue(deleteResponse);

      // Act
      const result = await controller.deleteSecret(path);

      // Assert
      expect(result).toEqual({ message: 'Secret deleted successfully from test-secret' });
      expect(mockVaultService.deleteSecret).toHaveBeenCalledWith(path);
    });

    it('should handle delete errors', async () => {
      // Arrange
      const path = 'test-secret';
      const error = new Error('Delete failed');
      mockVaultService.deleteSecret.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteSecret(path)).rejects.toThrow('Delete failed');
    });
  });

  describe('getKv2Secret', () => {
    it('should retrieve KV2 secret successfully', async () => {
      // Arrange
      const path = 'kv2-secret';
      mockVaultService.getKv2Secret.mockResolvedValue(mockSecretData);

      // Act
      const result = await controller.getKv2Secret(path);

      // Assert
      expect(result).toEqual(mockSecretData);
      expect(mockVaultService.getKv2Secret).toHaveBeenCalledWith(path);
    });
  });

  describe('writeKv2Secret', () => {
    it('should write KV2 secret successfully', async () => {
      // Arrange
      const writeSecretDto: WriteSecretDto = {
        path: 'kv2/secret',
        data: { key: 'value' },
      };
      const writeResponse = { request_id: 'kv2-write-request' };
      mockVaultService.writeKv2Secret.mockResolvedValue(writeResponse);

      // Act
      const result = await controller.writeKv2Secret(writeSecretDto);

      // Assert
      expect(result).toEqual({ message: 'KV2 secret written successfully to kv2/secret' });
      expect(mockVaultService.writeKv2Secret).toHaveBeenCalledWith(
        writeSecretDto.path,
        writeSecretDto.data
      );
    });
  });

  describe('getDatabaseCredentials', () => {
    it('should generate database credentials successfully', async () => {
      // Arrange
      const databaseCredentialsDto: DatabaseCredentialsDto = {
        role: 'readonly',
      };
      mockVaultService.getDatabaseCredentials.mockResolvedValue(mockDatabaseCredentials);

      // Act
      const result = await controller.getDatabaseCredentials(databaseCredentialsDto);

      // Assert
      expect(result).toEqual(mockDatabaseCredentials);
      expect(mockVaultService.getDatabaseCredentials).toHaveBeenCalledWith(
        databaseCredentialsDto.role
      );
    });

    it('should handle role not found error', async () => {
      // Arrange
      const databaseCredentialsDto: DatabaseCredentialsDto = {
        role: 'nonexistent',
      };
      const error = new Error('Role not found');
      mockVaultService.getDatabaseCredentials.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getDatabaseCredentials(databaseCredentialsDto)).rejects.toThrow('Role not found');
    });
  });

  describe('createTransitKey', () => {
    it('should create transit key successfully', async () => {
      // Arrange
      const transitKeyDto: TransitKeyDto = {
        keyName: 'test-key',
        keyType: 'aes256-gcm96',
      };
      const createResponse = { request_id: 'key-create' };
      mockVaultService.createTransitKey.mockResolvedValue(createResponse);

      // Act
      const result = await controller.createTransitKey(transitKeyDto);

      // Assert
      expect(result).toEqual({ message: 'Transit key test-key created successfully' });
      expect(mockVaultService.createTransitKey).toHaveBeenCalledWith(
        transitKeyDto.keyName,
        transitKeyDto.keyType
      );
    });

    it('should create key with default type', async () => {
      // Arrange
      const transitKeyDto: TransitKeyDto = {
        keyName: 'test-key',
      };
      const createResponse = { request_id: 'key-create' };
      mockVaultService.createTransitKey.mockResolvedValue(createResponse);

      // Act
      const result = await controller.createTransitKey(transitKeyDto);

      // Assert
      expect(result).toEqual({ message: 'Transit key test-key created successfully' });
      expect(mockVaultService.createTransitKey).toHaveBeenCalledWith(
        transitKeyDto.keyName,
        undefined
      );
    });
  });

  describe('encryptData', () => {
    it('should encrypt data successfully', async () => {
      // Arrange
      const keyName = 'test-key';
      const encryptDataDto: EncryptDataDto = {
        data: 'sensitive information',
        context: 'test-context',
      };
      mockVaultService.encryptData.mockResolvedValue(mockEncryptionResult);

      // Act
      const result = await controller.encryptData(keyName, encryptDataDto);

      // Assert
      expect(result).toEqual(mockEncryptionResult);
      expect(mockVaultService.encryptData).toHaveBeenCalledWith(
        keyName,
        encryptDataDto.data,
        encryptDataDto.context
      );
    });

    it('should encrypt data without context', async () => {
      // Arrange
      const keyName = 'test-key';
      const encryptDataDto: EncryptDataDto = {
        data: 'sensitive information',
      };
      mockVaultService.encryptData.mockResolvedValue(mockEncryptionResult);

      // Act
      const result = await controller.encryptData(keyName, encryptDataDto);

      // Assert
      expect(result).toEqual(mockEncryptionResult);
      expect(mockVaultService.encryptData).toHaveBeenCalledWith(
        keyName,
        encryptDataDto.data,
        undefined
      );
    });

    it('should handle encryption errors', async () => {
      // Arrange
      const keyName = 'invalid-key';
      const encryptDataDto: EncryptDataDto = {
        data: 'data',
      };
      const error = new Error('Key not found');
      mockVaultService.encryptData.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.encryptData(keyName, encryptDataDto)).rejects.toThrow('Key not found');
    });
  });

  describe('decryptData', () => {
    it('should decrypt data successfully', async () => {
      // Arrange
      const keyName = 'test-key';
      const decryptDataDto: DecryptDataDto = {
        ciphertext: 'vault:v1:encrypted-data',
        context: 'test-context',
      };
      mockVaultService.decryptData.mockResolvedValue(mockDecryptionResult);

      // Act
      const result = await controller.decryptData(keyName, decryptDataDto);

      // Assert
      expect(result).toEqual(mockDecryptionResult);
      expect(mockVaultService.decryptData).toHaveBeenCalledWith(
        keyName,
        decryptDataDto.ciphertext,
        decryptDataDto.context
      );
    });

    it('should decrypt data without context', async () => {
      // Arrange
      const keyName = 'test-key';
      const decryptDataDto: DecryptDataDto = {
        ciphertext: 'vault:v1:encrypted-data',
      };
      mockVaultService.decryptData.mockResolvedValue(mockDecryptionResult);

      // Act
      const result = await controller.decryptData(keyName, decryptDataDto);

      // Assert
      expect(result).toEqual(mockDecryptionResult);
      expect(mockVaultService.decryptData).toHaveBeenCalledWith(
        keyName,
        decryptDataDto.ciphertext,
        undefined
      );
    });

    it('should handle decryption errors', async () => {
      // Arrange
      const keyName = 'test-key';
      const decryptDataDto: DecryptDataDto = {
        ciphertext: 'invalid-ciphertext',
      };
      const error = new Error('Decryption failed');
      mockVaultService.decryptData.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.decryptData(keyName, decryptDataDto)).rejects.toThrow('Decryption failed');
    });
  });

  describe('createPolicy', () => {
    it('should create policy successfully', async () => {
      // Arrange
      const createPolicyDto: CreatePolicyDto = {
        name: 'test-policy',
        policy: 'path "secret/*" { capabilities = ["read", "list"] }',
      };
      const policyResponse = { request_id: 'policy-create' };
      mockVaultService.createPolicy.mockResolvedValue(policyResponse);

      // Act
      const result = await controller.createPolicy(createPolicyDto);

      // Assert
      expect(result).toEqual({ message: 'Policy test-policy created successfully' });
      expect(mockVaultService.createPolicy).toHaveBeenCalledWith(
        createPolicyDto.name,
        createPolicyDto.policy
      );
    });

    it('should handle policy creation errors', async () => {
      // Arrange
      const createPolicyDto: CreatePolicyDto = {
        name: 'invalid-policy',
        policy: 'invalid policy syntax',
      };
      const error = new Error('Invalid policy format');
      mockVaultService.createPolicy.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createPolicy(createPolicyDto)).rejects.toThrow('Invalid policy format');
    });
  });

  describe('getPolicy', () => {
    it('should retrieve policy successfully', async () => {
      // Arrange
      const policyName = 'test-policy';
      const policyRules = 'path "secret/*" { capabilities = ["read"] }';
      mockVaultService.getPolicy.mockResolvedValue(policyRules);

      // Act
      const result = await controller.getPolicy(policyName);

      // Assert
      expect(result).toEqual({ name: policyName, policy: policyRules });
      expect(mockVaultService.getPolicy).toHaveBeenCalledWith(policyName);
    });

    it('should handle non-existent policy', async () => {
      // Arrange
      const policyName = 'nonexistent-policy';
      const error = new Error('Policy not found');
      mockVaultService.getPolicy.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getPolicy(policyName)).rejects.toThrow('Policy not found');
    });
  });

  describe('deletePolicy', () => {
    it('should delete policy successfully', async () => {
      // Arrange
      const policyName = 'test-policy';
      const deleteResponse = { request_id: 'policy-delete' };
      mockVaultService.deletePolicy.mockResolvedValue(deleteResponse);

      // Act
      const result = await controller.deletePolicy(policyName);

      // Assert
      expect(result).toEqual({ message: 'Policy test-policy deleted successfully' });
      expect(mockVaultService.deletePolicy).toHaveBeenCalledWith(policyName);
    });

    it('should handle policy deletion errors', async () => {
      // Arrange
      const policyName = 'protected-policy';
      const error = new Error('Cannot delete protected policy');
      mockVaultService.deletePolicy.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deletePolicy(policyName)).rejects.toThrow('Cannot delete protected policy');
    });
  });

  describe('createToken', () => {
    it('should create token successfully', async () => {
      // Arrange
      const policies = ['readonly', 'audit'];
      const ttl = '2h';
      const tokenData = {
        client_token: 'hvs.test-token',
        accessor: 'accessor-123',
        policies: ['default', 'readonly', 'audit'],
        token_policies: ['readonly', 'audit'],
        metadata: null,
        lease_duration: 7200,
        renewable: true,
        entity_id: '',
        token_type: 'service',
        orphan: false,
      };
      mockVaultService.createToken.mockResolvedValue(tokenData);

      // Act
      const result = await controller.createToken({ policies, ttl });

      // Assert
      expect(result).toEqual(tokenData);
      expect(mockVaultService.createToken).toHaveBeenCalledWith(policies, ttl);
    });

    it('should create token with default values', async () => {
      // Arrange
      const tokenData = {
        client_token: 'hvs.test-token',
        accessor: 'accessor-123',
        policies: ['default'],
        token_policies: [],
        lease_duration: 3600,
        renewable: true,
      };
      mockVaultService.createToken.mockResolvedValue(tokenData);

      // Act
      const result = await controller.createToken({});

      // Assert
      expect(result).toEqual(tokenData);
      expect(mockVaultService.createToken).toHaveBeenCalledWith([], '1h');
    });

    it('should handle token creation errors', async () => {
      // Arrange
      const policies = ['nonexistent-policy'];
      const error = new Error('Policy not found');
      mockVaultService.createToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createToken({ policies })).rejects.toThrow('Policy not found');
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      // Arrange
      const token = 'hvs.test-token';
      mockVaultService.revokeToken.mockResolvedValue(undefined);

      // Act
      const result = await controller.revokeToken({ token });

      // Assert
      expect(result).toEqual({ message: 'Token revoked successfully' });
      expect(mockVaultService.revokeToken).toHaveBeenCalledWith(token);
    });

    it('should handle token revocation errors', async () => {
      // Arrange
      const token = 'invalid-token';
      const error = new Error('Token not found');
      mockVaultService.revokeToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.revokeToken({ token })).rejects.toThrow('Token not found');
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      mockVaultService.healthCheck.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getHealth()).rejects.toThrow('Service unavailable');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const error = new Error('Unexpected error');
      mockVaultService.isHealthy.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStatus()).rejects.toThrow('Unexpected error');
    });
  });

  describe('Wallet-specific endpoints', () => {
    it('should encrypt wallet mnemonic', async () => {
      // Arrange
      const encryptMnemonicDto = {
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        walletId: 'wallet-123',
      };
      mockVaultService.createTransitKey.mockRejectedValue(new Error('path is already in use'));
      mockVaultService.encryptData.mockResolvedValue(mockEncryptionResult);

      // Act
      const result = await controller.encryptMnemonic(encryptMnemonicDto);

      // Assert
      expect(result).toEqual(mockEncryptionResult);
      expect(mockVaultService.createTransitKey).toHaveBeenCalledWith('wallet-wallet-123');
      expect(mockVaultService.encryptData).toHaveBeenCalledWith(
        'wallet-wallet-123',
        encryptMnemonicDto.mnemonic,
        encryptMnemonicDto.walletId
      );
    });

    it('should decrypt wallet mnemonic', async () => {
      // Arrange
      const decryptMnemonicDto = {
        ciphertext: 'vault:v1:encrypted-mnemonic',
        walletId: 'wallet-123',
      };
      mockVaultService.decryptData.mockResolvedValue(mockDecryptionResult);

      // Act
      const result = await controller.decryptMnemonic(decryptMnemonicDto);

      // Assert
      expect(result).toEqual(mockDecryptionResult);
      expect(mockVaultService.decryptData).toHaveBeenCalledWith(
        'wallet-wallet-123',
        decryptMnemonicDto.ciphertext,
        decryptMnemonicDto.walletId
      );
    });

    it('should store wallet config', async () => {
      // Arrange
      const storeConfigDto = {
        walletId: '123',
        config: { name: 'Test Wallet', created: '2023-01-01T00:00:00.000Z' },
      };
      mockVaultService.writeKv2Secret.mockResolvedValue({ request_id: 'wallet-config-store' });

      // Act
      const result = await controller.storeWalletConfig(storeConfigDto);

      // Assert
      expect(result).toEqual({ message: 'Wallet configuration stored successfully for 123' });
      expect(mockVaultService.writeKv2Secret).toHaveBeenCalledWith(
        'wallets/123/config',
        storeConfigDto.config
      );
    });

    it('should get wallet config', async () => {
      // Arrange
      const walletId = '123';
      const configData = {
        data: {
          data: { name: 'Test Wallet', created: '2023-01-01T00:00:00.000Z' },
        },
      };
      mockVaultService.getKv2Secret.mockResolvedValue(configData);

      // Act
      const result = await controller.getWalletConfig(walletId);

      // Assert
      expect(result).toEqual(configData);
      expect(mockVaultService.getKv2Secret).toHaveBeenCalledWith(`wallets/${walletId}/config`);
    });

    it('should handle new transit key creation for wallet', async () => {
      // Arrange
      const encryptMnemonicDto = {
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        walletId: 'new-wallet',
      };
      mockVaultService.createTransitKey.mockResolvedValue({ request_id: 'key-created' });
      mockVaultService.encryptData.mockResolvedValue(mockEncryptionResult);

      // Act
      const result = await controller.encryptMnemonic(encryptMnemonicDto);

      // Assert
      expect(result).toEqual(mockEncryptionResult);
      expect(mockVaultService.createTransitKey).toHaveBeenCalledWith('wallet-new-wallet');
      expect(mockVaultService.encryptData).toHaveBeenCalledWith(
        'wallet-new-wallet',
        encryptMnemonicDto.mnemonic,
        encryptMnemonicDto.walletId
      );
    });

    it('should handle transit key creation errors', async () => {
      // Arrange
      const encryptMnemonicDto = {
        mnemonic: 'test mnemonic',
        walletId: 'error-wallet',
      };
      const error = new Error('Vault connection failed');
      mockVaultService.createTransitKey.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.encryptMnemonic(encryptMnemonicDto)).rejects.toThrow('Vault connection failed');
      expect(mockVaultService.encryptData).not.toHaveBeenCalled();
    });
  });
});
