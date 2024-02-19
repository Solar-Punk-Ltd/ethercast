export function incrementHexString(hexString: string) {
  const num = BigInt('0x' + hexString);
  return (num + 1n).toString(16).padStart(16, '0');
}

export function decrementHexString(hexString: string) {
  const num = BigInt('0x' + hexString);
  return (num - 1n).toString(16).padStart(16, '0');
}

export function divideDecimalByHex(decimal: number, hexString: string) {
  const hexAsDecimal = parseInt(hexString, 16);
  const result = decimal / hexAsDecimal;
  return result;
}
