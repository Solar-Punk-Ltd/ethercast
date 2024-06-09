import { padTo2Digits } from './common';
import { HOUR, MINUTE, SECOND } from './constants';

export function getTimeDiffInSeconds(time1: Date, time2: Date) {
  const differenceInMilliseconds = time1.getTime() - time2.getTime();
  return Math.round(differenceInMilliseconds / 1000);
}

export function convertMillisecondsToTime(milliseconds: number) {
  const hours = Math.floor(milliseconds / HOUR);
  const minutes = Math.floor((milliseconds - hours * HOUR) / MINUTE);
  const seconds = Math.floor((milliseconds - hours * HOUR - minutes * MINUTE) / SECOND);

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
}

export function timeStampBytes(timestamp: number) {
  const res = new Uint8Array(4);
  res[0] = timestamp >> 24;
  res[1] = (timestamp >> 16) & 0xff;
  res[2] = (timestamp >> 8) & 0xff;
  res[3] = timestamp & 0xff;
  return res;
}

export function bytesToTimestamp(bytes: Uint8Array) {
  return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
}
