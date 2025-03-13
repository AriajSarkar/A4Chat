/**
 * Manages queued database operations to prevent concurrency issues
 */
interface DBOperation {
    execute: () => Promise<any>;
    resolve: (result: any) => void;
    reject: (error: any) => void;
}

export class OperationQueue {
    private operationQueue: DBOperation[] = [];
    private isProcessingQueue = false;

    /**
     * Enqueues an operation and returns a promise that resolves when it completes
     */
    enqueue<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.operationQueue.push({
                execute: operation,
                resolve,
                reject
            });
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * Processes the next operation in the queue
     */
    private async processQueue(): Promise<void> {
        if (this.operationQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        this.isProcessingQueue = true;
        const operation = this.operationQueue.shift();
        
        try {
            const result = await operation!.execute();
            operation!.resolve(result);
        } catch (error) {
            operation!.reject(error);
        } finally {
            // Process next item with a small delay to allow UI updates
            setTimeout(() => this.processQueue(), 0);
        }
    }

    /**
     * Returns the current queue length
     */
    get length(): number {
        return this.operationQueue.length;
    }

    /**
     * Clears all pending operations
     */
    clear(): void {
        const error = new Error('Queue cleared');
        this.operationQueue.forEach(op => op.reject(error));
        this.operationQueue = [];
        this.isProcessingQueue = false;
    }
}
