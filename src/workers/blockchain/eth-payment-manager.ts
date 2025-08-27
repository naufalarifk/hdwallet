import { decodeEventLog, encodeEventTopics, isHex, parseAbi } from 'viem';
import { fetchRpcUrl } from './eth-rpc';
import type { Address, Hex, PublicClient } from 'viem'
import { unknownErrorToString } from 'src/utils/error';

export const paymentManagerAbi = parseAbi([
  'error UnauthorizedError(address expected, address actual)',
  'error InvalidVaultAddressError(address paymentAddress)',
  'error InvalidAmountError(uint256 amount)',
  'error DepositTransferFailedError(address token, address from, address to, uint256 amount)',
  'error CollectTransferFailedError(address token, address from, address to, uint256 amount)',
  'error TokenTransferFailedError(address token, address from, address to, uint256 amount)',
  'error UnsupportedMethodError()',
  'event Deposited(address indexed user, uint256 amount, address token, address paymentAddress)',
  'function transferOwnership(address newOwner) external',
  'function claimOwnership() external',
  'function deposit() external payable',
  'function depositToken(address token, uint256 amount) external',
  'function setVaultAddress(address newVaultAddress) external',
  'function getVaultAddress() external view returns (address)',
  'function emergencyWithdrawal() external',
  'function emergencyTokenWithdrawal(address token) external',
]);





type EvmPaymentManagerDepositedEvent = {
    blockchainKey: string;
    transactionHash: `0x${string}`;
    eventName: "Deposited";
    args: {
        user: `0x${string}`;
        amount: bigint;
        token: `0x${string}`;
        paymentAddress: `0x${string}`;
    };
}

type GetEthPaymentManagerDepositedEventsArgs = {
    client: PublicClient;
    paymentManagerAddress: Address;
    fromBlock: bigint;
    toBlock: bigint;
};

export async function getEthPaymentManagerDepositedEvents(
  {client,
  paymentManagerAddress,
  fromBlock,
  toBlock}: GetEthPaymentManagerDepositedEventsArgs
) {


  const topic = encodeEventTopics({
    abi: paymentManagerAbi,
    eventName: 'Deposited',
  });

  const logs = await fetchRpcUrl({
    client,
    optionalReqId: undefined,
    method: 'eth_getLogs',
    params: [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      address: paymentManagerAddress,
      topics: [topic],
    }]
  });

  if (typeof logs !== 'object' || logs === null) {
    throw new Error(`Expect logs to be an object, got ${unknownErrorToString(logs)}`);
  }
  if (!('result' in logs)) {
    throw new Error(`Expect logs to have result, got ${unknownErrorToString(logs)}`);
  }
  if (!Array.isArray(logs.result)) {
    throw new Error(`Expect logs.result to be an array, got ${unknownErrorToString(logs.result)}`);
  }

  const events = logs.result.map(
    /** @param {unknown} log */
    function (log) {
      if (typeof log !== 'object' || log === null) {
        throw new Error(`Expect log to be an object, got ${unknownErrorToString(log)}`);
      }
      if (!('transactionHash' in log)) {
        throw new Error(`Expect log to have transactionHash, got ${unknownErrorToString(log)}`);
      }
      if (!isHex(log.transactionHash)) {
        throw new Error(`Expect log.transactionHash to be a string, got ${unknownErrorToString(log.transactionHash)}`);
      }
      if (!('topics' in log)) {
        throw new Error(`Expect log to have topics, got ${unknownErrorToString(log)}`);
      }
      if (!Array.isArray(log.topics)) {
        throw new Error(`Expect log.topics to be an array, got ${unknownErrorToString(log.topics)}`);
      }
      if (log.topics.length === 0) {
        throw new Error(`Expect log.topics to have at least one element, got ${unknownErrorToString(log.topics)}`);
      }
      const signature = log.topics[0];
      if (!isHex(signature)) {
        throw new Error(`Expect log.topics[0] to be a string, got ${unknownErrorToString(signature)}`);
      }
      const topics: [signature: `0x${string}`, ...args: any[]] = [signature];
      for (const topic of log.topics.slice(1)) {
        if (!isHex(topic)) {
          throw new Error(`Expect log.topics to be a string, got ${unknownErrorToString(topic)}`);
        }
        topics.push(topic);
      }
      if (!('data' in log)) {
        throw new Error(`Expect log to have data, got ${unknownErrorToString(log)}`);
      }
      if (!isHex(log.data)) {
        throw new Error(`Expect log.data to be a string, got ${unknownErrorToString(log.data)}`);
      }
      const decodedEventLog = decodeEventLog({
        abi: paymentManagerAbi,
        eventName: 'Deposited',
        topics,
        data: log.data,
      });
      return {
        transactionHash: log.transactionHash,
        ...decodedEventLog,
      };
    },
  );

  return events;
}