import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to debounce a fast-changing value (e.g. search input text)
 * @param {*} value - The input value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default: 350ms)
 * @returns {*} The debounced value
 */
export const useDebounce = (value, delay = 350) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook to debounce a callback function
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Debounce delay in milliseconds (default: 350ms)
 * @returns {Function} Debounced callback
 */
export const useDebouncedCallback = (callback, delay = 350) => {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback(
    (...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  return debouncedFn;
};

export default useDebounce;
