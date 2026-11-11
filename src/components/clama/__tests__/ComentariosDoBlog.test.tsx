import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ComentariosDoBlog } from "../ComentariosDoBlog";

const fetchApi = vi.fn();
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const LISTA = {
  content: [
    {
      id: 1,
      conteudo: "Amém",
      postSlug: "p",
      postTitulo: "Post",
      criadoEm: "2026-11-01T10:00:00Z",
    },
  ],
};

describe("ComentariosDoBlog", () => {
  beforeEach(() => {
    fetchApi.mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("falha na primeira carga esconde a seção", async () => {
    fetchApi.mockRejectedValue(new Error("x"));
    const { container } = render(<ComentariosDoBlog />);
    await waitFor(() => expect(fetchApi).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("falha no reload mantém a lista e mostra toast", async () => {
    let chamadas = 0;
    fetchApi.mockImplementation((_url: string, init?: { method?: string }) => {
      if (init?.method === "DELETE") return Promise.resolve(null);
      return ++chamadas === 1
        ? Promise.resolve(LISTA)
        : Promise.reject(new Error("x"));
    });
    render(<ComentariosDoBlog />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Apagar" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Apagar comentário" }),
    );
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText("Amém")).toBeInTheDocument();
  });
});
