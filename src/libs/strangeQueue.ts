import { sleep } from '../utils/common';
import { FIRST_SEGMENT_INDEX } from '../utils/constants';
import { incrementHexString } from '../utils/operations';

export class StrangeQueue {
  private clearWaitTime;
  private isProcessing = false;
  private currentPromiseProcessing = false;
  private index = FIRST_SEGMENT_INDEX;
  private queue: ((index?: string) => Promise<void>)[] = [];

  constructor(settings: { index?: string; clearWaitTime?: number } = {}) {
    this.index = settings.index || '0';
    this.clearWaitTime = settings.clearWaitTime || 100;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.currentPromiseProcessing = true;
      const promise = this.queue.shift()!;
      const action = promise;

      try {
        const res = await action();
        /*     if (res) {
          this.index = incrementHexString(this.index);
        } */
      } catch (error) {
        console.error('Error processing promise:', error);
        throw error;
      } finally {
        this.currentPromiseProcessing = false;
      }
    }

    this.isProcessing = false;
  }

  enqueue(promiseFunction: (index?: string) => Promise<any>) {
    this.queue.push(promiseFunction);
    this.processQueue();
  }

  async clearQueue() {
    this.queue = [];
    while (this.isProcessing || this.currentPromiseProcessing) {
      await sleep(this.clearWaitTime);
    }
  }

  public setIndex(index: string) {
    this.index = index;
  }
}
