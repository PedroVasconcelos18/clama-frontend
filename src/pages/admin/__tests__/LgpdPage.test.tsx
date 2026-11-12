import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LgpdPage from "../LgpdPage"

const fetchApi = vi.fn<(path: string, init?: { body?: string }) => Promise<unknown>>()
let papel = "SUPERUSUARIO"
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ fetchApi }) }))
vi.mock("@/contexts/SessaoContext", () => ({ useSessao: () => ({ usuario: { id: 1, papel } }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const EMAIL = "maria@x.com"
const PREVIA = {
  contas: [{ id: 5, papel: "CLIENTE" }], contaIds: [5], pedidoIds: ["p1", "p2", "p3"], freemiumBloqueado: true,
  pedidos: { total: 3, aApagar: 1, aAnonimizar: 2, emProcessamento: 0 },
  blog: { comentarios: 4, curtidas: 6, banido: false },
}

const montar = (state?: object) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/admin/lgpd", state }]}>
      <LgpdPage />
    </MemoryRouter>,
  )

async function buscar() {
  await userEvent.click(screen.getByRole("button", { name: "Buscar" }))
  await screen.findByLabelText("Prévia")
}
const chamadasPost = (rota: string) => fetchApi.mock.calls.filter(([p]) => p === `/api/admin/lgpd/${rota}`)

describe("LgpdPage", () => {
  beforeEach(() => {
    papel = "SUPERUSUARIO"
    fetchApi.mockReset().mockResolvedValue(PREVIA)
  })

  it("busca com o e-mail no corpo (nunca na URL) e mostra a prévia com as contagens", async () => {
    montar({ email: EMAIL })
    expect((screen.getByLabelText("E-mail do titular") as HTMLInputElement).value).toBe(EMAIL)
    await buscar()
    expect(fetchApi).toHaveBeenCalledWith("/api/admin/lgpd/busca", { method: "POST", body: JSON.stringify({ email: EMAIL }), showToast: false })
    expect(fetchApi.mock.calls.every(([p]) => !String(p).includes("@") && !String(p).includes("maria"))).toBe(true)
    expect(screen.getByText(/1 pedido será apagado/)).toBeTruthy()
    expect(screen.getByText(/2 pedidos serão anonimizados \(têm pagamento\)/)).toBeTruthy()
    expect(screen.getByText(/1 conta será excluída/)).toBeTruthy()
    expect(screen.getByText(/4 comentários apagados e 6 curtidas apagadas/)).toBeTruthy()
  })

  it("exportar baixa o JSON por POST com o e-mail no corpo", async () => {
    const fetchReal = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Disposition": 'attachment; filename="lgpd_x.json"' } }),
    )
    vi.stubGlobal("fetch", fetchReal)
    URL.createObjectURL = vi.fn(() => "blob:x")
    URL.revokeObjectURL = vi.fn()
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    montar({ email: EMAIL })
    await buscar()
    await userEvent.click(screen.getByRole("button", { name: "Exportar dados (JSON)" }))
    await waitFor(() => expect(clique).toHaveBeenCalled())
    const [url, init] = fetchReal.mock.calls[0] as [string, RequestInit & { body: string }]
    expect(url).toBe("/api/admin/lgpd/exportacao")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ email: EMAIL })
    vi.unstubAllGlobals()
    clique.mockRestore()
  })

  it("exportar com clique duplo exporta uma vez só e revoga a URL depois do clique", async () => {
    let liberar: (r: Response) => void = () => {}
    const fetchReal = vi.fn().mockReturnValue(new Promise<Response>((res) => { liberar = res }))
    vi.stubGlobal("fetch", fetchReal)
    URL.createObjectURL = vi.fn(() => "blob:x")
    URL.revokeObjectURL = vi.fn()
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    montar({ email: EMAIL })
    await buscar()
    const botao = screen.getByRole("button", { name: "Exportar dados (JSON)" }) as HTMLButtonElement
    await userEvent.dblClick(botao)
    expect(fetchReal).toHaveBeenCalledTimes(1)
    expect(botao.disabled).toBe(true)
    liberar(new Response("{}", { status: 200 }))
    await waitFor(() => expect(clique).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x"))
    await waitFor(() => expect(botao.disabled).toBe(false))
    vi.unstubAllGlobals()
    clique.mockRestore()
  })

  it("excluir só habilita com o e-mail igual e manda os ids da prévia", async () => {
    montar({ email: EMAIL })
    await buscar()
    fetchApi.mockResolvedValue({ pedidosApagados: 1, pedidosAnonimizados: 2, contasExcluidas: 1 })
    await userEvent.click(screen.getByRole("button", { name: "Excluir dados" }))
    const confirmar = screen.getAllByRole("button", { name: "Excluir dados" }).at(-1) as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    await userEvent.type(screen.getByLabelText(/Digite/), "outro@x.com")
    expect(confirmar.disabled).toBe(true)
    await userEvent.clear(screen.getByLabelText(/Digite/))
    await userEvent.type(screen.getByLabelText(/Digite/), "MARIA@x.com")
    expect(confirmar.disabled).toBe(false)
    expect(chamadasPost("exclusao")).toHaveLength(0)
    await userEvent.click(confirmar)
    await waitFor(() =>
      expect(chamadasPost("exclusao")[0]![1]!.body).toBe(
        JSON.stringify({ email: EMAIL, confirmacao: "MARIA@x.com", pedidoIds: ["p1", "p2", "p3"], contaIds: [5] }),
      ),
    )
    expect(await screen.findByText(/1 pedido apagado, 2 anonimizados, 1 conta excluída/)).toBeTruthy()
  })

  it("ADMIN não vê Excluir dados, mas apaga só o blog digitando o e-mail", async () => {
    papel = "ADMIN"
    montar({ email: EMAIL })
    await buscar()
    expect(screen.queryByRole("button", { name: "Excluir dados" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Apagar só o blog" }))
    const confirmar = screen.getByRole("button", { name: "Apagar o blog" }) as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)
    await userEvent.type(screen.getByLabelText(/Digite/), EMAIL)
    fetchApi.mockImplementation(async (p: string) => (p.endsWith("exclusao-do-blog") ? { comentarios: 4, curtidas: 6 } : PREVIA))
    await userEvent.click(confirmar)
    await waitFor(() =>
      expect(chamadasPost("exclusao-do-blog")[0]![1]!.body).toBe(JSON.stringify({ email: EMAIL, confirmacao: EMAIL })),
    )
    expect(await screen.findByText(/Blog apagado: 4 comentários e 6 curtidas/)).toBeTruthy()
  })

  it("409 mostra a mensagem e pede nova busca (a prévia some)", async () => {
    montar({ email: EMAIL })
    await buscar()
    fetchApi.mockRejectedValue({ pastoralMessage: "Os dados mudaram.", httpStatus: 409 })
    await userEvent.click(screen.getByRole("button", { name: "Excluir dados" }))
    await userEvent.type(screen.getByLabelText(/Digite/), EMAIL)
    await userEvent.click(screen.getAllByRole("button", { name: "Excluir dados" }).at(-1)!)
    expect(await screen.findByText(/Os dados mudaram\. Faça uma nova busca/)).toBeTruthy()
    expect(screen.queryByLabelText("Prévia")).toBeNull()
  })
})
