import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useIsInView } from "../useIsInView";

describe("useIsInView", () => {
  let observerCallback: IntersectionObserverCallback | null = null;
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    observerCallback = null;
    mockObserve.mockReset();
    mockDisconnect.mockReset();

    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (cb: IntersectionObserverCallback) {
        observerCallback = cb;
        this.observe = mockObserve;
        this.disconnect = mockDisconnect;
        this.unobserve = vi.fn();
        this.takeRecords = () => [];
        this.root = null;
        this.rootMargin = "";
        this.thresholds = [];
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderHookWithElement(threshold?: number) {
    return renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      if (!ref.current) {
        ref.current = document.createElement("div");
      }
      return useIsInView(ref, threshold !== undefined ? { threshold } : undefined);
    });
  }

  it("returns false before the observer fires", () => {
    const { result } = renderHookWithElement();
    expect(result.current).toBe(false);
  });

  it("calls observe on mount and disconnect on unmount", () => {
    const { unmount } = renderHookWithElement();
    expect(mockObserve).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("returns true when the observer reports intersection", () => {
    const { result } = renderHookWithElement();
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(result.current).toBe(true);
  });

  it("returns false after the observer reports no intersection", () => {
    const { result } = renderHookWithElement();
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    act(() => {
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(result.current).toBe(false);
  });

  it("uses default threshold 0.15 when none is provided", () => {
    const ctor = globalThis.IntersectionObserver as unknown as vi.Mock;
    renderHookWithElement();
    expect(ctor).toHaveBeenCalledWith(expect.any(Function), { threshold: 0.15 });
  });

  it("forwards custom threshold to the observer", () => {
    const ctor = globalThis.IntersectionObserver as unknown as vi.Mock;
    renderHookWithElement(0.5);
    expect(ctor).toHaveBeenCalledWith(expect.any(Function), { threshold: 0.5 });
  });
});
