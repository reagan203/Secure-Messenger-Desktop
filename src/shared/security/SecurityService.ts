/**
 * SecurityService — encryption interface for sensitive data at rest.
 *
 * PRODUCTION IMPLEMENTATION NOTES:
 * Replace MockSecurityService with a real implementation that uses:
 *   - Node.js `crypto.createCipheriv` / `crypto.createDecipheriv` with AES-256-GCM
 *   - A key derived from a user passphrase via `crypto.scryptSync` or PBKDF2
 *   - A unique IV per encryption call, prepended to the ciphertext
 *   - An auth tag appended for integrity verification
 *
 * The interface is intentionally simple so the swap is a single-file change.
 * All consumers reference ISecurityService, never the concrete class.
 */

export interface ISecurityService {
  /** Encrypt plaintext. Returns a string safe for storage. */
  encrypt(text: string): string;

  /** Decrypt a previously encrypted string back to plaintext. */
  decrypt(encrypted: string): string;

  /**
   * Scrub a string from memory by overwriting its reference.
   * In JS this is best-effort since strings are immutable and GC-managed.
   * A real implementation could use Buffer and zero-fill.
   */
  scrub(sensitive: string): void;
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
let devWarningShown = false;

/**
 * Mock implementation — passes data through without transformation.
 * Logs a one-time warning in development to remind developers this is not real encryption.
 *
 * PRODUCTION: Replace this class with an AES-256-GCM implementation.
 * See the interface documentation above for guidance.
 */
export class MockSecurityService implements ISecurityService {
  encrypt(text: string): string {
    if (isDev && !devWarningShown) {
      devWarningShown = true;
      console.warn(
        '[SecurityService] Using mock encryption — data is NOT encrypted. ' +
        'Replace MockSecurityService with a real implementation before shipping.',
      );
    }
    // PRODUCTION: return aes256gcmEncrypt(text, this.key);
    return text;
  }

  decrypt(encrypted: string): string {
    // PRODUCTION: return aes256gcmDecrypt(encrypted, this.key);
    return encrypted;
  }

  scrub(_sensitive: string): void {
    // Best-effort in JS. A real implementation would use a Buffer
    // and call buffer.fill(0) to overwrite the memory.
    // In V8, string primitives are immutable and will be GC'd.
  }
}

// Singleton instance — swap this to change the implementation application-wide
let instance: ISecurityService | null = null;

export function getSecurityService(): ISecurityService {
  if (!instance) {
    instance = new MockSecurityService();
  }
  return instance;
}

/**
 * Replace the global SecurityService instance.
 * Call this at startup before any data access if providing a real implementation.
 */
export function setSecurityService(service: ISecurityService): void {
  instance = service;
}
