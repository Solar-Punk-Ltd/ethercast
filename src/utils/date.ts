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
