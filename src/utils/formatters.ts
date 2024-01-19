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

export function hexToBinary(hexString: string): string {
  let binaryString = '';

  for (let i = 0; i < hexString.length; i++) {
    const hexDigit = hexString[i];
    let binaryDigit = parseInt(hexDigit, 16).toString(2);
    // Pad with zeros to ensure 4 bits
    binaryDigit = binaryDigit.padStart(4, '0');
    binaryString += binaryDigit;
  }

  return binaryString;
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

export function convertMillisecondsToTime(milliseconds: number) {
  const HOUR = 3600000;
  const MINUTE = 60000;
  const SECOND = 1000;

  const hours = Math.floor(milliseconds / HOUR);
  const minutes = Math.floor((milliseconds - hours * HOUR) / MINUTE);
  const seconds = Math.floor((milliseconds - hours * HOUR - minutes * MINUTE) / SECOND);

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
}

function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}
