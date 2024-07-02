import { sleep } from '../utils/common';
import { FIRST_SEGMENT_INDEX } from '../utils/constants';
import { incrementHexString } from '../utils/operations';

export class AsyncQueue {
  private indexed;
  private waitable;
  private clearWaitTime;
  private isProcessing = false;
  private inProgressCount = 0;
  private index = FIRST_SEGMENT_INDEX;
  private queue: ((index?: string) => Promise<void>)[] = [];

  private readonly maxParallel: number;

  constructor(settings: { indexed?: boolean; waitable?: boolean; clearWaitTime?: number; max?: number } = {}) {
    this.indexed = settings.indexed || false;
    this.waitable = settings.waitable || false;
    this.clearWaitTime = settings.clearWaitTime || 100;
    this.maxParallel = settings.max || 5;
  }

  private async processQueue() {
    if (this.inProgressCount >= this.maxParallel) return;
    console.warn("Current inProgressCount: ", this.inProgressCount);
    console.warn("Queue length: ", this.queue.length);
    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.inProgressCount = this.inProgressCount+1;
      const promise = this.queue.shift()!;
      const action = this.indexed ? () => promise(this.index) : () => promise();

      if (this.waitable) {
        try {
          await action();
          this.index = incrementHexString(this.index);
        } catch (error) {
          console.error('Error processing promise:', error);
          throw error;
        } finally {
          this.inProgressCount = this.inProgressCount-1;
        }
      } else {
        action()
          .then(() => {
            this.index = incrementHexString(this.index);
          })
          .catch((error) => {
            console.error('Error processing promise:', error);
          })
          .finally(() => {
            this.inProgressCount = this.inProgressCount-1;
          });
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
    while (this.isProcessing || this.inProgressCount > 0) {
      await sleep(this.clearWaitTime);
    }
  }
}