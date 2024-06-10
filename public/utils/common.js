"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove0xPrefix = exports.sleep = exports.padTo2Digits = void 0;
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}
exports.padTo2Digits = padTo2Digits;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function remove0xPrefix(value) {
    if (value.startsWith('0x')) {
        return value.substring(2);
    }
    return value;
}
exports.remove0xPrefix = remove0xPrefix;
