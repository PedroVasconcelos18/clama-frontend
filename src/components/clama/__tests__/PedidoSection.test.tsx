import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PedidoSection } from "../PedidoSection";
import { mockApiFetch, usuarioFixture } from "@/test/sessao";
import { formatCurrency } from "@/lib/formatters";
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

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (centavos: number) =>
  new RegExp(formatCurrency(centavos).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"));

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
      { id: 1, nome: "Plano 1", descricao: "d1", valorCentavos: 199, complexidade: "SIMPLES", ordem: 1 },
      { id: 2, nome: "Plano 2", descricao: "d2", valorCentavos: 999, complexidade: "COM_VERSICULO", ordem: 2 },
      { id: 3, nome: "Plano 3", descricao: "d3", valorCentavos: 4999, complexidade: "COM_PROFECIA_E_VERSICULOS", ordem: 3 },
    ];
    mockApiFetch({ outras: (path) => (path === "/api/planos" ? planos : []) });
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
      mockApiFetch({ usuario: usuarioFixture, outras: (path) => (path === "/api/planos" ? planos : []) });
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

  describe("vitrine com o catálogo novo", () => {
    it("lê /api/planos e /api/instituicoes sem barra final e formata o valor com Intl", async () => {
      const spy = mockApiFetch({
        outras: (path) =>
          path === "/api/planos"
            ? planos
            : [{ id: 3, nome: "Casa de Apoio", logoUrl: "/api/instituicoes/3/logo?v=abcd1234" }],
      });
      renderWithRouter(<PedidoSection />);

      expect(await screen.findByText(moeda(999))).toBeInTheDocument();
      expect(screen.getByText(moeda(4999))).toBeInTheDocument();
      expect(screen.getByText("Mais escolhido")).toBeInTheDocument();
      const caminhos = spy.mock.calls.map((c) => c[0]);
      expect(caminhos).toContain("/api/planos");
      expect(caminhos).toContain("/api/instituicoes");
    });

    it("descarta em silêncio o rascunho antigo com selectedPlanId UUID", async () => {
      localStorage.setItem(
        "clama:form-draft",
        JSON.stringify({
          formData: {},
          offering: { selectedPlanId: "0b8f-uuid-antigo", valorLivre: null, valorLivreActive: false, gratuito: false },
          canal: "EMAIL",
        }),
      );
      renderWithRouter(<PedidoSection />);
      await screen.findByText(moeda(999));
      expect(screen.queryAllByRole("radio", { checked: true }).length).toBe(1); // o semeado (Livre), não o plano antigo
      expect(localStorage.getItem("clama:form-draft") ?? "").not.toContain("uuid-antigo");
    });
  });
});
