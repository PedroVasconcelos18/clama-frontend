import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import RepassesPage from "../RepassesPage"
import { PastoralApiError } from "@/lib/api"
import { formatCurrency } from "@/lib/formatters"

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (c: number) => new RegExp(formatCurrency(c).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"))

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let lista: Record<string, unknown>[]
let post: () => Promise<unknown>
const repasse = {
  id: 1, pedidoId: "12345678-aaaa-bbbb-cccc-1234567890ab", instituicaoId: 7, instituicao: "Mar de Espanha",
  valorBaseCentavos: 3001, percentual: 20, valorCentavos: 600, status: "REGISTRADO",
  transferidoEm: null, canceladoEm: null, motivo: null, criadoEm: "2026-11-01T13:00:00Z",
}

describe("RepassesPage", () => {
  beforeEach(() => {
    lista = [repasse]
    post = () => Promise.resolve({ ...repasse, status: "TRANSFERIDO", transferidoEm: "2026-11-02T13:00:00Z" })
    fetchApi.mockReset().mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return post()
      if (url === "/api/admin/instituicoes") return Promise.resolve([{ id: 7, nome: "Mar de Espanha" }])
      return Promise.resolve({ content: lista, page: { number: 0, size: 20, totalElements: 45, totalPages: 3 } })
    })
  })

  it("lista sem PII, com valores formatados", async () => {
    render(<RepassesPage />)
    expect(await screen.findByText(moeda(600))).toBeTruthy()
    expect(screen.getAllByText("Mar de Espanha").length).toBeGreaterThan(0)
    expect(screen.getByText(moeda(3001))).toBeTruthy()
    expect(screen.getByText("20%")).toBeTruthy()
    expect(screen.getAllByText("Registrado").length).toBeGreaterThan(0)
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/repasses?page=0&size=20")
  })

  it("filtros de instituição, status e datas voltam à página 0", async () => {
    render(<RepassesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() => expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/repasses?page=1&size=20"))
    await userEvent.selectOptions(screen.getByLabelText("Instituição"), "7")
    await userEvent.selectOptions(screen.getByLabelText("Status"), "TRANSFERIDO")
    await userEvent.type(screen.getByLabelText("De"), "2026-11-01")
    await userEvent.type(screen.getByLabelText("Até"), "2026-11-30")
    await waitFor(() =>
      expect(fetchApi).toHaveBeenLastCalledWith(
        "/api/admin/repasses?page=0&size=20&instituicaoId=7&status=TRANSFERIDO&de=2026-11-01&ate=2026-11-30",
      ),
    )
  })

  it("Marcar transferido pede confirmação, chama a rota e recarrega", async () => {
    render(<RepassesPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Marcar transferido" }))
    expect(fetchApi.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false)
    const antes = fetchApi.mock.calls.length
    await userEvent.click(screen.getByRole("button", { name: "Confirmar transferência" }))
    await waitFor(() =>
      expect(fetchApi).toHaveBeenCalledWith("/api/admin/repasses/1/transferencia", { method: "POST", showToast: false }),
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await waitFor(() => expect(fetchApi.mock.calls.length).toBeGreaterThan(antes + 1)) // recarregou a lista
  })

  it("só REGISTRADO tem o botão", async () => {
    lista = [{ ...repasse, status: "CANCELADO", canceladoEm: "2026-11-02T13:00:00Z", motivo: "refunded" }]
    render(<RepassesPage />)
    expect(await screen.findByText("refunded")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Marcar transferido" })).toBeNull()
  })

  it("409 mostra a mensagem pastoral", async () => {
    post = () => Promise.reject(new PastoralApiError("Erro", "repasse_cancelado", "Repasse cancelado não se transfere.", 409))
    render(<RepassesPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Marcar transferido" }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar transferência" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Repasse cancelado não se transfere."))
  })
})
