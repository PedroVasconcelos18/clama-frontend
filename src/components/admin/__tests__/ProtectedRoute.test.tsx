import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect, vi, afterEach } from "vitest"

import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import { SessaoProvider } from "@/contexts/SessaoContext"
import { mockApiFetch, usuarioFixture } from "@/test/sessao"

function montar() {
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <SessaoProvider>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><p>painel</p></ProtectedRoute>} />
          <Route path="/admin/login" element={<p>tela de login</p>} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe("ProtectedRoute", () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(["ADMIN", "SUPERUSUARIO"])("%s entra", async (papel) => {
    mockApiFetch({ usuario: { ...usuarioFixture, papel } })
    montar()
    expect(await screen.findByText("painel")).toBeTruthy()
  })

  it.each([["CLIENTE", usuarioFixture], ["anônimo", null]])("%s vai para /admin/login", async (_n, usuario) => {
    mockApiFetch({ usuario })
    montar()
    expect(await screen.findByText("tela de login")).toBeTruthy()
  })
})
