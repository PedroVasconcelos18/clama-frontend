import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import Entrega from "../Entrega"
import { reaisParaCentavos } from "@/lib/formatters"
import { mockApiFetch, usuarioFixture } from "@/test/sessao"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { PastoralApiError } from "@/lib/api"
import { salvarRascunho, limparRascunho, lerRascunho } from "@/lib/rascunho"

vi.mock("@/lib/captcha/turnstile", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react")
  return {
    getTurnstileSiteKey: () => "chave",
    Turnstile: forwardRef(function Turnstile(
      { onSuccess }: { onSuccess: (t: string) => void },
      ref: React.Ref<{ reset: () => void }>,
    ) {
      useImperativeHandle(ref, () => ({ reset: () => setTimeout(() => onSuccess("token-novo"), 0) }), [onSuccess])
      useEffect(() => {
        const t = setTimeout(() => onSuccess("token-turnstile"), 0)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      return null
    }),
  }
})

const CPF = "52998224725"
const INSTS = [
  { id: 7, nome: "Casa Alfa", logoUrl: null, causa: "Cestas", metaMensalCentavos: 100000, custoUnidadeCentavos: 5000, unidade: "cestas" },
  { id: 8, nome: "Sem Meta", logoUrl: null, causa: null, metaMensalCentavos: null, custoUnidadeCentavos: null, unidade: null },
]
const METAS = { percentual: 50, de: "2026-11-28", ate: "2026-12-27", instituicoes: [{ instituicaoId: 7, arrecadadoCentavos: 25000 }] }

function Local() {
  const l = useLocation()
  return (
    <>
      <p data-testid="local">{l.pathname + l.search}</p>
      <p data-testid="state">{JSON.stringify(l.state)}</p>
    </>
  )
}

function renderEntrega() {
  return render(
    <MemoryRouter initialEntries={["/entrega"]}>
      <SessaoProvider>
        <Routes>
          <Route path="/entrega" element={<Entrega />} />
          <Route path="*" element={<Local />} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

type Post = { path: string; corpo: Record<string, unknown> }

function mockar(opts: { usuario?: object; erro?: PastoralApiError; metas?: unknown; statusDoPedido?: string } = {}) {
  const posts: Post[] = []
  mockApiFetch({
    usuario: opts.usuario,
    outras: (path, init) => {
      if (path === "/api/instituicoes") return INSTS
      if (path === "/api/metas") return opts.metas ?? METAS
      if (path.startsWith("/api/pedidos/ped-") && !init?.method) return { status: opts.statusDoPedido ?? "AGUARDANDO_PAGAMENTO" }
      if (init?.method === "POST") {
        posts.push({ path, corpo: JSON.parse(String(init.body)) })
        if (opts.erro) throw opts.erro
        return { id: "ped-1" }
      }
      throw new Error(`sem mock: ${path}`)
    },
  })
  return posts
}

async function preencher() {
  await userEvent.clear(screen.getByLabelText(/nome/i))
  await userEvent.type(screen.getByLabelText(/nome/i), "Maria Silva")
  await userEvent.clear(screen.getByLabelText(/e-mail/i))
  await userEvent.type(screen.getByLabelText(/e-mail/i), "maria@example.com")
  await userEvent.type(screen.getByLabelText(/cpf/i), CPF)
}

const enviar = () => userEvent.click(screen.getByRole("button", { name: /enviar|contribuir/i }))
const escolher = (nome: RegExp | string) => userEvent.click(screen.getByRole("radio", { name: nome }))

const SEM_CAMPOS_ANTIGOS = (corpo: Record<string, unknown>) => {
  expect(corpo).not.toHaveProperty("idade")
  expect(corpo).not.toHaveProperty("sexo")
  expect(corpo).not.toHaveProperty("telefone")
}

describe("Entrega", () => {
  beforeEach(() => {
    localStorage.clear()
    limparRascunho()
    salvarRascunho({ tema: "luto", texto: "Perdi minha mãe", risco: false, consentAceito: true })
  })
  afterEach(() => vi.restoreAllMocks())

  it("entregaSemRascunhoVoltaParaInicio", async () => {
    limparRascunho()
    mockar()
    renderEntrega()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent(/^\/$/))
  })

  it.each([
    [null, true],
    [true, true],
    [false, false],
  ])("risco %s: aviso do CVV visível = %s", async (risco, visivel) => {
    salvarRascunho({ tema: null, texto: "texto", risco, consentAceito: true })
    mockar()
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    const aviso = screen.queryByRole("note", { name: /apoio em crise/i })
    if (visivel) {
      expect(aviso).toBeInTheDocument()
      const contribuicao = screen.getByRole("heading", { name: /sua contribuição/i })
      expect(aviso!.compareDocumentPosition(contribuicao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    } else {
      expect(aviso).toBeNull()
    }
  })

  it("ofertaPagaExigeInstituicao", async () => {
    const posts = mockar()
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await enviar()
    expect(await screen.findByText(/escolha a instituição/i)).toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it("instituicaoSemMetaNaoMostraBarra", async () => {
    mockar()
    renderEntrega()
    await escolher(/R\$\s?25/)
    expect(await screen.findByText("Casa Alfa")).toBeInTheDocument()
    const barras = screen.getAllByRole("progressbar")
    expect(barras).toHaveLength(1)
    expect(barras[0]).toHaveAttribute("aria-valuenow", "25")
  })

  it("a barra passa de 100 e trava em 100", async () => {
    mockar({ metas: { ...METAS, instituicoes: [{ instituicaoId: 7, arrecadadoCentavos: 250000 }] } })
    renderEntrega()
    await escolher(/R\$\s?25/)
    expect(await screen.findByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  it("usa o percentual de /api/metas no texto", async () => {
    mockar()
    renderEntrega()
    await escolher(/R\$\s?25/)
    expect(await screen.findByText(/50% da sua contribuição/)).toBeInTheDocument()
  })

  it("anônimo gratuito: /api/freemium/pedidos e vai para /confirmado", async () => {
    const posts = mockar()
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await waitFor(() => expect(screen.getByRole("button", { name: /enviar/i })).toBeEnabled())
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/confirmado"))
    expect(screen.getByTestId("state")).toHaveTextContent('{"email":"maria@example.com"}')
    expect(screen.getByTestId("local")).not.toHaveTextContent("maria")
    expect(posts[0]!.path).toBe("/api/freemium/pedidos")
    expect(posts[0]!.corpo).toMatchObject({
      tema: "luto",
      pedidoOracao: "Perdi minha mãe",
      cpfCnpj: CPF,
      consentAceito: true,
      turnstileToken: "token-turnstile",
    })
    SEM_CAMPOS_ANTIGOS(posts[0]!.corpo)
    expect(lerRascunho()).toBeNull()
  })

  it("anônimo pago: /api/doacoes com valor e instituição, vai para /confirmacao", async () => {
    const posts = mockar()
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/confirmacao?pedido_id=ped-1"))
    expect(posts[0]!.path).toBe("/api/doacoes")
    expect(posts[0]!.corpo).toMatchObject({
      tema: "luto",
      pedidoOracao: "Perdi minha mãe",
      cpfCnpj: CPF,
      consentAceito: true,
      valorCentavos: 2500,
      instituicao: 7,
      turnstileToken: "token-turnstile",
    })
    SEM_CAMPOS_ANTIGOS(posts[0]!.corpo)
  })

  it("logado gratuito: /api/pedidos/gratuito, com nome e e-mail da sessão", async () => {
    const posts = mockar({ usuario: usuarioFixture })
    renderEntrega()
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).toHaveValue("Pedro"))
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue("fiel@example.com")
    await userEvent.type(screen.getByLabelText(/cpf/i), CPF)
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/confirmacao?pedido_id=ped-1"))
    expect(posts[0]!.path).toBe("/api/pedidos/gratuito")
    expect(posts[0]!.corpo).toMatchObject({ tema: "luto", pedidoOracao: "Perdi minha mãe", cpfCnpj: CPF, consentAceito: true })
    expect(posts[0]!.corpo).not.toHaveProperty("turnstileToken")
    SEM_CAMPOS_ANTIGOS(posts[0]!.corpo)
  })

  it("logado pago: /api/pedidos com valor livre e instituição", async () => {
    const posts = mockar({ usuario: usuarioFixture })
    renderEntrega()
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).toHaveValue("Pedro"))
    await userEvent.type(screen.getByLabelText(/cpf/i), CPF)
    await escolher(/livre/i)
    await userEvent.type(screen.getByLabelText(/valor da contribuição/i), "12,50")
    await userEvent.click(await screen.findByRole("radio", { name: /Sem Meta/ }))
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/confirmacao?pedido_id=ped-1"))
    expect(posts[0]!.path).toBe("/api/pedidos")
    expect(posts[0]!.corpo).toMatchObject({ valorCentavos: 1250, instituicao: 8, tema: "luto" })
    SEM_CAMPOS_ANTIGOS(posts[0]!.corpo)
  })

  it.each(["0,50", "-100"])("valor livre %s (abaixo de R$ 1 ou negativo) não envia", async (digitado) => {
    const posts = mockar()
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/livre/i)
    await userEvent.type(screen.getByLabelText(/valor da contribuição/i), digitado)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    expect(await screen.findByText(/valor mínimo é R\$ 1,00/)).toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it("gratuito_diario mostra a mensagem da API e mantém o rascunho", async () => {
    mockar({
      usuario: usuarioFixture,
      erro: new PastoralApiError("Erro", "gratuito_diario", "Hoje já recebemos o seu clamor. Volte amanhã.", 429),
    })
    renderEntrega()
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).toHaveValue("Pedro"))
    await userEvent.type(screen.getByLabelText(/cpf/i), CPF)
    await enviar()
    expect(await screen.findByText("Hoje já recebemos o seu clamor. Volte amanhã.")).toBeInTheDocument()
    expect(lerRascunho()).not.toBeNull()
  })

  it("conta_existente leva ao /login", async () => {
    mockar({ erro: new PastoralApiError("Erro", "conta_existente", "Você já tem conta.", 409) })
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await waitFor(() => expect(screen.getByRole("button", { name: /enviar/i })).toBeEnabled())
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/login"))
  })

  it("400 dados_invalidos da instituição aparece no campo", async () => {
    mockar({
      erro: new PastoralApiError("Erro", "dados_invalidos", "Confira os dados.", 400, {}, { instituicao: "Escolha uma instituição." }),
    })
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    expect(await screen.findByText("Escolha uma instituição.")).toBeInTheDocument()
  })

  it("não tem checkbox de consentimento (o aceite veio do clamor)", async () => {
    mockar()
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("rascunho de antes do aceite (sem consentAceito) volta ao clamor, sem apagar o texto", async () => {
    localStorage.clear()
    sessionStorage.setItem("clama:rascunho", JSON.stringify({ tema: "luto", texto: "Texto antigo", risco: false }))
    mockar()
    renderEntrega()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent(/^\/$/))
    expect(lerRascunho()?.texto).toBe("Texto antigo")
  })

  it("Editar volta ao clamor", async () => {
    mockar()
    renderEntrega()
    fireEvent.click(await screen.findByRole("link", { name: /editar/i }))
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent(/^\/$/))
  })
  it("pago idêntico em até 24h reusa o pedido: um POST só", async () => {
    const posts = mockar()
    const { unmount } = renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/confirmacao?pedido_id=ped-1"))
    unmount()

    salvarRascunho({ tema: "luto", texto: "Perdi minha mãe", risco: false, consentAceito: true })
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/confirmacao?pedido_id=ped-1"))
    expect(posts).toHaveLength(1)
  })

  it("pedido já pago não é reusado: cria outro", async () => {
    const posts = mockar({ statusDoPedido: "PAGO" })
    const { unmount } = renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("ped-1"))
    unmount()
    salvarRascunho({ tema: "luto", texto: "Perdi minha mãe", risco: false, consentAceito: true })
    renderEntrega()
    await screen.findByLabelText(/nome/i)
    await preencher()
    await escolher(/R\$\s?25/)
    await userEvent.click(await screen.findByRole("radio", { name: /Casa Alfa/ }))
    await enviar()
    await waitFor(() => expect(posts).toHaveLength(2))
  })
})

describe("reaisParaCentavos", () => {
  it.each([
    ["1.000", 100000],
    ["10.000", 1000000],
    ["1.234.567", 123456700],
    ["12.50", 1250],
    ["5.5", 550],
    ["12,50", 1250],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["12", 1200],
    ["-100", 0],
    ["", 0],
    ["abc", 0],
  ])("%s -> %s", (entrada, esperado) => {
    expect(reaisParaCentavos(entrada)).toBe(esperado)
  })
})
