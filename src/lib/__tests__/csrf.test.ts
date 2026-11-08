import { describe, it, expect, afterEach } from "vitest"
import { csrfHeaders, exigeCsrf } from "../csrf"

function setCookie(v: string) {
  document.cookie = `XSRF-TOKEN=${v}; path=/`
}

afterEach(() => {
  document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
})

describe("csrf", () => {
  it("métodos seguros não exigem token", () => {
    expect(exigeCsrf("GET")).toBe(false)
    expect(exigeCsrf(undefined)).toBe(false)
    expect(exigeCsrf("post")).toBe(true)
  })

  it("envia X-XSRF-TOKEN com o valor do cookie em método não seguro", () => {
    setCookie("abc%3D123")
    expect(csrfHeaders("POST")).toEqual({ "X-XSRF-TOKEN": "abc=123" })
  })

  it("lê o cookie a cada chamada (o token muda no login)", () => {
    setCookie("um")
    expect(csrfHeaders("POST")["X-XSRF-TOKEN"]).toBe("um")
    setCookie("dois")
    expect(csrfHeaders("DELETE")["X-XSRF-TOKEN"]).toBe("dois")
  })

  it("GET não leva header; sem cookie, header vazio", () => {
    setCookie("um")
    expect(csrfHeaders("GET")).toEqual({})
    document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
    expect(csrfHeaders("POST")).toEqual({})
  })
})
