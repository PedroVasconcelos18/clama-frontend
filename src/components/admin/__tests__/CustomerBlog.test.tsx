import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerBlog } from "../CustomerBlog";

const fetchApi = vi.fn();
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const pagina = (content: object[], total = content.length) => ({
  content,
  page: { number: 0, size: 1, totalElements: total, totalPages: 1 },
});
const BAN = {
  usuarioId: 7,
  motivo: "spam",
  banidoEm: "2026-11-01T10:00:00Z",
  usuarioEmail: "a@x.com",
  usuarioNome: "Ana",
};

function servir(ban: object | null, comentarios = 3) {
  fetchApi.mockImplementation((url: string, init?: { method?: string }) => {
    if (init?.method) return Promise.resolve(null);
    if (url.startsWith("/api/admin/blog/comentarios"))
      return Promise.resolve(pagina([], comentarios));
    return Promise.resolve(pagina(ban ? [ban] : []));
  });
}
const montar = () =>
  render(
    <MemoryRouter>
      <CustomerBlog usuarioId={7} />
    </MemoryRouter>,
  );

describe("CustomerBlog", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("mostra a contagem (totalElements de size=1) e o link para a lista filtrada", async () => {
    servir(null);
    montar();
    expect(await screen.findByText("Sem banimento")).toBeInTheDocument();
    expect(fetchApi.mock.calls.map((c) => c[0])).toContain(
      "/api/admin/blog/comentarios?usuarioId=7&size=1",
    );
    expect(fetchApi.mock.calls.map((c) => c[0])).toContain(
      "/api/admin/blog/banimentos?usuarioId=7",
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ver comentários" }),
    ).toHaveAttribute("href", "/admin/blog/comentarios?usuarioId=7");
  });

  it("banir pede motivo e manda o POST", async () => {
    servir(null);
    montar();
    await userEvent.click(
      await screen.findByRole("button", { name: "Banir do blog" }),
    );
    const confirmar = await screen.findByRole("button", {
      name: "Confirmar banimento",
    });
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Motivo/), "ofensa");
    await userEvent.click(confirmar);
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/blog/banimentos", {
        method: "POST",
        body: JSON.stringify({ usuarioId: 7, motivo: "ofensa" }),
      }),
    );
  });

  it("com ban ativo mostra o motivo e revoga depois de confirmar", async () => {
    servir(BAN);
    montar();
    expect(await screen.findByText(/spam/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Revogar banimento" }),
    );
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(
      false,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Confirmar revogação" }),
    );
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/blog/banimentos/7", {
        method: "DELETE",
      }),
    );
  });

  it("ban lookup falhou: mostra indisponível e não oferece Banir", async () => {
    fetchApi.mockImplementation((url: string) =>
      url.includes("banimentos")
        ? Promise.reject(new Error("x"))
        : Promise.resolve(pagina([], 1)),
    );
    montar();
    expect(await screen.findByText("indisponível")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Banir do blog" }),
    ).not.toBeInTheDocument();
  });

  it.each(["ADMIN", "SUPERUSUARIO"])(
    "não oferece Banir para %s",
    async (papel) => {
      servir(null);
      render(
        <MemoryRouter>
          <CustomerBlog usuarioId={7} papel={papel} />
        </MemoryRouter>,
      );
      expect(await screen.findByText("Sem banimento")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Banir do blog" }),
      ).not.toBeInTheDocument();
    },
  );
});
