/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): {
    (...args: Parameters<T>): void;
    cancel?: () => void;
} {
    let timeout: NodeJS.Timeout | null = null;
    
    const debouncedFn = function(...args: Parameters<T>): void {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
    
    debouncedFn.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };
    
    return debouncedFn;
}
