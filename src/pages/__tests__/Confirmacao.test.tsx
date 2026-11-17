import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import Confirmacao from "../Confirmacao"
import * as apiModule from "@/lib/api"
import { PastoralApiError } from "@/lib/api"

vi.mock("@/components/clama/StickyNav", () => ({ StickyNav: () => null }))
vi.mock("@/components/clama/Footer", () => ({ Footer: () => null }))

let usuario: unknown = null
vi.mock("@/contexts/SessaoContext", () => ({ useSessao: () => ({ usuario, carregando: false }) }))

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

function abrir(query = `?pedido_id=${ID}`, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/confirmacao", search: query, state }]}>
      <Routes>
        <Route path="/confirmacao" element={<Confirmacao />} />
        <Route path="/login" element={<p>tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const chamadas = (metodo: string, caminho: string) =>
  spy.mock.calls.filter(
    ([p, init]) => p === caminho && ((init as RequestInit | undefined)?.method ?? "GET") === metodo,
  ).length

describe("Confirmacao", () => {
  beforeEach(() => {
    usuario = null
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

  it("aguardando confirmação do e-mail: pede para confirmar, não pede Pix e segue consultando", async () => {
    status.status = "AGUARDANDO_CONFIRMACAO_EMAIL"
    abrir()
    expect(await screen.findByText("Confirme seu e-mail")).toBeInTheDocument()
    expect(screen.getByText(/O link vale 24 horas/)).toBeInTheDocument()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(0)
    expect(screen.getByText("Atualizando status...")).toBeInTheDocument()
  })

  it("confirmação expirada: avisa, para de consultar e não pede Pix", async () => {
    status.status = "CONFIRMACAO_EXPIRADA"
    abrir()
    expect(await screen.findByText("O link de confirmação venceu")).toBeInTheDocument()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(0)
    expect(screen.queryByText("Atualizando status...")).toBeNull()
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

  it("polling para em ENVIADA: nao consulta de novo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    status = { id: ID, status: "ENVIADA", oracaoGerada: "Senhor, ouve." }
    abrir()
    expect(await screen.findByText("Senhor, ouve.")).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(chamadas("GET", `/api/pedidos/${ID}`)).toBe(1)
  })

  it("polling para em ERRO: nao consulta de novo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    status = { id: ID, status: "ERRO", mensagemPastoral: "Estamos cuidando." }
    abrir()
    expect(await screen.findByText("Estamos cuidando.")).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(chamadas("GET", `/api/pedidos/${ID}`)).toBe(1)
  })

  it("polling segue de GERANDO_ORACAO ate ENVIADA e mostra a oracao", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    status.status = "GERANDO_ORACAO"
    abrir()
    expect(await screen.findByText("Seu clamor foi recebido")).toBeInTheDocument()
    status = { id: ID, status: "ENVIADA", oracaoGerada: "Amém, Senhor." }
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(await screen.findByText("Amém, Senhor.")).toBeInTheDocument()
  })

  it("Pix vencido com a tela aberta: 'Gerar novo Pix' pede outra cobranca", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const venceEm = Date.now() + 60_000
    pix = () => Promise.resolve({ ...PIX, expiraEm: new Date(venceEm).toISOString() })
    abrir()
    expect(await screen.findByText(PIX.copiaECola)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Gerar novo Pix" })).toBeNull()

    pix = () => Promise.resolve({ ...PIX, copiaECola: "00020126-novo", expiraEm: new Date(venceEm + 3_600_000).toISOString() })
    await act(() => vi.advanceTimersByTimeAsync(75_000))
    await userEvent.click(await screen.findByRole("button", { name: "Gerar novo Pix" }))
    expect(await screen.findByText("00020126-novo")).toBeInTheDocument()
    expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(2)
    expect(screen.queryByRole("button", { name: "Gerar novo Pix" })).toBeNull()
  })

  it("falha do 'Gerar novo Pix' mostra a mensagem e mantem o QR antigo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    pix = () => Promise.resolve({ ...PIX, expiraEm: new Date(Date.now() + 60_000).toISOString() })
    abrir()
    expect(await screen.findByText(PIX.copiaECola)).toBeInTheDocument()
    const msg = "Não conseguimos gerar o Pix agora."
    pix = () => Promise.reject(new PastoralApiError("Erro", "pagamento_indisponivel", msg, 503))
    await act(() => vi.advanceTimersByTimeAsync(75_000))
    await userEvent.click(await screen.findByRole("button", { name: "Gerar novo Pix" }))
    expect(await screen.findByText(msg)).toBeInTheDocument()
    expect(screen.getByText(PIX.copiaECola)).toBeInTheDocument()
  })

  it("relogio adiantado: expiraEm repetido esconde o botao de novo", async () => {
    pix = () => Promise.resolve({ ...PIX, expiraEm: "2020-01-01T00:00:00Z" }) // o relogio do navegador diz "vencido"; o servidor reaproveita a mesma cobranca
    abrir()
    await userEvent.click(await screen.findByRole("button", { name: "Gerar novo Pix" }))
    await waitFor(() => expect(chamadas("POST", `/api/pedidos/${ID}/pix`)).toBe(2))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Gerar novo Pix" })).toBeNull())
    expect(screen.getByText(PIX.copiaECola)).toBeInTheDocument()
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

  it("falha no polling dobra o intervalo (5 s → 10 s → 20 s) e, após 3 falhas sem status, mostra o erro", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const gets = () => chamadas("GET", `/api/pedidos/${ID}`)
    spy.mockRejectedValue(new PastoralApiError("Erro", "network_error", "Tivemos um soluço na conexão.", 0))
    abrir()
    await waitFor(() => expect(gets()).toBe(1))
    expect(screen.queryByText("Tivemos um soluço na conexão.")).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(gets()).toBe(1) // não tentou de novo em 5 s
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(gets()).toBe(2) // 10 s
    await act(() => vi.advanceTimersByTimeAsync(20000))
    expect(gets()).toBe(3) // 20 s
    expect(await screen.findByText("Tivemos um soluço na conexão.")).toBeInTheDocument()
  })

  it("429 espera 60 s antes de consultar de novo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const gets = () => chamadas("GET", `/api/pedidos/${ID}`)
    spy.mockRejectedValueOnce(new PastoralApiError("Erro", "limite", "Calma.", 429))
    abrir()
    await waitFor(() => expect(gets()).toBe(1))
    await act(() => vi.advanceTimersByTimeAsync(59000))
    expect(gets()).toBe(1)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(gets()).toBe(2)
  })

  it("depois de 180 consultas sem status final: mensagem calma e 'Atualizar' reinicia o polling", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    status.status = "GERANDO_ORACAO"
    const gets = () => chamadas("GET", `/api/pedidos/${ID}`)
    abrir()
    await waitFor(() => expect(gets()).toBe(1))
    expect(screen.getByText("Atualizando status...")).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(179 * 5000))
    expect(gets()).toBe(180)
    expect(await screen.findByText(/ainda está sendo preparada e chegará no seu e-mail/)).toBeInTheDocument()
    expect(screen.queryByText("Atualizando status...")).toBeNull()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(gets()).toBe(180) // parou

    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }))
    await waitFor(() => expect(gets()).toBe(181))
    expect(screen.getByText("Atualizando status...")).toBeInTheDocument()
  })

  describe("oração na tela e senha na hora", () => {
    const enviada = () => {
      status = { id: ID, status: "ENVIADA", oracaoGerada: "Senhor, ouve o clamor." }
    }

    it("oracaoEnviadaMostraTextoEAvisoDeIa", async () => {
      enviada()
      const imprimir = vi.spyOn(window, "print").mockImplementation(() => {})
      abrir()
      const oracao = await screen.findByText("Senhor, ouve o clamor.")
      expect(oracao.closest("[data-imprimir]")).not.toBeNull()
      expect(screen.getByText("Escrita com ajuda de IA a partir das suas palavras.")).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Baixar em PDF" }))
      expect(imprimir).toHaveBeenCalledOnce()
      expect(screen.getAllByRole("link", { name: /whatsapp/i }).length).toBeGreaterThan(0)
      expect(document.body.textContent).not.toMatch(/Marta|intercessor/i)
    })

    it("a espera nao fala de intercessor nem de mural", async () => {
      status.status = "PAGO"
      abrir()
      expect(
        await screen.findByText(
          "Estamos preparando sua oração. Ela também chega no seu e-mail. Pode fechar esta página, nada se perde.",
        ),
      ).toBeInTheDocument()
      expect(document.body.textContent).not.toMatch(/Marta|intercessor|mural|quem também clamou/i)
    })

    it("conviteComTokenDefineSenha", async () => {
      enviada()
      spy.mockImplementation(async (path: string) => {
        if (path === "/api/auth/redefinicao-de-senha") return { mensagem: "ok" } as never
        return { ...status } as never
      })
      abrir(`?pedido_id=${ID}`, { tokenDeSenha: "tk-tela" })
      await userEvent.type(await screen.findByLabelText("Crie uma senha"), "senha-forte-123")
      await userEvent.click(screen.getByRole("button", { name: "Criar senha" }))
      expect(await screen.findByText("Senha criada — agora é só entrar.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login")
      const chamada = spy.mock.calls.find(([p]) => p === "/api/auth/redefinicao-de-senha")!
      expect(JSON.parse((chamada[1] as RequestInit).body as string)).toEqual({
        token: "tk-tela",
        novaSenha: "senha-forte-123",
      })
    })

    it("erro ao definir a senha mostra a mensagem do servidor e mantem o formulario", async () => {
      enviada()
      spy.mockImplementation(async (path: string) => {
        if (path === "/api/auth/redefinicao-de-senha")
          throw new PastoralApiError("Erro", "link_invalido", "Esse link não é mais válido.", 400)
        return { ...status } as never
      })
      abrir(`?pedido_id=${ID}`, { tokenDeSenha: "tk-velho" })
      await userEvent.type(await screen.findByLabelText("Crie uma senha"), "senha-forte-123")
      await userEvent.click(screen.getByRole("button", { name: "Criar senha" }))
      expect(await screen.findByText("Esse link não é mais válido.")).toBeInTheDocument()
      expect(screen.getByLabelText("Crie uma senha")).toBeInTheDocument()
    })

    it("pagoAnonimoSemTokenMostraAvisoDoEmail", async () => {
      enviada()
      abrir()
      expect(await screen.findByText("Enviamos no seu e-mail o link para criar sua senha.")).toBeInTheDocument()
      expect(screen.queryByLabelText("Crie uma senha")).not.toBeInTheDocument()
    })

    it("freemiumComContaJaExistenteMandaEntrar", async () => {
      enviada()
      abrir(`?pedido_id=${ID}`, { tokenDeSenha: null })
      expect(await screen.findByText("Você já tem conta no Clama. Entre para guardar esta oração.")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login")
      expect(screen.queryByText(/link para criar sua senha/)).not.toBeInTheDocument()
    })

    it("logadoNaoVeConvite", async () => {
      usuario = { id: 1 }
      enviada()
      abrir(`?pedido_id=${ID}`, { tokenDeSenha: "tk" })
      await screen.findByText("Senhor, ouve o clamor.")
      expect(screen.queryByLabelText("Crie uma senha")).not.toBeInTheDocument()
      expect(screen.queryByText(/link para criar sua senha/)).not.toBeInTheDocument()
    })
  })
})
