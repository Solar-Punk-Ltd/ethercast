export function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
