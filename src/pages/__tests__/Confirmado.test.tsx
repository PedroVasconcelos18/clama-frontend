import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import Confirmado from "../Confirmado";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Confirmado />
    </MemoryRouter>,
  );
}

describe("Confirmado (/confirmado)", () => {
  it("renderiza mensagem de oração em preparação com pedido_id válido", () => {
    renderAt("/confirmado?pedido_id=uuid-123");

    expect(
      screen.getByRole("heading", {
        name: /Sua oração está sendo preparada/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Vamos te enviar a oração e suas credenciais/i),
    ).toBeInTheDocument();
  });

  it("CTA aponta pra página de polling /confirmacao com o pedido_id", () => {
    renderAt("/confirmado?pedido_id=uuid-abc");

    const link = screen.getByRole("link", {
      name: /Acompanhar minha oração/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "/confirmacao?pedido_id=uuid-abc",
    );
  });

  it("pedido_id ausente: mostra pastoral de link inválido", () => {
    renderAt("/confirmado");

    expect(
      screen.getByText(/Link inválido ou incompleto/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /Sua oração está sendo preparada/i,
      }),
    ).not.toBeInTheDocument();

    const novoPedidoBtn = screen.getByRole("button", {
      name: /Fazer um novo pedido/i,
    });
    expect(novoPedidoBtn).toBeInTheDocument();
  });
});
