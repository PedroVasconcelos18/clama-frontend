import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import Confirmacao from "../Confirmacao"
import * as apiModule from "@/lib/api"
import { PastoralApiError } from "@/lib/api"

vi.mock("@/components/clama/StickyNav", () => ({ StickyNav: () => null }))
vi.mock("@/components/clama/Footer", () => ({ Footer: () => null }))

const ID = "12345678-aaaa-bbbb-cccc-1234567890ab"
const PIX = {
  pedidoId: ID,
  copiaECola: "00020126-copia-e-cola",
  qrBase64: "iVBORw0KGgo=",
  expiraEm: "2026-11-12T15:00:00Z",
}

let status: Record<string, unknown>
let pix: () => Promise<unknown>
const mockSpy = () => vi.spyOn(apiModule, "apiFetch")
let spy: ReturnType<typeof mockSpy>

function abrir(query = `?pedido_id=${ID}`) {
  return render(
    <MemoryRouter initialEntries={[`/confirmacao${query}`]}>
      <Confirmacao />
    </MemoryRouter>,
  )
}

const chamadas = (metodo: string, caminho: string) =>
  spy.mock.calls.filter(
    ([p, init]) => p === caminho && ((init as RequestInit | undefined)?.method ?? "GET") === metodo,
  ).length

describe("Confirmacao", () => {
  beforeEach(() => {
    status = { id: ID, status: "AGUARDANDO_PAGAMENTO", valorCentavos: 1000 }
    pix = () => Promise.resolve(PIX)
    spy = mockSpy().mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === `/api/pedidos/${ID}` && !init?.method) return { ...status } as never
      if (path === `/api/pedidos/${ID}/pix` && init?.method === "POST") return (await pix()) as never
      throw new Error(`sem mock: ${init?.method ?? "GET"} ${path}`)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("aguardando pagamento: pede o Pix ao abrir e mostra o QR e o copia-e-cola", async () => {
    abrir()
    expect(await screen.findByText(PIX.copiaECola)).toBeInTheDocument()
    expect(screen.getByAltText("QR code Pix para pagamento").getAttribute("src")).toBe(
      `data:image/png;base64,${PIX.qrBase64}`,
    )
    expect(screen.getByText("Quase lá — pague com Pix")).toBeInTheDocument()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(1)
  })

  it("pedido pago nao pede Pix e mostra que a oracao esta a caminho", async () => {
    status.status = "PAGO"
    abrir()
    expect(await screen.findByText("Seu clamor foi recebido")).toBeInTheDocument()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(0)
  })

  it("faz polling a cada 5 s e troca a tela quando o pagamento cai, sem pedir outro Pix", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    abrir()
    expect(await screen.findByText(PIX.copiaECola)).toBeInTheDocument()
    status.status = "GERANDO_ORACAO"
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(await screen.findByText("Seu clamor foi recebido")).toBeInTheDocument()
    expect(screen.queryByText(PIX.copiaECola)).toBeNull()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(1)
  })

  it("enviada mostra a oracao", async () => {
    status = { id: ID, status: "ENVIADA", oracaoGerada: "Senhor, ouve o clamor." }
    abrir()
    expect(await screen.findByText("Senhor, ouve o clamor.")).toBeInTheDocument()
    expect(screen.getByText("Sua oração já está aí!")).toBeInTheDocument()
  })

  it("erro mostra a mensagem pastoral do servidor", async () => {
    status = { id: ID, status: "ERRO", mensagemPastoral: "Sua oração será enviada em até 24 horas." }
    abrir()
    expect(await screen.findByText("Sua oração será enviada em até 24 horas.")).toBeInTheDocument()
  })

  it("falha do Pix mostra a mensagem pastoral e o tentar de novo reusa o mesmo pedido", async () => {
    const msg = "Não conseguimos gerar o Pix agora. Tente de novo em alguns minutos."
    pix = () => Promise.reject(new PastoralApiError("Erro", "pagamento_indisponivel", msg, 503))
    abrir()
    expect(await screen.findByText(msg)).toBeInTheDocument()
    pix = () => Promise.resolve(PIX)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findByText(PIX.copiaECola)).toBeInTheDocument()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(2)
    expect(spy.mock.calls.some(([p]) => p === "/api/pedidos" || p === "/api/doacoes")).toBe(false)
  })

  it("pedido inexistente mostra o 404 pastoral", async () => {
    spy.mockRejectedValue(
      new PastoralApiError("Erro", "pedido_nao_encontrado", "Não encontramos esse pedido.", 404),
    )
    abrir()
    expect(await screen.findByText("Não encontramos esse pedido.")).toBeInTheDocument()
  })

  it("sem pedido_id avisa sem chamar a API", async () => {
    abrir("")
    expect(await screen.findByText(/Pedido não encontrado/)).toBeInTheDocument()
    await waitFor(() => expect(spy).not.toHaveBeenCalled())
  })
})
