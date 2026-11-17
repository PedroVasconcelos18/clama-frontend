import { render, screen, waitFor, fireEvent, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PastoralApiError } from "@/lib/api"
import InstituicoesPage from "../InstituicoesPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const inst = { id: 5, nome: "Mar de Espanha", ordem: 1, ativo: true, logoUrl: "/api/instituicoes/5/logo?v=abcd1234", temLogo: true }
const sem = { ...inst, id: 6, nome: "Sem Logo", logoUrl: null, temLogo: false }
type Escrita = [string, { method: string; body: any }] // eslint-disable-line @typescript-eslint/no-explicit-any
const escritas = () => fetchApi.mock.calls.filter(([, i]) => i?.method) as Escrita[]
const png = (nome = "l.png", tipo = "image/png", bytes = 10) =>
  new File([new Uint8Array(bytes)], nome, { type: tipo })

describe("InstituicoesPage", () => {
  beforeEach(() => {
    fetchApi.mockReset().mockImplementation(async (_p: string, init?: RequestInit) =>
      init?.method ? { ...inst, id: 9 } : [inst, sem],
    )
  })

  it("lista de /api/admin/instituicoes e mostra a logo pelo logoUrl", async () => {
    render(<InstituicoesPage />)
    expect(await screen.findByText("Mar de Espanha")).toBeTruthy()
    expect(fetchApi.mock.calls[0]![0]).toBe("/api/admin/instituicoes")
    expect(document.querySelector('img[src="/api/instituicoes/5/logo?v=abcd1234"]')).toBeTruthy()
  })

  it("criar manda JSON e, so com arquivo escolhido, um PUT multipart da logo", async () => {
    render(<InstituicoesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
    await userEvent.type(screen.getByLabelText("Nome"), "Nova")
    await userEvent.upload(screen.getByLabelText("Logo"), png())
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(escritas()).toHaveLength(2))
    const [[p1, i1], [p2, i2]] = escritas() as [Escrita, Escrita]
    expect([p1, i1.method]).toEqual(["/api/admin/instituicoes", "POST"])
    expect(JSON.parse(i1.body)).toMatchObject({ nome: "Nova" })
    expect([p2, i2.method]).toEqual(["/api/admin/instituicoes/9/logo", "PUT"])
    expect(i2.body).toBeInstanceOf(FormData)
    expect((i2.body as FormData).get("logo")).toBeInstanceOf(File)
  })

  it("salvar com meta R$ 1.000,00 envia metaMensalCentavos 100000 e campo vazio vira null", async () => {
    render(<InstituicoesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
    await userEvent.type(screen.getByLabelText("Nome"), "Nova")
    await userEvent.type(screen.getByLabelText("Causa"), "Hemodiálise")
    await userEvent.type(screen.getByLabelText("Meta mensal (R$)"), "1.000,00")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(JSON.parse(escritas()[0]![1].body)).toMatchObject({
      causa: "Hemodiálise", metaMensalCentavos: 100000, custoUnidadeCentavos: null, unidade: null,
    })
  })

  it.each([["Meta mensal (R$)", "0,00"], ["Meta mensal (R$)", "abc"], ["Custo por unidade (R$)", "0"], ["Custo por unidade (R$)", "abc"]])(
    "%s com %s mostra erro e não envia", async (rotulo, valor) => {
      render(<InstituicoesPage />)
      await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
      await userEvent.type(screen.getByLabelText("Nome"), "Nova")
      await userEvent.type(screen.getByLabelText(rotulo), valor)
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
      expect(await screen.findByText("Informe um valor maior que zero, ou deixe em branco.")).toBeTruthy()
      expect(escritas()).toHaveLength(0)
    })

  it("editar mostra as metas atuais e limpar o campo envia null", async () => {
    fetchApi.mockImplementation(async (_p: string, init?: RequestInit) =>
      init?.method ? { ...inst } : [{ ...inst, causa: "Renal", metaMensalCentavos: 100000, custoUnidadeCentavos: 25000, unidade: "sessão" }])
    render(<InstituicoesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Editar/ }))
    expect((screen.getByLabelText("Meta mensal (R$)") as HTMLInputElement).value).toBe("1000,00")
    await userEvent.clear(screen.getByLabelText("Meta mensal (R$)"))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(JSON.parse(escritas()[0]![1].body)).toMatchObject({
      causa: "Renal", metaMensalCentavos: null, custoUnidadeCentavos: 25000, unidade: "sessão",
    })
  })

  it("sem arquivo, so a chamada JSON", async () => {
    render(<InstituicoesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
    await userEvent.type(screen.getByLabelText("Nome"), "Nova")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
  })

  it("valida tipo e tamanho no cliente antes de enviar", async () => {
    render(<InstituicoesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
    const campo = screen.getByLabelText("Logo")
    fireEvent.change(campo, { target: { files: [png("a.svg", "image/svg+xml")] } })
    expect(await screen.findByText(/Formato não aceito/)).toBeTruthy()
    fireEvent.change(campo, { target: { files: [png("a.png", "image/png", 250 * 1024 + 1)] } })
    expect(await screen.findByText(/passa de 250 KB/)).toBeTruthy()
    await userEvent.type(screen.getByLabelText("Nome"), "X")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1)) // so o JSON, a logo invalida nao vai
  })

  it("logo_invalida e arquivo_grande_demais do servidor aparecem no campo da logo", async () => {
    for (const codigo of ["logo_invalida", "arquivo_grande_demais"]) {
      fetchApi.mockReset().mockImplementation(async (p: string, init?: RequestInit) => {
        if (p.endsWith("/logo")) throw new PastoralApiError("Erro", codigo, `msg-${codigo}`, 400)
        return init?.method ? { ...inst, id: 9 } : [inst]
      })
      const { unmount } = render(<InstituicoesPage />)
      await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
      await userEvent.type(screen.getByLabelText("Nome"), "N")
      await userEvent.upload(screen.getByLabelText("Logo"), png())
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
      expect(await screen.findByText(`msg-${codigo}`)).toBeTruthy()
      unmount()
    }
  })

  it("Remover logo pede confirmacao: cancelar nao remove", async () => {
    render(<InstituicoesPage />)
    await screen.findByText("Mar de Espanha")
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]!)
    await userEvent.click(await screen.findByRole("button", { name: "Remover logo" }))
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Remover logo" })).getByRole("button", { name: "Cancelar" }))
    expect(escritas()).toHaveLength(0)
  })

  it("Remover logo so quando temLogo, e faz DELETE depois de confirmar", async () => {
    render(<InstituicoesPage />)
    await screen.findByText("Mar de Espanha")
    const editar = screen.getAllByRole("button", { name: "Editar" })
    await userEvent.click(editar[1]!) // sem logo
    expect(screen.queryByRole("button", { name: "Remover logo" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await userEvent.click(editar[0]!)
    await userEvent.click(await screen.findByRole("button", { name: "Remover logo" }))
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Remover logo" })).getByRole("button", { name: "Remover" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0]![0]).toBe("/api/admin/instituicoes/5/logo")
    expect(escritas()[0]![1].method).toBe("DELETE")
  })

  it("desativar usa PATCH {ativo:false}; nome duplicado vira erro no campo", async () => {
    render(<InstituicoesPage />)
    await userEvent.click((await screen.findAllByRole("button", { name: "Desativar" }))[0]!)
    await userEvent.click(screen.getAllByRole("button", { name: "Desativar" }).at(-1)!)
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0]![0]).toBe("/api/admin/instituicoes/5")
    expect(JSON.parse(escritas()[0]![1].body)).toEqual({ ativo: false })
  })

  it("erro por campo (nome duplicado) aparece embaixo do nome", async () => {
    fetchApi.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method) throw new PastoralApiError("Erro", "dados_invalidos", "Confira", 400, {}, { nome: "Já existe." })
      return [inst]
    })
    render(<InstituicoesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Nova Instituição/ }))
    await userEvent.type(screen.getByLabelText("Nome"), "Mar de Espanha")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText("Já existe.")).toBeTruthy()
  })
})
