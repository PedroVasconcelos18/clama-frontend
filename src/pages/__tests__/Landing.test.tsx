import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import Landing from "../Landing";
import * as apiModule from "@/lib/api";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";

function renderLanding() {
  return render(
    <MemoryRouter>
      <CustomerAuthProvider>
        <Landing />
      </CustomerAuthProvider>
    </MemoryRouter>,
  );
}

describe("Landing", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];

    // IntersectionObserver mock — evita warnings em jsdom
    globalThis.IntersectionObserver = vi.fn().mockImplementation(function () {
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
        takeRecords: () => [],
        root: null,
        rootMargin: "",
        thresholds: [],
      };
    }) as unknown as typeof IntersectionObserver;

    vi.spyOn(apiModule, "apiFetch").mockResolvedValue([
      { id: "p1", nome: "Plano 1", valor_centavos: 199, ordem: 1 },
      { id: "p2", nome: "Plano 2", valor_centavos: 999, ordem: 2 },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders PedidoSection at the bottom of the page", async () => {
    const { container } = renderLanding();
    const pedidoSection = container.querySelector("#fazer-pedido");
    expect(pedidoSection).not.toBeNull();
  });

  it("updates window.location.hash to #fazer-pedido when Hero CTA is clicked", async () => {
    renderLanding();
    const heroCta = await screen.findAllByRole("button", { name: /levar meu clamor/i });
    const firstHeroCta = heroCta[0];
    if (!firstHeroCta) throw new Error("Hero CTA button not found");
    fireEvent.click(firstHeroCta);
    expect(window.location.hash).toBe("#fazer-pedido");
  });

  it("updates window.location.hash to #fazer-pedido when StickyNav CTA is clicked", async () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: /fazer pedido/i }));
    expect(window.location.hash).toBe("#fazer-pedido");
  });

  it("does not render the old FinalCta gold button", async () => {
    renderLanding();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Clama — a partir de R\$/ })).toBeNull();
    });
  });
});
