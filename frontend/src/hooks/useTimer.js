import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialSeconds, onExpire) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  const initialSecondsRef = useRef(initialSeconds);
  onExpireRef.current = onExpire;

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          onExpireRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const reset = useCallback((seconds) => {
    stop();
    setTimeLeft(seconds ?? initialSecondsRef.current);
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { timeLeft, start, stop, reset, initialSeconds: initialSecondsRef.current };
}
