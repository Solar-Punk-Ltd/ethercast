// TODO These utils should come from bee-js

export const BATCH_ID_HEX_LENGTH = 64;
export const ADDRESS_HEX_LENGTH = 64;

/**
 * These type are used to create new nominal types
 *
 * See https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
 */
type BrandedType<Type, Name> = Type & { __tag__: Name };

type FlavoredType<Type, Name> = Type & { __tag__?: Name };

/**
 * Nominal type to represent hex strings WITHOUT '0x' prefix.
 * For example for 32 bytes hex representation you have to use 64 length.
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 */
type HexString<Length extends number = number> = FlavoredType<
  string & {
    readonly length: Length;
  },
  'HexString'
>;

/**
 * Type for HexString with prefix.
 * The main hex type used internally should be non-prefixed HexString
 * and therefore this type should be used as least as possible.
 * Because of that it does not contain the Length property as the variables
 * should be validated and converted to HexString ASAP.
 */
type PrefixedHexString = BrandedType<string, 'PrefixedHexString'>;

/**
 * Type guard for HexStrings.
 * Requires no 0x prefix!
 *
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 *
 * @param s string input
 * @param len expected length of the HexString
 */
export function isHexString<Length extends number = number>(s: unknown, len?: number): s is HexString<Length> {
  return typeof s === 'string' && /^[0-9a-f]+$/i.test(s) && (!len || s.length === len);
}

/**
 * Type guard for PrefixedHexStrings.
 * Does enforce presence of 0x prefix!
 *
 * @param s string input
 */
export function isPrefixedHexString(s: unknown): s is PrefixedHexString {
  return typeof s === 'string' && /^0x[0-9a-f]+$/i.test(s);
}

/**
 * Verifies if the provided input is a HexString.
 *
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 *
 * @param s string input
 * @returns HexString or throws error
 */
function assertHexString(s: string, len?: number) {
  if (!isHexString(s, len)) {
    if (isPrefixedHexString(s)) {
      return 'Not valid non prefixed hex string (has 0x prefix)';
    }
    const lengthMsg = len ? ` of length ${len}` : '';
    return `Not valid hex string${lengthMsg}: ${s}`;
  }
  return true;
}

export function assertAddress(value: string) {
  return assertHexString(value, ADDRESS_HEX_LENGTH);
}

export function assertBatchId(value: string) {
  return assertHexString(value, BATCH_ID_HEX_LENGTH);
}

export function assertPositiveInteger(value: string) {
  const parsed = parseInt(value, 10);
  return (!isNaN(parsed) && parsed > 0) || 'Value must be a positive number';
}

export function assertAtLeastFourChars(value: string) {
  return value.length >= 4 || 'Topic must have at least four characters';
}
