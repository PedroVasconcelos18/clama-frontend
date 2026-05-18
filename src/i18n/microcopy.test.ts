import { describe, expect, it } from "vitest"
import { microcopy } from "./microcopy"

describe("microcopy", () => {
  it("commentForm tem placeholder e helper sobre dados sensíveis", () => {
    expect(microcopy.commentForm.placeholder.length).toBeGreaterThan(10)
    expect(microcopy.commentForm.helperDataSensiveis).toMatch(/sensíveis|sensiveis/i)
  })

  it("comments.heading retorna plural correto", () => {
    expect(microcopy.comments.heading(0)).toBe("Comentários")
    expect(microcopy.comments.heading(1)).toBe("1 comentário")
    expect(microcopy.comments.heading(5)).toBe("5 comentários")
  })

  it("likes.countLabel retorna plural correto", () => {
    expect(microcopy.likes.countLabel(0)).toBe("0 curtidas")
    expect(microcopy.likes.countLabel(1)).toBe("1 curtida")
    expect(microcopy.likes.countLabel(42)).toBe("42 curtidas")
  })

  it("errors tem tom pastoral (sem 'Erro:', 'Falha:', etc.)", () => {
    for (const key of Object.keys(microcopy.errors) as Array<
      keyof typeof microcopy.errors
    >) {
      const text = microcopy.errors[key]
      expect(text.toLowerCase()).not.toMatch(/^erro\b|^falha\b|^bug\b/)
    }
  })
})
