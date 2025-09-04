import { Injectable } from '@nestjs/common';
import { DiscoveryService, ModuleRef } from '@nestjs/core';

import { BtcWalletService } from './btc-wallet.service';
import { EthWalletService } from './eth-wallet.service';
import { SolWalletService } from './sol-wallet.service';

export const FeatureFlag = DiscoveryService.createDecorator();

// Union type for wallet services
type WalletService = BtcWalletService | EthWalletService | SolWalletService;

@Injectable()
export class WalletInstanceService {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  // Method overloads for specific return types based on derivedPath
  getProvider(derivedPath: 'btc'): BtcWalletService;
  getProvider(derivedPath: 'eth'): EthWalletService;
  getProvider(derivedPath: 'sol'): SolWalletService;
  getProvider(derivedPath: 'btc' | 'eth' | 'sol'): WalletService {
    const [provider] = this.discoveryService
      .getProviders()
      .filter(
        item => this.discoveryService.getMetadataByDecorator(FeatureFlag, item) === derivedPath,
      );

    if (!provider) {
      throw new Error(`No provider found for derivedPath: ${derivedPath}`);
    }

    const ServiceClass = provider.token;
    const serviceInstance = this.moduleRef.get(ServiceClass, { strict: false });

    console.log('Service Token:', ServiceClass);
    console.log('Service Instance:', serviceInstance);
    console.log('Service Constructor:', serviceInstance?.constructor?.name);

    return serviceInstance;
  }
}
