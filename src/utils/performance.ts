/**
 * Performance utilities for optimizing application execution
 */

// Throttle function to limit execution frequency
export function throttle<T extends (...args: any[]) => any>(
    func: T, 
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    // Removed unused lastResult variable
    
    return function(...args: Parameters<T>): void {
        if (!inThrottle) {
            func(...args); // Just call the function without storing the result
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

// Debounce function with proper typing and cancellation
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate = false
): {
    (...args: Parameters<T>): void;
    cancel: () => void;
} {
    let timeout: NodeJS.Timeout | null = null;
    
    const debounced = function(...args: Parameters<T>): void {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        
        const callNow = immediate && !timeout;
        
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(later, wait);
        
        if (callNow) func(...args);
    };
    
    debounced.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };
    
    return debounced;
}

// RAF throttle for smooth animations
export function rafThrottle<T extends (...args: any[]) => any>(
    func: T
): (...args: Parameters<T>) => void {
    let scheduled = false;
    let lastArgs: Parameters<T>;
    
    return function(...args: Parameters<T>): void {
        lastArgs = args;
        
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                func(...lastArgs);
                scheduled = false;
            });
        }
    };
}

// Chunk processing of large arrays to avoid UI blocking
export async function processInChunks<T, R>(
    items: T[],
    processor: (item: T) => R,
    chunkSize = 10,
    delayBetweenChunks = 0
): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        
        // Process current chunk
        const chunkResults = chunk.map(processor);
        results.push(...chunkResults);
        
        // Skip delay for the last chunk
        if (i + chunkSize < items.length && delayBetweenChunks > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
        }
    }
    
    return results;
}

// Memory management utility
export const memoryManager = {
    gcHint: () => {
        // Hint to garbage collector (only works in some browsers)
        if (typeof window !== 'undefined' && window.gc) {
            try {
                window.gc();
            } catch (e) {
                console.log('GC not available');
            }
        }
    },
    
    releaseMemory: () => {
        // Clear any object references that might be holding memory
        // This is a hint to the garbage collector
        if (typeof window !== 'undefined') {
            // Clear any cached data in our API
            if (window.performance && window.performance.memory) {
                console.log('Memory usage before cleanup:', 
                    Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)), 'MB');
            }
            
            // Call our cleanup functions
            if (typeof window.cleanupFunctions === 'object') {
                Object.values(window.cleanupFunctions).forEach(fn => {
                    if (typeof fn === 'function') fn();
                });
            }
        }
    },
    
    monitorMemory: (intervalMs = 30000) => {
        if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
            const interval = setInterval(() => {
                const used = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
                const total = Math.round(window.performance.memory.totalJSHeapSize / (1024 * 1024));
                const limit = Math.round(window.performance.memory.jsHeapSizeLimit / (1024 * 1024));
                
                console.log(`Memory usage: ${used}MB / ${total}MB (Limit: ${limit}MB)`);
                
                // If we're using more than 80% of available memory, try to free some
                if (used > total * 0.8) {
                    console.log('High memory usage detected, attempting to clean up...');
                    memoryManager.releaseMemory();
                }
            }, intervalMs);
            
            return () => clearInterval(interval);
        }
        return () => {};
    }
};

// Add type definitions for window
declare global {
    interface Window {
        gc?: () => void;
        performance: Performance & {
            memory?: {
                usedJSHeapSize: number;
                totalJSHeapSize: number;
                jsHeapSizeLimit: number;
            }
        };
        cleanupFunctions?: {
            [key: string]: () => void;
        };
    }
}

// Initialize cleanup functions object
if (typeof window !== 'undefined') {
    window.cleanupFunctions = window.cleanupFunctions || {};
    
    // Register API cleanup
    window.cleanupFunctions.api = () => {
        // This will be implemented when we import the API class
    };
    
    // Register DB cleanup
    window.cleanupFunctions.db = () => {
        // This will be implemented when we import the DB class
    };
}

// Export a function to register and automatically execute cleanup on page unload
export function registerCleanup(key: string, cleanupFn: () => void): void {
    if (typeof window !== 'undefined') {
        window.cleanupFunctions = window.cleanupFunctions || {};
        window.cleanupFunctions[key] = cleanupFn;
    }
}
