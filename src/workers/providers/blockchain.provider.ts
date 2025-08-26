import { Provider } from '@nestjs/common';
import { createPublicClient, http, PublicClient } from 'viem';
import { mainnet, sepolia, polygonMumbai } from 'viem/chains';

export const BLOCKCHAIN_CLIENT = 'BLOCKCHAIN_CLIENT';

export const blockchainClientProvider: Provider = {
  provide: BLOCKCHAIN_CLIENT,
  useFactory: (): PublicClient => {
    const rpcUrl = process.env.RPC_URL || 'https://eth.llamarpc.com';
    const chain = process.env.CHAIN === 'sepolia' ? sepolia : 
                  process.env.CHAIN === 'mumbai' ? polygonMumbai : mainnet;
    
    return createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  },
};