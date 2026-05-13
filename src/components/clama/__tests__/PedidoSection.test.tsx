import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PedidoSection } from "../PedidoSection";
import * as apiModule from "@/lib/api";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";

const STORAGE_KEY = "clama:customer-auth";

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
      <CustomerAuthProvider>{ui}</CustomerAuthProvider>
    </MemoryRouter>,
  );
}

function setAuthenticated() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: {
        id: "u-1",
        email: "fiel@example.com",
        nome_completo: "Pedro",
        force_change_password: false,
        freemium_used_at: null,
      },
      accessToken: "access-1",
      refreshToken: "refresh-1",
    }),
  );
}

describe("PedidoSection", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
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

  describe("AC8 — CTA condicional por auth", () => {
    it("anônimo: CTA mostra 'Entrar para fazer pedido' e click navega /login?next=/#pedido", async () => {
      renderWithRouter(<PedidoSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Entrar para fazer pedido/i }),
        ).toBeInTheDocument();
      });

      // Botão "Levar meu clamor" não deve aparecer
      expect(
        screen.queryByRole("button", { name: /Levar meu clamor/i }),
      ).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: /Entrar para fazer pedido/i }),
      );
      expect(navigateMock).toHaveBeenCalledWith("/login?next=/#pedido");
    });

    it("autenticado: CTA é 'Levar meu clamor' (comportamento atual preservado)", async () => {
      setAuthenticated();
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
