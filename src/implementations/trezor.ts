import { ethereumGetAddress, getPublicKey, manifest } from 'trezor-connect';
import { TREZOR_MANIFEST_EMAIL, TREZOR_MANIFEST_URL } from '../constants';
import { DEFAULT_ETH, DerivationPath, getFullPath, TREZOR_DERIVATION_PATHS } from '../derivation-paths';
import { HardwareWallet, KeyInfo } from '../hardware-wallet';

export class Trezor extends HardwareWallet {
  private cache: Record<string, KeyInfo> = {};

  async connect(): Promise<void> {
    this.cache = {};

    manifest({
      email: TREZOR_MANIFEST_EMAIL,
      appUrl: TREZOR_MANIFEST_URL
    });

    // Fetch a random address to ensure the connection works
    await this.getAddress(DEFAULT_ETH, 50);
  }

  async prefetch(derivationPaths: DerivationPath[]): Promise<Record<string, KeyInfo>> {
    const bundle = derivationPaths.filter(path => !path.isHardened).map(path => ({ path: path.prefix }));

    const response = await getPublicKey({ bundle });
    for (const { serializedPath, chainCode, publicKey } of response.payload) {
      this.cache[serializedPath] = { chainCode, publicKey };
    }

    return this.cache;
  }

  getDerivationPaths(): DerivationPath[] {
    return TREZOR_DERIVATION_PATHS;
  }

  protected async getKeyInfo(derivationPath: DerivationPath): Promise<KeyInfo> {
    if (this.cache[derivationPath.prefix]) {
      return this.cache[derivationPath.prefix];
    }

    const response = await getPublicKey({ path: derivationPath.prefix });

    return {
      publicKey: response.payload.publicKey,
      chainCode: response.payload.chainCode
    };
  }

  protected async getHardenedAddress(derivationPath: DerivationPath, index: number): Promise<string> {
    const response = await ethereumGetAddress({ path: getFullPath(derivationPath, index) });

    return response.payload.address;
  }
}
