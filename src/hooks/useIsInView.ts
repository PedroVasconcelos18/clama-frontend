import { useEffect, useState, type RefObject } from "react";

interface UseIsInViewOptions {
  threshold?: number;
}

export function useIsInView(
  ref: RefObject<Element | null>,
  options: UseIsInViewOptions = {},
): boolean {
  const { threshold = 0.15 } = options;
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold]);

  return isInView;
}
