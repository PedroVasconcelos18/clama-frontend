import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import Confirmar from "../Confirmar";
import * as freemiumApi from "@/lib/api/freemium";
import { PastoralApiError } from "@/lib/api";

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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Confirmar />
    </MemoryRouter>,
  );
}

describe("Confirmar (/confirmar) — P-V2 wave 2", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.restoreAllMocks();
  });

  it("renderiza CTA principal quando token está presente na query string", () => {
    renderAt("/confirmar?token=abc-token-123");

    expect(
      screen.getByRole("heading", { name: /Confirme sua oração/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirmar minha oração/i }),
    ).toBeInTheDocument();
  });

  it("token ausente: mostra erro pastoral inline e CTA pra novo pedido", () => {
    renderAt("/confirmar");

    expect(
      screen.getByText(/Link de confirmação inválido ou incompleto/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Fazer um novo pedido/i }),
    ).toBeInTheDocument();
    // Sem CTA principal de confirmar
    expect(
      screen.queryByRole("button", { name: /Confirmar minha oração/i }),
    ).not.toBeInTheDocument();
  });

  it("clique no CTA dispara POST e navega pra /confirmado em sucesso", async () => {
    const apiSpy = vi
      .spyOn(freemiumApi, "confirmarPedidoGratuito")
      .mockResolvedValue({
        pedido_id: "uuid-xyz",
        status: "GERANDO_ORACAO",
      });

    renderAt("/confirmar?token=tk-1");

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmar minha oração/i }),
    );

    await waitFor(() => expect(apiSpy).toHaveBeenCalledWith("tk-1"));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        "/confirmado?pedido_id=uuid-xyz",
      ),
    );
  });

  it("erro pastoral 400: mostra pastoral_message inline e não navega", async () => {
    vi.spyOn(freemiumApi, "confirmarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "confirmation_token_expirado",
        "Esse link expirou. Faça um novo pedido.",
        400,
      ),
    );

    renderAt("/confirmar?token=tk-expirado");

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmar minha oração/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Esse link expirou\. Faça um novo pedido\./i),
      ).toBeInTheDocument(),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("erro 409 blacklist: mostra pastoral_message", async () => {
    vi.spyOn(freemiumApi, "confirmarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Conflict",
        "freemium_blacklist_hit",
        "Você já recebeu sua oração gratuita.",
        409,
      ),
    );

    renderAt("/confirmar?token=tk-bl");

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmar minha oração/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Você já recebeu sua oração gratuita\./i),
      ).toBeInTheDocument(),
    );
  });
});
