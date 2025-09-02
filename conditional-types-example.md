// Example demonstrating the conditional return types working

class ExampleUsage {
  constructor(private walletInstanceService: WalletInstanceService) {}

  async testConditionalReturnTypes() {
    // ✅ TypeScript knows this returns BtcWalletService
    const btcService = this.walletInstanceService.getProvider('btc');
    // btcService is now typed as BtcWalletService
    // You get IntelliSense for BtcWalletService methods

    // ✅ TypeScript knows this returns EthWalletService
    const ethService = this.walletInstanceService.getProvider('eth');
    // ethService is now typed as EthWalletService
    // You get IntelliSense for EthWalletService methods

    // ✅ TypeScript knows this returns SolWalletService
    const solService = this.walletInstanceService.getProvider('sol');
    // solService is now typed as SolWalletService
    // You get IntelliSense for SolWalletService methods

    // The return type is now conditional based on the derivedPath parameter!
    console.log('BTC Service:', btcService.constructor.name); // BtcWalletService
    console.log('ETH Service:', ethService.constructor.name); // EthWalletService
    console.log('SOL Service:', solService.constructor.name); // SolWalletService
  }

  // Dynamic usage with proper typing
  async getDynamicService<T extends 'btc' | 'eth' | 'sol'>(blockchain: T) {
    const service = this.walletInstanceService.getProvider(blockchain);
    // service is typed as the correct service type based on blockchain parameter
    return service;
  }
}
