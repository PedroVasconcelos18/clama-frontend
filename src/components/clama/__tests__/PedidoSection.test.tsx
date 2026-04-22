import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PedidoSection } from "../PedidoSection";
import * as apiModule from "@/lib/api";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("PedidoSection", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue([
      { id: "p1", nome: "Plano 1", valor_centavos: 199, ordem: 1 },
      { id: "p2", nome: "Plano 2", valor_centavos: 999, ordem: 2 },
      { id: "p3", nome: "Plano 3", valor_centavos: 4999, ordem: 3 },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("renders a section with id='fazer-pedido'", async () => {
    const { container } = renderWithRouter(<PedidoSection />);
    const section = container.querySelector("#fazer-pedido");
    expect(section).not.toBeNull();
    expect(section?.tagName.toLowerCase()).toBe("section");
  });

  it("exposes the section element through forwarded ref", async () => {
    const ref = createRef<HTMLElement>();
    renderWithRouter(<PedidoSection ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.id).toBe("fazer-pedido");
  });

  it("does not render the old 'Leve seu clamor' intro", async () => {
    renderWithRouter(<PedidoSection />);
    expect(screen.queryByText("Leve seu clamor")).toBeNull();
  });

  it("renders the three form section labels after planos load", async () => {
    renderWithRouter(<PedidoSection />);
    await waitFor(() => {
      expect(screen.getByText("Seus dados")).toBeInTheDocument();
    });
    expect(screen.getByText("Receber oração por")).toBeInTheDocument();
    expect(screen.getByText("Escolha sua contribuição")).toBeInTheDocument();
  });

  it("renders with scroll-mt utility for sticky-nav offset", () => {
    const { container } = renderWithRouter(<PedidoSection />);
    const section = container.querySelector("#fazer-pedido");
    expect(section?.className).toMatch(/scroll-mt-/);
  });
});
