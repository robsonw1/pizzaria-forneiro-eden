/// <reference lib="deno.window" />

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

declare const crypto: {
  subtle: {
    importKey(
      format: string,
      keyData: BufferSource,
      algorithm: {
        name: string;
        hash: string;
      },
      extractable: boolean,
      keyUsages: string[]
    ): Promise<CryptoKey>;
    sign(
      algorithm: string | AlgorithmIdentifier,
      key: CryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer>;
  };
};

interface CryptoKey {
  algorithm: any;
  extractable: boolean;
  type: string;
  usages: string[];
}

interface AlgorithmIdentifier {
  name: string;
}

type BufferSource = ArrayBuffer | ArrayBufferView;
