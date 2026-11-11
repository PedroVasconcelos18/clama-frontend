import { useCallback, useEffect, useRef, useState } from "react";

export function useFormDraft<T>(
  key: string,
  initialValue: T,
  onSaved?: () => void,
  debounceMs = 800,
  { versao = 1, valido }: { versao?: number; valido?: (valor: T) => boolean } = {},
): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  clearDraft: () => void;
  isDirty: boolean;
} {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initialValue;
      // Formato { versao, valor }. Versão diferente (ou rascunho sem envelope)
      // ou valor inválido: descarta em silêncio.
      const parsed = JSON.parse(stored) as { versao?: number; valor?: T } | null;
      if (parsed?.versao === versao && parsed.valor !== undefined && (!valido || valido(parsed.valor))) {
        return parsed.valor;
      }
      localStorage.removeItem(key);
      return initialValue;
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
      localStorage.setItem(key, JSON.stringify({ versao, valor: value }));
      onSaved?.();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, debounceMs, onSaved, versao]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setIsDirty(false);
  }, [key]);

  return { value, setValue, clearDraft, isDirty };
}
