import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PedidoSection } from "../PedidoSection";
import { mockApiFetch, usuarioFixture } from "@/test/sessao";
import { SessaoProvider } from "@/contexts/SessaoContext";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <SessaoProvider>{ui}</SessaoProvider>
    </MemoryRouter>,
  );
}

describe("PedidoSection", () => {
  let planos: unknown[];
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
    planos = [
      { id: "p1", nome: "Plano 1", valor_centavos: 199, ordem: 1 },
      { id: "p2", nome: "Plano 2", valor_centavos: 999, ordem: 2 },
      { id: "p3", nome: "Plano 3", valor_centavos: 4999, ordem: 3 },
    ];
    mockApiFetch({ outras: () => planos });
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

  it("renders the form section labels after planos load", async () => {
    renderWithRouter(<PedidoSection />);
    await waitFor(() => {
      expect(screen.getByText("Seus dados")).toBeInTheDocument();
    });
    expect(screen.getByText("Escolha sua contribuição")).toBeInTheDocument();
  });

  it("renders with scroll-mt utility for sticky-nav offset", () => {
    const { container } = renderWithRouter(<PedidoSection />);
    const section = container.querySelector("#fazer-pedido");
    expect(section?.className).toMatch(/scroll-mt-/);
  });

  describe("AC8 — CTA condicional por auth", () => {
    it("anônimo: o pedido (UI unificada) não exige login nem mostra 'Levar meu clamor'", async () => {
      renderWithRouter(<PedidoSection />);

      await waitFor(() => {
        expect(screen.getByText("Seus dados")).toBeInTheDocument();
      });
      expect(
        screen.queryByRole("button", { name: /Entrar para fazer pedido/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /Levar meu clamor/i }),
      ).toBeNull();
    });

    it("autenticado: CTA é 'Levar meu clamor' (comportamento atual preservado)", async () => {
      mockApiFetch({ usuario: usuarioFixture, outras: () => planos });
      renderWithRouter(<PedidoSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Levar meu clamor/i }),
        ).toBeInTheDocument();
      });

      // Botão de login não deve aparecer
      expect(
        screen.queryByRole("button", { name: /Entrar para fazer pedido/i }),
      ).toBeNull();
    });
  });
});
