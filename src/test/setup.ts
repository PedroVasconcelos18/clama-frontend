import "@testing-library/jest-dom"

// O Node 26 expõe um `localStorage` experimental que só funciona com a flag
// `--localstorage-file`. Ele ocupa `globalThis.localStorage` antes do jsdom —
// e, como em vitest `window === globalThis`, o jsdom nunca instala o seu.
// Sem a flag o getter resolve para `undefined`, derrubando todo teste que
// toque storage (53 testes, à época deste comentário).
// O shim abaixo é uma implementação de `Storage` em memória, isolada por teste.
class MemoryStorage implements Storage {
  #dados = new Map<string, string>()

  get length(): number {
    return this.#dados.size
  }

  key(index: number): string | null {
    return Array.from(this.#dados.keys())[index] ?? null
  }

  getItem(chave: string): string | null {
    return this.#dados.has(chave) ? this.#dados.get(chave)! : null
  }

  setItem(chave: string, valor: string): void {
    this.#dados.set(String(chave), String(valor))
  }

  removeItem(chave: string): void {
    this.#dados.delete(String(chave))
  }

  clear(): void {
    this.#dados.clear()
  }
}

for (const nome of ["localStorage", "sessionStorage"] as const) {
  if (typeof globalThis[nome] === "undefined") {
    Object.defineProperty(globalThis, nome, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    })
  }
}
