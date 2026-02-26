import { useEffect, useRef } from 'react';
import type { DependencyList } from 'react';

export function useDebouncedEffect(effect: () => void, delay: number, deps: DependencyList) {
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      effect();
    }, delay);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
