import { FIRST_SEGMENT_INDEX } from '../utils/constants';
import { incrementHexString } from '../utils/operations';

export class AsyncQueue {
  private queue: ((index?: string) => Promise<void>)[] = [];
  private indexed = false;
  private isProcessing = false;
  private index = FIRST_SEGMENT_INDEX;

  constructor({ indexed }: { indexed: boolean }) {
    this.queue = [];
    this.isProcessing = false;
    this.indexed = indexed;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const promise = this.queue.shift()!;
      try {
        if (this.indexed) {
          await promise(this.index);
          this.index = incrementHexString(this.index);
        } else {
          await promise();
        }
      } catch (error) {
        console.error('Error processing promise:', error);
        throw error;
      }
    }

    this.isProcessing = false;
  }

  enqueue(promiseFunction: (index?: string) => Promise<any>) {
    this.queue.push(promiseFunction);
    this.processQueue();
  }
}
