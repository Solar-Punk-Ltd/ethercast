export function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function remove0xPrefix(value) {
    if (value.startsWith('0x')) {
        return value.substring(2);
    }
    return value;
}
