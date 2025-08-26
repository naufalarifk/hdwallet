import { randomUUID } from 'node:crypto';

import { encodeFunctionData, isAddress, isHash, parseAbi } from 'viem';

import type { PublicClient, Hash, Hex, Address, TransactionRequest, Block, Transaction, TransactionReceipt } from 'viem';


let rpcUrlRoundRobin = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);

const limitedRpcUrlMap = new Map<string, { limitUntil: number; }>();


type RpcUrlFetchProps = {
    client: PublicClient,
    optionalReqId?: number | string | undefined,
    method: string,
    params: unknown[],
}


export async function fetchRpcUrl(params: RpcUrlFetchProps) {
    const { client, method, params: rpcParams, optionalReqId } = params;


    const reqId = optionalReqId ?? randomUUID();
    const nowTime = Date.now();


    const allRpcUrls = client.chain?.rpcUrls.default.http ?? [];
    const rpcUrl = allRpcUrls[rpcUrlRoundRobin % allRpcUrls.length];
    rpcUrlRoundRobin++;

    if (limitedRpcUrlMap.has(rpcUrl)) {
        const { limitUntil } = limitedRpcUrlMap.get(rpcUrl)!;
        if (nowTime < limitUntil) {
            throw new Error(`RPC URL ${rpcUrl} is rate limited`);
        }
    }

    try {
        const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: reqId,
                jsonrpc: '2.0',
                method,
                params: rpcParams,
            }),
        });
        const resBody = await res.json();

        if (resBody?.error !== undefined) {
            // console.debug('ethRpc:res:err', rpcUrl, method, resBody);

            throw new Error(JSON.stringify(resBody.error));
        }

        // console.debug('ethRpc:res', rpcUrl, method, resBody);

        return resBody;
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error fetching RPC URL ${rpcUrl}: ${error.message}`);
        }
                limitedRpcUrlMap.set(rpcUrl, {
            limitUntil: Date.now() + 1000 * 60 * 5, // 5 minutes
                });
        
        return await fetchRpcUrl({
            client,
            method,
            params: rpcParams,
            optionalReqId: reqId,
        });
    }
    
}

type EthBlockNumberProps = {
    client: PublicClient
}

export async function getBlockNumber(params: EthBlockNumberProps): Promise<bigint> {
    const reqId = randomUUID();
    const { client } = params;
    const res = await fetchRpcUrl({
        client,
        method: 'eth_blockNumber',
        params: [],
        optionalReqId: reqId,
    });


  if (typeof res !== 'object' || res === null) {
    throw new Error(`expected object, got ${res}`);
  }

  if (!('result' in res) || typeof res?.result !== 'string' || !res.result.startsWith('0x')) {
    throw new Error(`expected hex string, got ${JSON.stringify(res)}`);
  }

    return BigInt(res.result);
}

type EthCallProps = {
    client: PublicClient,
    transaction: TransactionRequest,
}


export async function ethCall({ client, transaction }: EthCallProps): Promise<Hex> {
    const reqId = randomUUID();
    const resBody = await fetchRpcUrl({
        client,
        method: 'eth_call',
        params: [transaction, 'latest'],
        optionalReqId: reqId,
      });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
    throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
  }

  return resBody.result;
    
}


type EthGasPriceProps = {
    client: PublicClient
}


export async function ethGasPrice({ client }: EthGasPriceProps): Promise<bigint> {
  const reqId = randomUUID().toUpperCase();

  const resBody = await fetchRpcUrl({
      client,
      method: 'eth_gasPrice',
      params: [],
      optionalReqId: reqId,
  });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
    throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
  }

  return BigInt(resBody.result);
}


type EthGetBlockByNumberProps = {
    client: PublicClient,
    blockNumber: bigint,
    includeTransactions?: boolean
}

export async function ethGetBlockByNumber({ client, blockNumber, includeTransactions = false }: EthGetBlockByNumberProps): Promise<Block> {
  const reqId = randomUUID().toUpperCase();

  const resBody = await fetchRpcUrl({
      client,
      method: 'eth_getBlockByNumber',
      params: [`0x${blockNumber.toString(16)}`, includeTransactions],
      optionalReqId: reqId,
  });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'object' || resBody.result === null) {
    throw new Error(`expect object, got ${JSON.stringify(resBody)}`);
  }

  return resBody.result;
}

type EthGetTransactionCountProps = {
    client: PublicClient
    address: Address
    blockTag: string
}

export async function ethGetTransactionCount({ client, address, blockTag = 'latest' }: EthGetTransactionCountProps): Promise<bigint> {
  const reqId = randomUUID().toUpperCase();

  const resBody = await fetchRpcUrl({
      client,
      method: 'eth_getTransactionCount',
      params: [address, blockTag],
      optionalReqId: reqId,
  });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
    throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
  }

  return BigInt(resBody.result);
}

type EthGetTransactionByHashProps = {
    client: PublicClient,
    hash: Hash
}

export async function ethGetTransactionByHash({ client, hash }: EthGetTransactionByHashProps): Promise<Transaction<Hex>> {
    const reqId = randomUUID().toUpperCase();

  const resBody = await fetchRpcUrl({
      client,
      method: 'eth_getTransactionByHash',
      params: [hash],
      optionalReqId: reqId,
  });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'object' || resBody.result === null) {
    throw new Error(`expect object, got ${JSON.stringify(resBody)}`);
  }

  return resBody.result;
}

type EthGetTransactionReceiptProps = {
    client: PublicClient,
    hash: Hash
}

export async function ethGetTransactionReceipt({ client, hash }: EthGetTransactionReceiptProps): Promise<TransactionReceipt> {
  const reqId = randomUUID().toUpperCase();

  const resBody = await fetchRpcUrl({
      client,
      method: 'eth_getTransactionReceipt',
      params: [hash],
      optionalReqId: reqId,
  });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'object' || resBody.result === null) {
    throw new Error(`expect object, got ${JSON.stringify(resBody)}`);
  }

  if (!('logs' in resBody.result) || !Array.isArray(resBody.result.logs)) {
    throw new Error(`expect logs to be an array, got ${JSON.stringify(resBody)}`);
  }

  return resBody.result;
}

type EthEstimateGasProps = {
    client: PublicClient,
    transaction: TransactionRequest
}

export async function ethEstimateGas({ client, transaction }: EthEstimateGasProps) {
  const reqId = randomUUID().toUpperCase();

  const resBody = await fetchRpcUrl({
      client,
      method: 'eth_estimateGas',
      params: [transaction],
      optionalReqId: reqId,
  });

  if (typeof resBody !== 'object' || resBody === null) {
    throw new Error(`expect object, got ${resBody}`);
  }

  if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
    throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
  }

  return BigInt(resBody.result);
}

type EthSendRawTransactionProps = {
    client: PublicClient,
    serializedTransaction: Hex
}

export async function ethSendRawTransaction({ client, serializedTransaction }: EthSendRawTransactionProps): Promise<Hash> {
  const rpcUrls = client.chain?.rpcUrls.default.http ?? [];

  const { hashes, errors } = await Promise
    .allSettled(rpcUrls.map(async function (rpcUrl) {

      const reqId = randomUUID().toUpperCase();

      const reqBody = JSON.stringify({
        id: reqId,
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [serializedTransaction],
      });

      console.info('SendRawTransaction', rpcUrl, reqBody);

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: reqBody,
      });

      const resBody = await res.json();

      if (resBody.error !== undefined) {
        throw new Error(JSON.stringify(resBody.error));
      }

      if (typeof resBody !== 'object' || resBody === null) {
        throw new Error(`expect object, got ${resBody}`);
      }

      if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
        throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
      }

      const txHash = resBody.result;

      if (!isHash(txHash)) {
        throw new Error(`invalid transaction hash: ${JSON.stringify({ txHash })}`);
      }

      console.info('RawTransactionSent', rpcUrl, txHash);

      return txHash;
    }))
    .then(function (results) {
      return {
        hashes: results.filter((result) => result.status === 'fulfilled').map((result) => result.value),
        errors: results.filter((result) => result.status === 'rejected').map((result) => result.reason),
      };
    });

  if (hashes.length === 0) {
    throw new Error(`Failed to send transaction: ${errors.join(', ')}`);
  }

  return hashes[0];
}

type EthGetNativeOrERC20BalanceProps = {
  client: PublicClient,
  tokenAddress: '0x' | Address,
  address: Address
}

export async function ethGetNativeOrERC20Balance({ client, tokenAddress, address }: EthGetNativeOrERC20BalanceProps): Promise<bigint> {
  const optionalReqId = randomUUID().toUpperCase();

  if (tokenAddress === '0x') {
    const resBody = await fetchRpcUrl({ client, optionalReqId, method: 'eth_getBalance', params: [address, 'latest'] });

    if (typeof resBody !== 'object' || resBody === null) {
      throw new Error(`expect object, got ${resBody}`);
    }

    if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
      throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
    }

    return BigInt(resBody.result);
  }
  else if (isAddress(tokenAddress)) {
      const resBody = await fetchRpcUrl({
          client, optionalReqId, method: 'eth_call', params: [{
              to: tokenAddress,
              data: encodeFunctionData({
                  abi: parseAbi([
                      'function balanceOf(address) public view returns (uint256)',
                  ]),
                  functionName: 'balanceOf',
                  args: [address],
              }),
          }, 'latest']
      });

    if (typeof resBody !== 'object' || resBody === null) {
      throw new Error(`expect object, got ${resBody}`);
    }

    if (!('result' in resBody) || typeof resBody?.result !== 'string' || !resBody.result.startsWith('0x')) {
      throw new Error(`expect hex string, got ${JSON.stringify(resBody)}`);
    }

    return BigInt(resBody.result);
  }
  else {
    throw new Error(`expect token address to be '0x' or an address, got ${tokenAddress as string}`);
  }
}