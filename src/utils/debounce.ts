export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args); // Execute function later only if not immediate
    };

    const shouldCallImmediately = immediate && !timeout; // Check if it should execute immediately and there's no timeout

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (shouldCallImmediately) func(...args); // Execute function immediately
  };
}
