import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import WebhooksPage from "../WebhooksPage"
import { PastoralApiError } from "@/lib/api"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let postResult: () => Promise<unknown>
let lista: Record<string, unknown>[]
const evento = {
  id: 5, idExterno: "evt-123", tipo: "payment", mpPagamentoId: "999", status: "ERRO", motivo: "mp_indisponivel",
  pedidoId: "12345678-aaaa-bbbb-cccc-1234567890ab", recebidoEm: "2026-11-01T10:00:00Z", atualizadoEm: "2026-11-01T10:00:00Z",
}

describe("WebhooksPage (eventos do Mercado Pago)", () => {
  beforeEach(() => {
    fetchApi.mockReset()
    lista = [evento]
    postResult = () => Promise.resolve({ resultado: "ok", evento: { ...evento, status: "PROCESSADO" } })
    fetchApi.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return postResult()
      if (url === "/api/admin/eventos-mp/5") return Promise.resolve({ ...lista[0], payload: { data: { id: "999" } } })
      return Promise.resolve({ content: lista, page: { number: 0, size: 20, totalElements: 45, totalPages: 3 } })
    })
  })

  it("lista os eventos sem payload", async () => {
    render(<WebhooksPage />)
    expect(await screen.findByText("evt-123")).toBeTruthy()
    expect(screen.getByText("Eventos do Mercado Pago")).toBeTruthy()
    expect(screen.queryByText("Payload")).toBeNull()
    expect(screen.getByText("12345678")).toBeTruthy()
    expect(screen.getByText("mp_indisponivel")).toBeTruthy()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/eventos-mp?page=0&size=20")
  })

  it("paginação e filtro de status", async () => {
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() => expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/eventos-mp?page=1&size=20"))
    await userEvent.selectOptions(screen.getByLabelText("Status"), "IGNORADO")
    await waitFor(() =>
      expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/eventos-mp?page=0&size=20&status=IGNORADO"),
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
    return screen.findByText("Reprocessar evento?")
  }

  it("reprocessar pede confirmação e usa a rota nova", async () => {
    await abrirReprocessar()
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false)
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reprocesso" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/eventos-mp/5/reprocessamento", {
        method: "POST",
        showToast: false,
      }),
    )
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Pagamento confirmado: pedido pago e oração na fila."),
    )
  })

  it("erro mostra a mensagem pastoral e reabilita o botão", async () => {
    postResult = () =>
      Promise.reject(new PastoralApiError("Erro", "evento_encerrado", "Evento PROCESSADO não se reprocessa.", 409))
    await abrirReprocessar()
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reprocesso" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Evento PROCESSADO não se reprocessa."))
    expect((screen.getByRole("button", { name: "Confirmar reprocesso" }) as HTMLButtonElement).disabled).toBe(false)
  })

  it.each(["PROCESSADO", "IGNORADO"])("sem Reprocessar para %s", async (st) => {
    lista = [{ ...evento, status: st }]
    render(<WebhooksPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Detalhes" }))
    await screen.findByText("Payload")
    expect(screen.queryByRole("button", { name: /Reprocessar/ })).toBeNull()
  })

  it("Escape fecha o drawer, mas não com a confirmação aberta", async () => {
    await abrirReprocessar()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("Reprocessar evento?")).toBeNull())
    expect(screen.getByText("Payload")).toBeTruthy()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("Payload")).toBeNull())
  })
})
