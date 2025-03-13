import { Dexie, Table } from 'dexie';
import { ChatInfo } from '../models';

/**
 * Handles batched database updates for improved performance
 */
export class BatchProcessor {
    private pendingUpdates: Map<string, any> = new Map();
    private batchTimeoutId: NodeJS.Timeout | null = null;
    private chatsTable: Table<ChatInfo, number>;
    private db: Dexie;

    constructor(db: Dexie, chatsTable: Table<ChatInfo, number>) {
        this.db = db;
        this.chatsTable = chatsTable;
    }

    /**
     * Schedule an update for batched processing
     */
    scheduleUpdate(key: string, data: any): void {
        this.pendingUpdates.set(key, data);
        this.scheduleBatchProcessing();
    }

    /**
     * Set a timeout to process all pending updates
     */
    private scheduleBatchProcessing(): void {
        if (this.batchTimeoutId) {
            clearTimeout(this.batchTimeoutId);
        }
        
        this.batchTimeoutId = setTimeout(() => {
            this.processBatchUpdates();
            this.batchTimeoutId = null;
        }, 100); // 100ms batching window
    }

    /**
     * Process all pending updates in appropriate batches
     */
    async processBatchUpdates(): Promise<void> {
        if (this.pendingUpdates.size === 0) return;
        
        const updates = new Map(this.pendingUpdates);
        this.pendingUpdates.clear();
        
        // Group updates by type
        const titleUpdates: {id: number, title: string}[] = [];
        
        for (const [key, value] of updates.entries()) {
            if (key.includes(':title')) {
                titleUpdates.push(value);
            }
            // Can add more update types here
        }
        
        // Process title updates in a single transaction
        if (titleUpdates.length > 0) {
            try {
                // Use the db instance to create a transaction
                await this.db.transaction('rw', this.chatsTable, async () => {
                    for (const update of titleUpdates) {
                        await this.chatsTable.update(update.id, {
                            title: update.title,
                            updated: new Date()
                        });
                    }
                });
            } catch (error) {
                console.error('Failed to process batch updates:', error);
            }
        }
    }

    /**
     * Cancel any pending batch processing
     */
    cleanup(): void {
        if (this.batchTimeoutId) {
            clearTimeout(this.batchTimeoutId);
            this.batchTimeoutId = null;
        }
        this.pendingUpdates.clear();
    }
}
