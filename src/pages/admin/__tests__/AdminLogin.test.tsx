import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import AdminLogin from "@/pages/admin/AdminLogin"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { mockApiFetch, usuarioFixture } from "@/test/sessao"

const navigateMock = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return { ...actual, useNavigate: () => navigateMock }
})

async function entrar() {
  render(
    <MemoryRouter initialEntries={["/admin/login"]}>
      <SessaoProvider>
        <AdminLogin />
      </SessaoProvider>
    </MemoryRouter>,
  )
  const botao = screen.getByRole("button", { name: /Entrar/i }) as HTMLButtonElement
  expect(botao.disabled).toBe(true) // sessão ainda carregando
  await waitFor(() => expect(botao.disabled).toBe(false))
  fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "a@x.com" } })
  fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: "segredo" } })
  fireEvent.click(botao)
}

describe("AdminLogin", () => {
  beforeEach(() => navigateMock.mockClear())
  afterEach(() => vi.restoreAllMocks())

  it("admin entra e vai para /admin", async () => {
    mockApiFetch({ outras: () => ({ ...usuarioFixture, papel: "ADMIN" }) })
    await entrar()
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/admin", { replace: true }))
  })

  it("cliente: chama logout e mostra que o espaço é só para admins", async () => {
    const spy = mockApiFetch({ outras: () => usuarioFixture })
    await entrar()
    expect(await screen.findByText("Esse espaço é só para admins do Clama.")).toBeTruthy()
    expect(spy).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }))
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
