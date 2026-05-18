import { describe, expect, it } from "vitest"
import { readingTimeMin, tempoRelativo } from "./datetime"

describe("tempoRelativo", () => {
  const NOW = new Date("2026-05-13T12:00:00Z")

  it.each([
    ["2026-05-13T11:59:30Z", "agora há pouco"],
    ["2026-05-13T11:30:00Z", "há 30 minutos"],
    ["2026-05-13T11:00:00Z", "há 1 hora"],
    ["2026-05-13T08:00:00Z", "há 4 horas"],
    ["2026-05-12T12:00:00Z", "ontem"],
    ["2026-05-11T12:00:00Z", "há 2 dias"],
    ["2026-05-08T12:00:00Z", "há 5 dias"],
  ])("converte %s em %s", (iso, expected) => {
    expect(tempoRelativo(iso, NOW)).toBe(expected)
  })

  it("para datas > 7 dias retorna formato data pt-BR", () => {
    const result = tempoRelativo("2026-04-01T12:00:00Z", NOW)
    expect(result).toMatch(/abr/)
    expect(result).toMatch(/2026/)
  })

  it("retorna string vazia para input inválido", () => {
    expect(tempoRelativo("nao-eh-data", NOW)).toBe("")
  })
})

describe("readingTimeMin", () => {
  it("min 1 minuto pra textos curtos", () => {
    expect(readingTimeMin("Curto.")).toBe(1)
  })

  it("calcula 200 wpm pra textos longos", () => {
    const text = Array(800).fill("palavra").join(" ")
    expect(readingTimeMin(text)).toBe(4)
  })

  it("strip tags HTML antes de contar", () => {
    const html = "<p>" + Array(400).fill("palavra").join(" ") + "</p>"
    expect(readingTimeMin(html)).toBe(2)
  })
})
