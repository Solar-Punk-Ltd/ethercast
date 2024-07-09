import { sleep } from '../utils/common';
import { FIRST_SEGMENT_INDEX } from '../utils/constants';
import { incrementHexString } from '../utils/operations';

export class AsyncQueue {
  private indexed;
  private waitable;
  private clearWaitTime;
  private index;
  private isProcessing = false;
  private currentPromiseProcessing = false;
  private isWaiting = false;
  private queue: ((index?: string) => Promise<void>)[] = [];

  constructor(settings: { indexed?: boolean; index?: string; waitable?: boolean; clearWaitTime?: number } = {}) {
    this.indexed = settings.indexed || false;
    this.index = settings.index || FIRST_SEGMENT_INDEX;
    this.waitable = settings.waitable || false;
    this.clearWaitTime = settings.clearWaitTime || 100;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.currentPromiseProcessing = true;
      const promise = this.queue.shift()!;
      const action = this.indexed ? () => promise(this.index) : () => promise();

      if (this.waitable) {
        try {
          await action();
          this.index = incrementHexString(this.index);
        } catch (error) {
          console.error('Error processing promise:', error);
        } finally {
          this.currentPromiseProcessing = false;
        }
      } else {
        console.log('wut?');
        action()
          .then(() => {
            this.index = incrementHexString(this.index);
          })
          .catch((error) => {
            console.error('Error processing promise:', error);
          })
          .finally(() => {
            this.currentPromiseProcessing = false;
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
    while (this.isProcessing || this.currentPromiseProcessing) {
      await sleep(this.clearWaitTime);
    }
  }

  async waitForProcessing() {
    if (this.isWaiting) return true;

    this.isWaiting = true;

    while (this.isProcessing || this.currentPromiseProcessing) {
      await sleep(this.clearWaitTime);
    }

    this.isWaiting = false;
  }
}
