import { WalletInstanceService } from './wallet-instance.service';

const _btcService = WalletInstanceService.prototype.getProvider('btc');
const _solService = WalletInstanceService.prototype.getProvider('sol');
const _ethService = WalletInstanceService.prototype.getProvider('eth');
