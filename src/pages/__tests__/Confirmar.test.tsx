import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessaoProvider } from "@/contexts/SessaoContext";
import { describe, it, expect, vi, beforeEach } from "vitest";

import Confirmar from "../Confirmar";
import * as freemiumApi from "@/lib/api/freemium";
import * as apiModule from "@/lib/api";
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
      <SessaoProvider>
      <Confirmar />
    </SessaoProvider>
    </MemoryRouter>,
  );
}

describe("Confirmar (/confirmar)", () => {
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
        id: "uuid-xyz",
        status: "PAGO",
      });

    renderAt("/confirmar?token=tk-1");

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmar minha oração/i }),
    );

    await waitFor(() => expect(apiSpy).toHaveBeenCalledWith("tk-1"));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        "/confirmado?pedido_id=uuid-xyz",
        { replace: true },
      ),
    );
  });

  it("erro pastoral 400: mostra pastoral_message inline e não navega", async () => {
    vi.spyOn(freemiumApi, "confirmarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "link_expirado",
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

  it("erro 409 freemium_ja_usado: mostra pastoral_message", async () => {
    vi.spyOn(freemiumApi, "confirmarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Conflict",
        "freemium_ja_usado",
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

  it("link_invalido mostra o texto e deixa tentar de novo", async () => {
    vi.spyOn(freemiumApi, "confirmarPedidoGratuito").mockRejectedValue(
      new PastoralApiError("Erro", "link_invalido", "Esse link não é mais válido.", 400),
    );
    renderAt("/confirmar?token=tk-usado");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar minha oração/i }));
    expect(await screen.findByText("Esse link não é mais válido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar minha oração/i })).toBeEnabled();
  });

  it("tira o token da barra de endereço ao abrir e ainda confirma com ele (só em memória)", async () => {
    window.history.replaceState(null, "", "/confirmar?token=tk-secreto");
    const apiSpy = vi
      .spyOn(freemiumApi, "confirmarPedidoGratuito")
      .mockResolvedValue({ id: "uuid-1", status: "PAGO" });
    renderAt("/confirmar?token=tk-secreto");

    expect(window.location.search).toBe("");
    expect(window.location.href).not.toContain("tk-secreto");

    fireEvent.click(screen.getByRole("button", { name: /Confirmar minha oração/i }));
    await waitFor(() => expect(apiSpy).toHaveBeenCalledWith("tk-secreto"));
  });

  it("o POST vai a /api/freemium/confirmacao com o token no corpo", async () => {
    const apiFetch = vi.spyOn(apiModule, "apiFetch").mockResolvedValue({ id: "u", status: "PAGO" });
    await freemiumApi.confirmarPedidoGratuito("tk-9");
    expect(apiFetch).toHaveBeenCalledWith("/api/freemium/confirmacao", {
      method: "POST",
      body: JSON.stringify({ token: "tk-9" }),
      showToast: false,
    });
  });
});
