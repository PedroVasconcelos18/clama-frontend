import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import PedidosListPage from "../PedidosListPage"
import { formatCurrency } from "@/lib/formatters"

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (c: number) => new RegExp(formatCurrency(c).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"))

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ID = "12345678-aaaa-bbbb-cccc-1234567890ab"
const item = {
  id: ID, nome: "Ana", email: "ana@x.com", plano: "Livre", valorCentavos: 2500,
  status: "PAGO", gratuito: false, criadoEm: "2026-11-01T13:00:00Z",
}
const pagina = { content: [item], page: { number: 0, size: 20, totalElements: 45, totalPages: 3 } }

function Url() {
  const { search } = useLocation()
  return <output data-testid="url">{search}</output>
}

function abrir(url = "/admin/pedidos") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PedidosListPage />
      <Url />
    </MemoryRouter>,
  )
}

describe("PedidosListPage", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockImplementation((url: string) =>
      Promise.resolve(url.startsWith("/api/admin/pedidos?") ? pagina : { id: ID, nome: "Ana", status: "PAGO" }),
    )
  })

  it("mostra id, nome, e-mail, status, valor, plano e data do PagedModel", async () => {
    abrir()
    expect(await screen.findByText("Ana")).toBeTruthy()
    expect(screen.getByText("12345678")).toBeTruthy()
    expect(screen.getByText("ana@x.com")).toBeTruthy()
    expect(screen.getAllByText("Pago").length).toBeGreaterThan(0)
    expect(screen.getByText(moeda(2500))).toBeTruthy()
    expect(screen.getByText("Livre")).toBeTruthy()
    expect(screen.getByText("01/11/2026")).toBeTruthy()
    expect(screen.getByText("45 no total")).toBeTruthy()
  })

  it("paginacao envia page e size", async () => {
    abrir()
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    await waitFor(() => expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/pedidos?page=1&size=20"))
  })

  it("filtros de status, datas e gratuito voltam a pagina 0; sem canal", async () => {
    abrir()
    await userEvent.click(await screen.findByRole("button", { name: /Próxima/ }))
    expect(screen.queryByLabelText("Canal")).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText("Status"), "AGUARDANDO_PAGAMENTO")
    await userEvent.type(screen.getByLabelText("De"), "2026-11-01")
    await userEvent.type(screen.getByLabelText("Até"), "2026-11-05")
    await userEvent.selectOptions(screen.getByLabelText("Gratuito"), "true")
    await waitFor(() =>
      expect(fetchApi).toHaveBeenLastCalledWith(
        "/api/admin/pedidos?page=0&size=20&status=AGUARDANDO_PAGAMENTO&de=2026-11-01&ate=2026-11-05&gratuito=true",
      ),
    )
  })

  it("busca q com debounce e a dica de e-mail ou CPF exato ou prefixo de id", async () => {
    abrir()
    expect(await screen.findByText(/e-mail exato.*CPF.*começo do id/i)).toBeTruthy()
    await screen.findByText("Ana")
    fetchApi.mockClear()
    await userEvent.type(screen.getByLabelText("Buscar pedidos"), "ana@x.com")
    expect(fetchApi).not.toHaveBeenCalled()
    await waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))
    expect(fetchApi).toHaveBeenLastCalledWith("/api/admin/pedidos?page=0&size=20&q=ana%40x.com")
  })

  it("?id= (link do alerta ao admin) abre o detalhe do pedido", async () => {
    abrir(`/admin/pedidos?id=${ID}`)
    await waitFor(() => expect(fetchApi).toHaveBeenCalledWith(`/api/admin/pedidos/${ID}`))
  })

  it("fechar o detalhe aberto por ?id= limpa o id da URL", async () => {
    abrir(`/admin/pedidos?id=${ID}`)
    await userEvent.click(await screen.findByRole("button", { name: "Fechar" }))
    await waitFor(() => expect(screen.getByTestId("url").textContent).toBe(""))
  })
})
