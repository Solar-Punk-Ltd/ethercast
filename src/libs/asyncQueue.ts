import { sleep } from '../utils/common';
import { FIRST_SEGMENT_INDEX } from '../utils/constants';
import { incrementHexString } from '../utils/operations';

export class AsyncQueue {
  private queue: ((index?: string) => Promise<void>)[] = [];
  private indexed = false;
  private isProcessing = false;
  private currentPromiseProcessing = false;
  private index = FIRST_SEGMENT_INDEX;
  private waitable = true;

  constructor({ indexed, waitable }: { indexed: boolean; waitable: boolean }) {
    this.queue = [];
    this.isProcessing = false;
    this.indexed = indexed;
    this.waitable = waitable;
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
          throw error;
        } finally {
          this.currentPromiseProcessing = false;
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

  async clearQueueAndWait() {
    this.queue = [];
    while (this.isProcessing || this.currentPromiseProcessing) {
      await sleep(100);
    }
  }
}
