import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PastoralApiError } from "@/lib/api"
import { toast } from "sonner"
import DocumentosPage from "../DocumentosPage"

const fetchApi = vi.fn()
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const doc = {
  id: 5, nome: "Manual", fileId: "file_1", mime: "application/pdf", tamanhoBytes: 2048,
  ativo: false, criadoEm: "2026-11-10T10:00:00Z", atualizadoEm: "2026-11-10T10:00:00Z",
}
const escritas = () => fetchApi.mock.calls.filter(([, i]) => i?.method)
const pdf = () => new File(["%PDF"], "a.pdf", { type: "application/pdf" })

async function abrirNovo(nome = "Novo doc") {
  await userEvent.click(await screen.findByRole("button", { name: /Novo/ }))
  await userEvent.type(screen.getByLabelText("Nome"), nome)
}
const arquivo = () => screen.getByLabelText("Arquivo") as HTMLInputElement
const erro = (status: number, codigo: string, m = "Mensagem pastoral") => new PastoralApiError("Erro", codigo, m, status)

describe("DocumentosPage", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    fetchApi.mockReset().mockImplementation(async (_p: string, init?: RequestInit) =>
      init?.method ? { ...doc, id: 9 } : [doc],
    )
  })

  it("lista nome, tipo, tamanho, status e data", async () => {
    render(<DocumentosPage />)
    await screen.findByText("Manual")
    const l = screen.getByText("Manual").closest("tr")!
    expect(l.textContent).toContain("PDF")
    expect(l.textContent).toContain("2,0 KB")
    expect(l.textContent).toContain("Inativo")
  })

  it("barra tipo invalido no cliente, sem chamar a API", async () => {
    render(<DocumentosPage />)
    await abrirNovo()
    fireEvent.change(arquivo(), { target: { files: [new File(["x"], "a.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] } })
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(await screen.findByText(/Envie um arquivo PDF/)).toBeTruthy()
    expect(escritas()).toHaveLength(0)
  })

  it("barra arquivo acima de 32 MB no cliente", async () => {
    render(<DocumentosPage />)
    await abrirNovo()
    const grande = pdf()
    Object.defineProperty(grande, "size", { value: 32 * 1024 * 1024 + 1 })
    fireEvent.change(arquivo(), { target: { files: [grande] } })
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    expect(await screen.findByText(/passa de 32 MB/)).toBeTruthy()
    expect(escritas()).toHaveLength(0)
  })

  it("cria os metadados e depois envia o arquivo cru com o Content-Type dele", async () => {
    render(<DocumentosPage />)
    await abrirNovo()
    const f = pdf()
    fireEvent.change(arquivo(), { target: { files: [f] } })
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(escritas()).toHaveLength(2))
    const [[p1, i1], [p2, i2]] = escritas() as [[string, RequestInit], [string, RequestInit]]
    expect([p1, i1.method, i1.body]).toEqual(["/api/admin/documentos", "POST", JSON.stringify({ nome: "Novo doc" })])
    expect([p2, i2.method, i2.body]).toEqual(["/api/admin/documentos/9/arquivo", "PUT", f])
    expect((i2.headers as Record<string, string>)["Content-Type"]).toBe("application/pdf")
  })

  it("ativar chama PATCH {ativo:true}", async () => {
    render(<DocumentosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Ativar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    const [p, i] = escritas()[0]! as [string, RequestInit]
    expect([p, i.method, i.body]).toEqual(["/api/admin/documentos/5", "PATCH", JSON.stringify({ ativo: true })])
  })

  it("ativar com 409 mostra a mensagem pastoral", async () => {
    fetchApi.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method) throw erro(409, "documento_arquivo_sumiu", "O arquivo sumiu da Anthropic.")
      return [doc]
    })
    render(<DocumentosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Ativar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("O arquivo sumiu da Anthropic."))
  })

  it("ativar o sexto documento (409 limite_documentos_ativos) mostra a mensagem pastoral", async () => {
    fetchApi.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method) throw erro(409, "limite_documentos_ativos", "Já há 5 documentos ativos. Desative um antes.")
      return [doc]
    })
    render(<DocumentosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Ativar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Já há 5 documentos ativos. Desative um antes."))
  })

  it("renomear chama PATCH {nome}", async () => {
    render(<DocumentosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Renomear" }))
    await userEvent.clear(screen.getByLabelText("Novo nome"))
    await userEvent.type(screen.getByLabelText("Novo nome"), "Guia")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0]![1].body).toBe(JSON.stringify({ nome: "Guia" }))
  })

  it("remover pede confirmacao e chama DELETE", async () => {
    render(<DocumentosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Remover" }))
    expect(escritas()).toHaveLength(0)
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remover" }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect([escritas()[0]![0], escritas()[0]![1].method]).toEqual(["/api/admin/documentos/5", "DELETE"])
  })

  it.each([
    [415, "unsupported", "Só PDF ou TXT, por favor."],
    [503, "documento_upload_ocupado", "Muitos envios agora. Tente já já."],
    [409, "documento_conflito", "Outro envio está em andamento."],
  ])("envio com %i mostra a mensagem pastoral", async (status, codigo, m) => {
    fetchApi.mockImplementation(async (p: string, init?: RequestInit) => {
      if (p.endsWith("/arquivo")) throw erro(status, codigo, m)
      return init?.method ? { ...doc, id: 9 } : [doc]
    })
    render(<DocumentosPage />)
    await abrirNovo()
    fireEvent.change(arquivo(), { target: { files: [pdf()] } })
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(m))
  })

  it(".pdf com type application/x-pdf e aceito e sai como application/pdf", async () => {
    render(<DocumentosPage />)
    await abrirNovo()
    fireEvent.change(arquivo(), { target: { files: [new File(["%PDF"], "a.pdf", { type: "application/x-pdf" })] } })
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(escritas()).toHaveLength(2))
    expect(((escritas()[1]![1] as RequestInit).headers as Record<string, string>)["Content-Type"]).toBe("application/pdf")
  })

  it("renomear e remover com falha mantem o dialogo aberto", async () => {
    fetchApi.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method) throw erro(502, "anthropic_falhou", "Falhou.")
      return [doc]
    })
    render(<DocumentosPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Renomear" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    expect((screen.getByLabelText("Novo nome") as HTMLInputElement).value).toBe("Manual")
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "Remover" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remover" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2))
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("POST ok e PUT falho deixa a linha Sem arquivo, e o reenvio funciona", async () => {
    const semArquivo = { ...doc, id: 9, nome: "Novo doc", fileId: null, mime: null, tamanhoBytes: null }
    let lista: object[] = [doc]
    let put = 0
    fetchApi.mockImplementation(async (p: string, init?: RequestInit) => {
      if (p.endsWith("/arquivo")) {
        if (put++ === 0) throw erro(503, "documento_upload_ocupado", "Ocupado.")
        lista = [doc, { ...semArquivo, fileId: "f2", mime: "application/pdf", tamanhoBytes: 4 }]
        return {}
      }
      if (init?.method === "POST") { lista = [doc, semArquivo]; return semArquivo }
      return lista
    })
    render(<DocumentosPage />)
    await abrirNovo()
    fireEvent.change(arquivo(), { target: { files: [pdf()] } })
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ocupado."))
    const linha = (await screen.findByText("Novo doc")).closest("tr")!
    expect(linha.textContent).toContain("Sem arquivo")
    const input = within(linha).getByText("Enviar arquivo").querySelector("input")!
    fireEvent.change(input, { target: { files: [pdf()] } })
    await waitFor(() => expect(put).toBe(2))
    await waitFor(() => expect(screen.getByText("Novo doc").closest("tr")!.textContent).not.toContain("Sem arquivo"))
  })
})
