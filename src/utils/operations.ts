export function incrementHexString(hexString: string, i = 1n) {
  const num = BigInt('0x' + hexString);
  return (num + i).toString(16).padStart(16, '0');
}

export function decrementHexString(hexString: string, i = 1n) {
  const num = BigInt('0x' + hexString);
  return (num - i).toString(16).padStart(16, '0');
}

export function divideDecimalByHex(decimal: number, hexString: string) {
  const hexAsDecimal = parseInt(hexString, 16);
  const result = decimal / hexAsDecimal;
  return result;
}
