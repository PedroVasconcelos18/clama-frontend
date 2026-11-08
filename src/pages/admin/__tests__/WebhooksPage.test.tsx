import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import WebhooksPage from "../WebhooksPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let postResult: () => Promise<unknown>
let lista: unknown[]
const evento = {
  id: "w1", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
  provider: "MERCADO_PAGO", event_type: "payment", status: "ERRO",
  external_event_id: "evt-123", pedido_id: "12345678-aaaa-bbbb-cccc-1234567890ab", error_message: "falhou",
}

describe("WebhooksPage", () => {
  beforeEach(() => {
    fetchApi.mockReset()
    lista = [evento]
    postResult = () => Promise.resolve({ status: "PROCESSADO" })
    fetchApi.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return postResult()
      if (url === "/api/admin/webhooks/w1/")
        return Promise.resolve({ ...(lista[0] as object), payload: { data: { id: "999" } } })
      return Promise.resolve({ count: 45, next: null, previous: null, results: lista })
    })
  })

  it("renderiza a lista sem payload", async () => {
    render(<WebhooksPage />)
    expect(await screen.findByText("evt-123")).toBeTruthy()
    expect(screen.queryByText("Payload")).toBeNull()
    expect(screen.getByText("12345678")).toBeTruthy()
    expect(screen.getByText("falhou")).toBeTruthy()
  })

  it("paginacao envia limit e offset", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/webhooks/?limit=20&offset=20"),
    )
  })

  it("detalhe mostra o payload", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    expect(await screen.findByText(/"999"/)).toBeTruthy()
  })

  async function abrirReprocessar() {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    await userEvent.click(await screen.findByRole("button", { name: /Reprocessar/ }))
    return screen.findByText("Reprocessar webhook?")
  }

  it("Reprocessar (no drawer) pede confirmacao antes de chamar o POST", async () => {
    await abrirReprocessar()
    expect(screen.getByText(/marcado como pago/)).toBeTruthy()
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false)
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reprocesso" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/webhooks/w1/reprocessar/", {
        method: "POST",
        showToast: false,
      }),
    )
  })

  it("ja_na_fila mostra a mensagem propria", async () => {
    postResult = () => Promise.resolve({ status: "ja_na_fila" })
    await abrirReprocessar()
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reprocesso" }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Esse evento já estava na fila."),
    )
  })

  it("409 mostra a mensagem pastoral e reabilita o botao", async () => {
    postResult = () => Promise.reject({ pastoralMessage: "Esse evento já foi processado." })
    await abrirReprocessar()
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reprocesso" }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Esse evento já foi processado."),
    )
    expect(
      (screen.getByRole("button", { name: "Confirmar reprocesso" }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it.each([
    ["PROCESSADO", "MERCADO_PAGO"],
    ["ERRO", "ASAAS"],
    ["RECEBIDO", "ZAPI"],
  ])("sem botao Reprocessar para %s/%s", async (st, prov) => {
    lista = [{ ...evento, status: st, provider: prov }]
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    await screen.findByText("Payload")
    expect(screen.queryByRole("button", { name: /Reprocessar/ })).toBeNull()
  })

  it("filtro de tipo envia event_type", async () => {
    render(<WebhooksPage />)
    await userEvent.selectOptions(await screen.findByLabelText("Tipo"), "post_publicado")
    await waitFor(() =>
      expect(fetchApi).toHaveBeenLastCalledWith(
        "/api/admin/webhooks/?limit=20&offset=0&event_type=post_publicado",
      ),
    )
  })

  it("Escape fecha o drawer", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    await screen.findByText("Payload")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("Payload")).toBeNull())
  })

  it("Escape com a confirmacao aberta nao fecha o drawer", async () => {
    await abrirReprocessar()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("Reprocessar webhook?")).toBeNull())
    expect(screen.getByText("Payload")).toBeTruthy()
  })
})
