import { useCallback, useEffect, useRef, useState } from "react";

export function useFormDraft<T>(
  key: string,
  initialValue: T,
  onSaved?: () => void,
  debounceMs = 800
): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  clearDraft: () => void;
  isDirty: boolean;
} {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [isDirty, setIsDirty] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip the initial mount to avoid triggering save on load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setIsDirty(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
      onSaved?.();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, debounceMs, onSaved]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setIsDirty(false);
  }, [key]);

  return { value, setValue, clearDraft, isDirty };
}
