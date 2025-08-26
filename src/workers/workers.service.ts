import { Injectable, Inject } from '@nestjs/common';
import { fetchRpcUrl, getBlockNumber } from './blockchain/eth-rpc';
import type { PublicClient, Hash, Hex, Address, TransactionRequest } from 'viem';
import { BLOCKCHAIN_CLIENT } from './providers/blockchain.provider';

@Injectable()
export class WorkersService {
  constructor(
    @Inject(BLOCKCHAIN_CLIENT)
    private readonly client: PublicClient

  ) {}

  async fetchRpcData() {
    try {
      const data = await fetchRpcUrl({
        client: this.client,
        optionalReqId: undefined,
        method: 'eth_blockNumber',
        params: []
      });
      return data;
    } catch (error) {
      console.error('Error fetching RPC data:', error);
      throw new Error('Failed to fetch blockchain data');
    }
  }


  async getBlockNumber(): Promise<bigint> {
    try {
      const blockNumber = await getBlockNumber({
        client: this.client
      });
      return blockNumber;
    } catch (error) {
      console.error('Error fetching block number:', error);
      throw new Error('Failed to fetch block number');
    }
  }


  


}