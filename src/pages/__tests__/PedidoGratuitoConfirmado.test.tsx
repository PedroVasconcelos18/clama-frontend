import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import PedidoGratuitoConfirmado from "../PedidoGratuitoConfirmado";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PedidoGratuitoConfirmado />
    </MemoryRouter>,
  );
}

describe("PedidoGratuitoConfirmado (/oracao-gratis/confirmado)", () => {
  it("renderiza mensagem de oração em preparação com pedido_id válido", () => {
    renderAt("/oracao-gratis/confirmado?pedido_id=uuid-123");

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
    renderAt("/oracao-gratis/confirmado?pedido_id=uuid-abc");

    const link = screen.getByRole("link", {
      name: /Acompanhar minha oração/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "/confirmacao?pedido_id=uuid-abc",
    );
  });

  it("pedido_id ausente: mostra pastoral de link inválido", () => {
    renderAt("/oracao-gratis/confirmado");

    expect(
      screen.getByText(/Link inválido ou incompleto/i),
    ).toBeInTheDocument();
    // Não mostra o título da feliz path
    expect(
      screen.queryByRole("heading", {
        name: /Sua oração está sendo preparada/i,
      }),
    ).not.toBeInTheDocument();

    // CTA pra fazer novo pedido
    const novoPedidoBtn = screen.getByRole("button", {
      name: /Fazer um novo pedido/i,
    });
    expect(novoPedidoBtn).toBeInTheDocument();
  });
});
