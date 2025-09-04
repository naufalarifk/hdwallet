export abstract class ICryptographyService {
  abstract encrypt(path: string, data: Uint8Array): Promise<Uint8Array>;
  abstract decrypt(path: string, data: Uint8Array): Promise<Uint8Array>;
  abstract getPlatformPrivateKey(): Promise<Uint8Array>;
  abstract setPlatformPrivateKey(key: Uint8Array): Promise<void>;
}

export class CryptographyError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CryptographyError';
  }
}
