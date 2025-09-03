# How to Use getProvider() Method

The `getProvider()` method now returns a usable service instance that you can call methods on.

## Usage Examples:

### 1. **Basic Usage**
```typescript
// In a controller or another service
constructor(private walletInstanceService: WalletInstanceService) {}

async someMethod() {
  // Get Bitcoin wallet service
  const btcService = this.walletInstanceService.getProvider('btc');
  
  // Now you can use all methods from BtcWalletService
  const wallet = await btcService.generateBitcoinWallet(mnemonic);
  const balance = await btcService.getBitcoinBalance(address);
  
  // Get Ethereum wallet service  
  const ethService = this.walletInstanceService.getProvider('eth');
  
  // Use Ethereum methods
  const ethWallet = await ethService.generateEthereumWallet(mnemonic);
  const ethBalance = await ethService.getEthereumBalance(address);
}
```

### 2. **Type-Safe Usage with Method Chaining**
```typescript
async generateWallets() {
  const mnemonic = 'your mnemonic here...';
  
  // Bitcoin
  const btcWallet = await this.walletInstanceService
    .getProvider('btc')
    .generateBitcoinWallet(mnemonic);
    
  // Ethereum  
  const ethWallet = await this.walletInstanceService
    .getProvider('eth')
    .generateEthereumWallet(mnemonic);
    
  // Solana
  const solWallet = await this.walletInstanceService
    .getProvider('sol')
    .generateSolanaWallet(mnemonic);
    
  return { btcWallet, ethWallet, solWallet };
}
```

### 3. **Dynamic Provider Selection**
```typescript
async getWalletBalance(blockchain: 'btc' | 'eth' | 'sol', address: string) {
  const service = this.walletInstanceService.getProvider(blockchain);
  
  switch (blockchain) {
    case 'btc':
      return await service.getBitcoinBalance(address);
    case 'eth': 
      return await service.getEthereumBalance(address);
    case 'sol':
      return await service.getSolanaBalance(address);
    default:
      throw new Error(`Unsupported blockchain: ${blockchain}`);
  }
}
```

### 4. **Error Handling**
```typescript
async safeGetProvider(derivedPath: 'btc' | 'eth' | 'sol') {
  try {
    const service = this.walletInstanceService.getProvider(derivedPath);
    console.log(`Successfully got ${derivedPath} service:`, service.constructor.name);
    return service;
  } catch (error) {
    console.error(`Failed to get provider for ${derivedPath}:`, error.message);
    throw error;
  }
}
```

## Benefits:

✅ **Type Safety**: Full IntelliSense support and compile-time type checking  
✅ **Method Access**: Direct access to all service methods  
✅ **Runtime Safety**: Proper error handling if service not found  
✅ **Flexibility**: Dynamic provider selection based on blockchain type  
✅ **Testability**: Easy to mock and test individual services  

## Available Methods per Service:

### BtcWalletService:
- `generateBitcoinWallet(mnemonic: string)`
- `getBitcoinBalance(address: string)` 
- `signBitcoinTransaction(...)`
- `broadcastTransaction(...)`

### EthWalletService:
- `generateEthereumWallet(mnemonic: string)`
- `getEthereumBalance(address: string)`
- `signEthereumTransaction(...)`
- `estimateGas(...)`

### SolWalletService:
- `generateSolanaWallet(mnemonic: string)`
- `getSolanaBalance(address: string)`
- `signSolanaTransaction(...)`
- `confirmTransaction(...)`
