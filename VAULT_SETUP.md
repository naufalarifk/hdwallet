# HashiCorp Vault Integration Setup Guide

This guide will help you set up and configure HashiCorp Vault integration with your NestJS HD Wallet application.

## 📋 Prerequisites

- HashiCorp Vault server (local or remote)
- NestJS application with the Vault module
- Environment variables configured

## 🚀 Quick Start

### 1. Install HashiCorp Vault

#### macOS (using Homebrew)
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/vault
```

#### Linux/Ubuntu
```bash
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault
```

### 2. Start Vault in Development Mode

```bash
# Start Vault server in dev mode (for testing only)
vault server -dev

# In another terminal, set environment variables
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN="your-root-token-from-server-output"
```

### 3. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Copy from example
cp .env.example .env

# Edit the .env file with your Vault configuration
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=hvs.your-vault-token-here
```

### 4. Set Up Vault Policies and Authentication

```bash
# Enable KV v2 secrets engine
vault secrets enable -version=2 kv

# Enable Transit secrets engine for encryption
vault secrets enable transit

# Enable AppRole authentication
vault auth enable approle

# Create a policy for wallet operations
vault policy write wallet-policy - <<EOF
# Allow full access to wallet secrets
path "secret/data/wallets/*" {
  capabilities = ["create", "read", "update", "delete"]
}

# Allow encryption/decryption for wallet keys
path "transit/encrypt/wallet-*" {
  capabilities = ["update"]
}

path "transit/decrypt/wallet-*" {
  capabilities = ["update"]
}

# Allow key creation for wallets
path "transit/keys/wallet-*" {
  capabilities = ["create", "update"]
}

# Allow reading key metadata
path "transit/keys/wallet-*" {
  capabilities = ["read"]
}
EOF

# Create AppRole for the application
vault write auth/approle/role/hdwallet-app \
    token_policies="wallet-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    bind_secret_id=true

# Get Role ID
vault read auth/approle/role/hdwallet-app/role-id

# Generate Secret ID
vault write -f auth/approle/role/hdwallet-app/secret-id
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VAULT_ADDR` | Vault server address | `http://127.0.0.1:8200` | Yes |
| `VAULT_TOKEN` | Vault token for authentication | - | No* |
| `VAULT_ROLE_ID` | AppRole Role ID | - | No* |
| `VAULT_SECRET_ID` | AppRole Secret ID | - | No* |

*Either `VAULT_TOKEN` or both `VAULT_ROLE_ID` and `VAULT_SECRET_ID` must be provided.

## 🧪 Testing the Integration

### 1. Start Your Application
```bash
pnpm run start:dev
```

### 2. Run the Test Script
```bash
./test-vault.sh
```

### 3. Manual Testing

#### Health Check
```bash
curl http://localhost:3000/vault/health
```

#### Store a Secret
```bash
curl -X POST http://localhost:3000/vault/kv2/write \
  -H "Content-Type: application/json" \
  -d '{
    "path": "myapp/config",
    "data": {
      "database_url": "postgresql://user:pass@localhost:5432/db",
      "api_key": "secret-key"
    }
  }'
```

#### Retrieve a Secret
```bash
curl http://localhost:3000/vault/kv2/myapp/config
```

#### Encrypt Data
```bash
# First create an encryption key
curl -X POST http://localhost:3000/vault/transit/key \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "my-encryption-key",
    "keyType": "aes256-gcm96"
  }'

# Then encrypt data
curl -X POST http://localhost:3000/vault/transit/encrypt/my-encryption-key \
  -H "Content-Type: application/json" \
  -d '{
    "data": "sensitive information"
  }'
```

## 🏗️ Production Configuration

### 1. Use Vault in Production Mode

```bash
# Create configuration file
cat > vault.hcl <<EOF
storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

api_addr = "http://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"
ui = true
EOF

# Start Vault
vault server -config=vault.hcl
```

### 2. Initialize and Unseal Vault

```bash
# Initialize (run only once)
vault operator init

# Unseal (run after each restart)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

### 3. Enable Auto-unseal (Recommended)

Configure auto-unseal using cloud KMS services:

```hcl
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "your-kms-key-id"
}
```

## 🔒 Security Best Practices

1. **Never use development mode in production**
2. **Use TLS/SSL for all communications**
3. **Implement proper secret rotation**
4. **Use least-privilege policies**
5. **Monitor and audit all Vault operations**
6. **Use auto-unseal in production**
7. **Regularly backup Vault data**

## 🛠️ Available Endpoints

### Health & Status
- `GET /vault/health` - Vault health status
- `GET /vault/status` - Service status

### KV v2 Secrets
- `GET /vault/kv2/:path` - Read secret
- `POST /vault/kv2/write` - Write secret

### Transit Encryption
- `POST /vault/transit/key` - Create encryption key
- `POST /vault/transit/encrypt/:keyName` - Encrypt data
- `POST /vault/transit/decrypt/:keyName` - Decrypt data

### Database Dynamic Secrets
- `POST /vault/database/credentials` - Get database credentials

### Policy Management
- `POST /vault/policy` - Create policy
- `GET /vault/policy/:name` - Read policy
- `DELETE /vault/policy/:name` - Delete policy

### Token Management
- `POST /vault/token/create` - Create token
- `POST /vault/token/revoke` - Revoke token

### Wallet-Specific Operations
- `POST /vault/wallet/encrypt-mnemonic` - Encrypt wallet mnemonic
- `POST /vault/wallet/decrypt-mnemonic` - Decrypt wallet mnemonic
- `POST /vault/wallet/store-config` - Store wallet configuration
- `GET /vault/wallet/:walletId/config` - Get wallet configuration

## 🐛 Troubleshooting

### Common Issues

1. **Connection refused**
   - Ensure Vault is running
   - Check VAULT_ADDR configuration

2. **Permission denied**
   - Verify token has required policies
   - Check policy configuration

3. **Sealed vault**
   - Unseal the vault using unseal keys

4. **Token expired**
   - Renew token or authenticate again

### Debug Mode

Set debug logging in your `.env`:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

## 📚 Additional Resources

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault API Documentation](https://www.vaultproject.io/api-docs)
- [Production Hardening](https://learn.hashicorp.com/tutorials/vault/production-hardening)
