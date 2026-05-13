import { describe, it, expect } from "vitest"
import { validateNextPath } from "@/lib/redirects"

describe("validateNextPath", () => {
  it("returns fallback when input is null", () => {
    expect(validateNextPath(null)).toBe("/")
  })

  it("returns fallback when input is empty string", () => {
    expect(validateNextPath("")).toBe("/")
  })

  it("returns fallback when input is undefined", () => {
    expect(validateNextPath(undefined)).toBe("/")
  })

  it("returns the path when it starts with a single slash", () => {
    expect(validateNextPath("/foo")).toBe("/foo")
  })

  it("preserves query string and hash", () => {
    expect(validateNextPath("/foo?bar=baz")).toBe("/foo?bar=baz")
    expect(validateNextPath("/#pedido")).toBe("/#pedido")
    expect(validateNextPath("/conta?tab=ativos#hist")).toBe(
      "/conta?tab=ativos#hist",
    )
  })

  it("rejects protocol-relative URL `//evil.com`", () => {
    expect(validateNextPath("//evil.com")).toBe("/")
  })

  it("rejects backslash-protocol-relative `/\\evil.com`", () => {
    expect(validateNextPath("/\\evil.com")).toBe("/")
  })

  it("rejects javascript: scheme", () => {
    expect(validateNextPath("javascript:alert(1)")).toBe("/")
  })

  it("rejects http: scheme", () => {
    expect(validateNextPath("http://evil.com")).toBe("/")
  })

  it("rejects https: scheme", () => {
    expect(validateNextPath("https://evil.com")).toBe("/")
  })

  it("rejects relative paths that don't start with /", () => {
    expect(validateNextPath("foo")).toBe("/")
    expect(validateNextPath("../foo")).toBe("/")
    expect(validateNextPath("./bar")).toBe("/")
  })

  it("rejects path with colon before any ?/# (scheme injection)", () => {
    // Some browsers normalize `\` to `/`, allowing a hidden scheme.
    expect(validateNextPath("/\\foo:bar")).toBe("/")
    // Direct colon in path part
    expect(validateNextPath("/foo:bar")).toBe("/")
  })

  it("allows colon inside query/hash segments", () => {
    expect(validateNextPath("/foo?next=https://x")).toBe(
      "/foo?next=https://x",
    )
    expect(validateNextPath("/foo#title:subtitle")).toBe("/foo#title:subtitle")
  })

  it("uses custom fallback when provided", () => {
    expect(validateNextPath(null, "/conta")).toBe("/conta")
    expect(validateNextPath("//evil", "/conta")).toBe("/conta")
  })
})
