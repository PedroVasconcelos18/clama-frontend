import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useFormDraft } from "@/hooks/useFormDraft"

const KEY = "teste:rascunho"
const INICIAL = { planoId: null as number | null }

describe("useFormDraft com versão", () => {
  beforeEach(() => localStorage.clear())

  it("restaura rascunho salvo na versão atual", () => {
    localStorage.setItem(KEY, JSON.stringify({ versao: 2, valor: { planoId: 7 } }))
    const { result } = renderHook(() =>
      useFormDraft(KEY, INICIAL, undefined, 800, { versao: 2 }),
    )
    expect(result.current.value).toEqual({ planoId: 7 })
  })

  it("descarta em silêncio rascunho de versão antiga ou sem versão", () => {
    localStorage.setItem(KEY, JSON.stringify({ planoId: "uuid-antigo" }))
    const { result } = renderHook(() =>
      useFormDraft(KEY, INICIAL, undefined, 800, { versao: 2 }),
    )
    expect(result.current.value).toEqual(INICIAL)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it("descarta rascunho que não passa na validação", () => {
    localStorage.setItem(KEY, JSON.stringify({ versao: 2, valor: { planoId: "abc" } }))
    const { result } = renderHook(() =>
      useFormDraft(KEY, INICIAL, undefined, 800, {
        versao: 2,
        valido: (v) => v.planoId === null || typeof v.planoId === "number",
      }),
    )
    expect(result.current.value).toEqual(INICIAL)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
