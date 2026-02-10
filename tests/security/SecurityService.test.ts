import {
  MockSecurityService,
  getSecurityService,
  setSecurityService,
  type ISecurityService,
} from '../../src/shared/security';
import { sanitizeError, redactForLog } from '../../src/shared/security';

describe('SecurityService', () => {
  describe('MockSecurityService', () => {
    let service: MockSecurityService;

    beforeEach(() => {
      service = new MockSecurityService();
    });

    it('encrypt returns the input unchanged (pass-through)', () => {
      expect(service.encrypt('hello')).toBe('hello');
    });

    it('decrypt returns the input unchanged (pass-through)', () => {
      expect(service.decrypt('hello')).toBe('hello');
    });

    it('roundtrips: decrypt(encrypt(x)) === x', () => {
      const text = 'Secret message with special chars: <>&"\'';
      expect(service.decrypt(service.encrypt(text))).toBe(text);
    });

    it('handles empty string', () => {
      expect(service.encrypt('')).toBe('');
      expect(service.decrypt('')).toBe('');
    });

    it('handles unicode', () => {
      const unicode = 'Hello \u{1F600} \u00E9\u00E0\u00FC';
      expect(service.encrypt(unicode)).toBe(unicode);
      expect(service.decrypt(unicode)).toBe(unicode);
    });

    it('scrub does not throw', () => {
      expect(() => service.scrub('sensitive data')).not.toThrow();
    });
  });

  describe('Singleton management', () => {
    it('getSecurityService returns an instance', () => {
      const service = getSecurityService();
      expect(service).toBeDefined();
      expect(service.encrypt).toBeDefined();
      expect(service.decrypt).toBeDefined();
    });

    it('setSecurityService swaps the global instance', () => {
      const custom: ISecurityService = {
        encrypt: (text) => `enc:${text}`,
        decrypt: (text) => text.replace('enc:', ''),
        scrub: () => {},
      };

      setSecurityService(custom);
      const service = getSecurityService();
      expect(service.encrypt('test')).toBe('enc:test');
      expect(service.decrypt('enc:test')).toBe('test');

      // Restore default
      setSecurityService(new MockSecurityService());
    });
  });
});

describe('sanitizeError', () => {
  it('extracts first line from Error message', () => {
    const error = new Error('Bad input\n    at module.ts:42\n    at handler.ts:10');
    expect(sanitizeError(error)).toEqual({ message: 'Bad input' });
  });

  it('strips stack traces from string errors', () => {
    expect(sanitizeError('Something failed\n  stack trace here')).toEqual({
      message: 'Something failed',
    });
  });

  it('returns generic message for non-string/non-Error values', () => {
    expect(sanitizeError(42)).toEqual({ message: 'An unexpected error occurred' });
    expect(sanitizeError(null)).toEqual({ message: 'An unexpected error occurred' });
    expect(sanitizeError(undefined)).toEqual({ message: 'An unexpected error occurred' });
    expect(sanitizeError({})).toEqual({ message: 'An unexpected error occurred' });
  });

  it('handles Error with empty message', () => {
    const error = new Error('');
    const result = sanitizeError(error);
    expect(result.message).toBeDefined();
  });
});

describe('redactForLog', () => {
  it('redacts long quoted strings', () => {
    const input = 'User sent "This is a very long message body that should be redacted"';
    const result = redactForLog(input);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('very long message');
  });

  it('preserves short quoted strings', () => {
    const input = 'Status: "ok"';
    expect(redactForLog(input)).toBe('Status: "ok"');
  });

  it('handles strings with no quotes', () => {
    const input = 'No quotes here';
    expect(redactForLog(input)).toBe('No quotes here');
  });

  it('redacts multiple long quoted strings', () => {
    const input = '"This is a very long first string" and "This is a very long second string"';
    const result = redactForLog(input);
    expect(result).toBe('"[REDACTED]" and "[REDACTED]"');
  });
});
