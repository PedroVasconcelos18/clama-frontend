import { describe, it, expect } from "vitest";
import {
  isValidCpf,
  isValidCnpj,
  isValidCpfOrCnpj,
} from "@/lib/validators/cpfCnpj";

describe("isValidCpf", () => {
  it("aceita CPFs válidos (com e sem máscara)", () => {
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("11144477735")).toBe(true);
  });

  it("rejeita CPFs com dígito verificador errado", () => {
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCpf("11144477700")).toBe(false);
  });

  it("rejeita CPFs com tamanho errado", () => {
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("123456789012")).toBe(false);
  });

  it("rejeita CPFs com todos os dígitos iguais", () => {
    expect(isValidCpf("00000000000")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("99999999999")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJs válidos (com e sem máscara)", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita CNPJs com dígito verificador errado", () => {
    expect(isValidCnpj("11222333000180")).toBe(false);
    expect(isValidCnpj("11222333000100")).toBe(false);
  });

  it("rejeita CNPJs com tamanho errado", () => {
    expect(isValidCnpj("")).toBe(false);
    expect(isValidCnpj("1122233300018")).toBe(false);
    expect(isValidCnpj("112223330001811")).toBe(false);
  });

  it("rejeita CNPJs com todos os dígitos iguais", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
  });
});

describe("isValidCpfOrCnpj", () => {
  it("aceita CPF válido", () => {
    expect(isValidCpfOrCnpj("529.982.247-25")).toBe(true);
  });

  it("aceita CNPJ válido", () => {
    expect(isValidCpfOrCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita tamanhos intermediários", () => {
    expect(isValidCpfOrCnpj("12345678901234")).toBe(false); // 14 dígitos mas CNPJ inválido
    expect(isValidCpfOrCnpj("123456789")).toBe(false); // nem CPF nem CNPJ
  });
});
