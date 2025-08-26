import { Injectable, Inject } from '@nestjs/common';
import { fetchRpcUrl } from './blockchain/eth-rpc';
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

  async getBlockByNumber(blockNumber: bigint | 'latest' = 'latest') {
    try {
      const block = await this.client.getBlock({
        blockNumber: blockNumber === 'latest' ? undefined : blockNumber,
      });
      return block;
    } catch (error) {
      console.error('Error fetching block:', error);
      throw new Error('Failed to fetch block data');
    }
  }

  async getBalance(address: Address) {
    try {
      const balance = await this.client.getBalance({ address });
      return balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw new Error('Failed to fetch balance');
    }
  }

  async getTransactionReceipt(hash: Hash) {
    try {
      const receipt = await this.client.getTransactionReceipt({ hash });
      return receipt;
    } catch (error) {
      console.error('Error fetching transaction receipt:', error);
      throw new Error('Failed to fetch transaction receipt');
    }
  }
}