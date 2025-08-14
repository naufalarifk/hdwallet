#!/bin/bash

# HashiCorp Vault Integration Testing Script
# This script tests all vault endpoints

BASE_URL="http://localhost:3000/vault"

echo "🔒 HashiCorp Vault Integration Testing"
echo "====================================="

# Health Check
echo -e "\n1. Testing Vault Health Check..."
curl -s -X GET "$BASE_URL/health" | jq . || echo "Health check failed"

# Status Check
echo -e "\n2. Testing Vault Status..."
curl -s -X GET "$BASE_URL/status" | jq . || echo "Status check failed"

# Test KV v2 Secret Operations
echo -e "\n3. Testing KV v2 Secret Write..."
curl -s -X POST "$BASE_URL/kv2/write" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "test-app/config",
    "data": {
      "database_url": "postgresql://user:pass@localhost:5432/testdb",
      "api_key": "test-api-key-12345",
      "debug": true
    }
  }' | jq . || echo "KV2 write failed"

echo -e "\n4. Testing KV v2 Secret Read..."
curl -s -X GET "$BASE_URL/kv2/test-app/config" | jq . || echo "KV2 read failed"

# Test Transit Encryption
echo -e "\n5. Testing Transit Key Creation..."
curl -s -X POST "$BASE_URL/transit/key" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "test-encryption-key",
    "keyType": "aes256-gcm96"
  }' | jq . || echo "Transit key creation failed"

echo -e "\n6. Testing Data Encryption..."
ENCRYPTION_RESULT=$(curl -s -X POST "$BASE_URL/transit/encrypt/test-encryption-key" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "This is sensitive data that needs encryption",
    "context": "test-context"
  }')

echo "$ENCRYPTION_RESULT" | jq .

# Extract ciphertext for decryption test
CIPHERTEXT=$(echo "$ENCRYPTION_RESULT" | jq -r '.ciphertext')

echo -e "\n7. Testing Data Decryption..."
curl -s -X POST "$BASE_URL/transit/decrypt/test-encryption-key" \
  -H "Content-Type: application/json" \
  -d "{
    \"ciphertext\": \"$CIPHERTEXT\",
    \"context\": \"test-context\"
  }" | jq . || echo "Decryption failed"

# Test Policy Management
echo -e "\n8. Testing Policy Creation..."
curl -s -X POST "$BASE_URL/policy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "wallet-policy",
    "policy": "path \"secret/data/wallets/*\" {\n  capabilities = [\"create\", \"read\", \"update\", \"delete\"]\n}\n\npath \"transit/encrypt/wallet-*\" {\n  capabilities = [\"update\"]\n}\n\npath \"transit/decrypt/wallet-*\" {\n  capabilities = [\"update\"]\n}"
  }' | jq . || echo "Policy creation failed"

echo -e "\n9. Testing Policy Read..."
curl -s -X GET "$BASE_URL/policy/wallet-policy" | jq . || echo "Policy read failed"

# Test Token Creation
echo -e "\n10. Testing Token Creation..."
curl -s -X POST "$BASE_URL/token/create" \
  -H "Content-Type: application/json" \
  -d '{
    "policies": ["wallet-policy"],
    "ttl": "1h"
  }' | jq . || echo "Token creation failed"

# Test Wallet-specific operations
echo -e "\n11. Testing Wallet Mnemonic Encryption..."
WALLET_ENCRYPTION=$(curl -s -X POST "$BASE_URL/wallet/encrypt-mnemonic" \
  -H "Content-Type: application/json" \
  -d '{
    "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "walletId": "wallet-123"
  }')

echo "$WALLET_ENCRYPTION" | jq .

# Extract ciphertext for wallet decryption test
WALLET_CIPHERTEXT=$(echo "$WALLET_ENCRYPTION" | jq -r '.ciphertext')

echo -e "\n12. Testing Wallet Mnemonic Decryption..."
curl -s -X POST "$BASE_URL/wallet/decrypt-mnemonic" \
  -H "Content-Type: application/json" \
  -d "{
    \"ciphertext\": \"$WALLET_CIPHERTEXT\",
    \"walletId\": \"wallet-123\"
  }" | jq . || echo "Wallet decryption failed"

echo -e "\n13. Testing Wallet Configuration Storage..."
curl -s -X POST "$BASE_URL/wallet/store-config" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wallet-123",
    "config": {
      "name": "My Test Wallet",
      "derivation_path": "m/44/0/0/0",
      "created_at": "2025-08-14T10:00:00Z",
      "encrypted": true
    }
  }' | jq . || echo "Wallet config storage failed"

echo -e "\n14. Testing Wallet Configuration Retrieval..."
curl -s -X GET "$BASE_URL/wallet/wallet-123/config" | jq . || echo "Wallet config retrieval failed"

echo -e "\n🎉 Testing completed!"
echo -e "\nNote: Some tests may fail if Vault is not running or not properly configured."
echo -e "Make sure Vault is running on http://127.0.0.1:8200 with appropriate policies."
