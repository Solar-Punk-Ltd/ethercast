export function getTimeDiffInSeconds(time1: Date, time2: Date) {
  const differenceInMilliseconds = time1.getTime() - time2.getTime();
  return Math.round(differenceInMilliseconds / 1000);
}
