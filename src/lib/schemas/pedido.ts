import { z } from "zod";
import { isValidCpfOrCnpj } from "@/lib/validators/cpfCnpj";

// O clamor (texto e tema) vem do rascunho; aqui só os dados da entrega.
export const pedidoSchema = z.object({
  nome: z
    .string()
    .min(2, "Conta um pouco de você no nome — pelo menos 2 letras.")
    .max(120, "Nome muito longo."),
  email: z.string().email("Confira seu e-mail — parece que faltou algo."),
  cpf_cnpj: z
    .string()
    .min(1, "Por favor, digite seu CPF ou CNPJ.")
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, "");
        return digits.length === 11 || digits.length === 14;
      },
      { message: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos." },
    )
    .refine(isValidCpfOrCnpj, {
      message: "CPF ou CNPJ inválido — confira os dígitos.",
    })
    .transform((v) => v.replace(/\D/g, "")), // sem máscara no envio
  consent_aceito: z.boolean().refine((v) => v === true, {
    message: "Para enviar seu pedido, é preciso concordar com a política de privacidade.",
  }),
});

export type PedidoFormInput = z.input<typeof pedidoSchema>;
export type PedidoFormData = z.output<typeof pedidoSchema>;
