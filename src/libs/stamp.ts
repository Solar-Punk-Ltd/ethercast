import { getBeeDebug } from './bee';

export async function getStamp() {
  const beeDebug = getBeeDebug();
  const stamps = await beeDebug.getAllPostageBatch();

  if (stamps && stamps.length > 0) {
    return stamps[0].batchID;
  }

  const stampId = await beeDebug.createPostageBatch('1000000000000000000', 30);
  return (await beeDebug.getPostageBatch(stampId)).batchID;
}
