import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useScrollToPedido } from "../useScrollToPedido";

describe("useScrollToPedido", () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

  beforeEach(() => {
    originalScrollIntoView = Element.prototype.scrollIntoView;
    scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as Element["scrollIntoView"];
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  function renderHookWithElement() {
    return renderHook(() => {
      const ref = useRef<HTMLElement | null>(null);
      if (!ref.current) {
        ref.current = document.createElement("section");
      }
      return useScrollToPedido(ref);
    });
  }

  it("returns a function that updates the URL hash to #fazer-pedido", () => {
    const { result } = renderHookWithElement();
    act(() => result.current());
    expect(window.location.hash).toBe("#fazer-pedido");
  });

  it("returns a function that triggers smooth scrollIntoView", () => {
    const { result } = renderHookWithElement();
    act(() => result.current());
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("does not add a history entry (uses replaceState)", () => {
    const startLength = window.history.length;
    const { result } = renderHookWithElement();
    act(() => result.current());
    expect(window.history.length).toBe(startLength);
  });

  it("scrolls instantly on mount when hash is #fazer-pedido", () => {
    window.history.replaceState(null, "", "/#fazer-pedido");
    renderHookWithElement();
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("does not scroll on mount when hash is empty", () => {
    renderHookWithElement();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("does not scroll on mount when hash is different", () => {
    window.history.replaceState(null, "", "/#outro");
    renderHookWithElement();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});
