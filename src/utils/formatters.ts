export function stringToBytes(string: string): Uint8Array {
  return new TextEncoder().encode(string);
}

export function hexStringToBytes(hexString: string): Uint8Array {
  const uint8Array = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < uint8Array.length; i++) {
    const from = i * 2;
    uint8Array[i] = parseInt(hexString.slice(from, from + 2), 16);
  }

  return uint8Array;
}

export function bytesToHexString(bytes: Uint8Array): string {
  const hexArray = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return hexArray.join('');
}

export function stringToHex(str: string): string {
  let hex = '';

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const hexValue = charCode.toString(16);

    // Pad with zeros to ensure two-digit representation
    hex += hexValue.padStart(2, '0');
  }
  return hex;
}
