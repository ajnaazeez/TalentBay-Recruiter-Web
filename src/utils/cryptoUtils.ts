/**
 * AES-CTR (SIC Mode) Encryption Utility
 * 100% Interoperable with Flutter EncryptionHelper (package:encrypt with AESMode.sic and PKCS7 padding).
 * Encrypts/decrypts chat messages and lastMessage fields.
 *
 * Test Vector: "Hello World" <-> "HVdQfB473SqVTDnQrbJICg=="
 */

const KEY_STRING = 'TalentBaySecureMessagingKey2024!'; // 32 bytes (AES-256)
const IV_STRING = 'TalentBayIV2024!'; // 16 bytes IV / counter

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cryptoKeyPromise: Promise<CryptoKey> | null = null;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  throw new Error('SubtleCrypto is not available in this environment.');
}

function getCryptoKey(): Promise<CryptoKey> {
  if (!cryptoKeyPromise) {
    const keyBytes = encoder.encode(KEY_STRING);
    const subtle = getSubtleCrypto();
    cryptoKeyPromise = subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CTR' },
      false,
      ['encrypt', 'decrypt']
    );
  }
  return cryptoKeyPromise;
}

function getIv(): Uint8Array {
  return encoder.encode(IV_STRING);
}

function pkcs7Pad(bytes: Uint8Array): Uint8Array {
  const padLen = 16 - (bytes.length % 16);
  const padded = new Uint8Array(bytes.length + padLen);
  padded.set(bytes);
  padded.fill(padLen, bytes.length);
  return padded;
}

function pkcs7Unpad(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 0) return bytes;
  const padLen = bytes[bytes.length - 1];
  if (padLen >= 1 && padLen <= 16 && padLen <= bytes.length) {
    return bytes.subarray(0, bytes.length - padLen);
  }
  return bytes;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function isReadableText(str: string): boolean {
  if (!str) return false;
  let printable = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) {
      printable++;
    }
  }
  return printable / str.length >= 0.85;
}

export const cryptoUtils = {
  /**
   * Encrypts plain text string to Base64-encoded AES-CTR (PKCS7 padded) ciphertext.
   */
  async encrypt(plainText: string): Promise<string> {
    if (!plainText) return '';
    try {
      const key = await getCryptoKey();
      const iv = getIv();
      const subtle = getSubtleCrypto();
      const plainBytes = encoder.encode(plainText);
      const paddedBytes = pkcs7Pad(plainBytes);

      const encryptedBuffer = await subtle.encrypt(
        { name: 'AES-CTR', counter: iv, length: 128 },
        key,
        paddedBytes
      );
      return bufferToBase64(encryptedBuffer);
    } catch {
      return plainText;
    }
  },

  /**
   * Decrypts Base64-encoded AES-CTR (PKCS7 padded) ciphertext to plain text string.
   */
  async decrypt(cipherText: string): Promise<string> {
    if (!cipherText || typeof cipherText !== 'string') return '';
    const trimmed = cipherText.trim();
    if (!trimmed) return '';

    // Check if format is plausible Base64 string of at least 1 block (16 bytes = 24 base64 chars with padding)
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length % 4 === 0 && trimmed.length >= 16;
    if (!isBase64) {
      return cipherText;
    }

    try {
      const key = await getCryptoKey();
      const iv = getIv();
      const buffer = base64ToBuffer(trimmed);
      const subtle = getSubtleCrypto();
      const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-CTR', counter: iv, length: 128 },
        key,
        buffer
      );
      const unpadded = pkcs7Unpad(new Uint8Array(decryptedBuffer));
      const decryptedText = decoder.decode(unpadded);
      if (isReadableText(decryptedText)) {
        return decryptedText;
      }
      return cipherText;
    } catch {
      return cipherText;
    }
  },
};
