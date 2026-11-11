import { z } from "zod";
import { isValidCpfOrCnpj } from "@/lib/validators/cpfCnpj";

/**
 * Schema do fluxo freemium (Landing pública) — versão pós-renegociação 2026-05-08.
 *
 * Mudanças em relação ao v1:
 * - Removidos `otp_token` e `otp_codigo` (fluxo OTP via WhatsApp foi descontinuado).
 * - Adicionado `turnstile_token` (CAPTCHA Cloudflare Turnstile invisível).
 *   Sem `device_hash`: a impressão digital do aparelho saiu na onda 5.
 * - Telefone opcional desde a onda 4 (D5).
 *
 * Mantém validação de CPF/CNPJ por dígito verificador (mesma do schema pago).
 */

const cpfCnpjSchema = z
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
  .transform((v) => v.replace(/\D/g, ""));

// Telefone opcional (D5 da onda 4: a API não exige; o canal de entrega saiu).
// Se vier, é celular com DDD.
const telefoneOpcional = z
  .string()
  .optional()
  .refine((v) => !v || v.replace(/\D/g, "").length === 11, {
    message: "Informe um celular com DDD (11 dígitos).",
  });

/**
 * Schema do form completo do pedido gratuito (submissão única).
 * O cliente envia ao backend após o Turnstile resolver.
 */
export const pedidoGratuitoSchema = z.object({
  nome: z
    .string()
    .min(2, "Conta um pouco de você no nome — pelo menos 2 letras.")
    .max(120, "Nome muito longo."),
  email: z.string().email("Confira seu e-mail — parece que faltou algo."),
  cpf_cnpj: cpfCnpjSchema,
  telefone: telefoneOpcional,
  idade: z.coerce
    .number({ error: "Por favor, informe sua idade." })
    .int("Idade precisa ser um número inteiro.")
    .min(1, "Idade precisa ser maior que zero.")
    .max(120, "Idade parece estar incorreta."),
  sexo: z.enum(["feminino", "masculino", "nao_informado"], {
    error: "Por favor, selecione o sexo.",
  }),
  pedido_oracao: z
    .string()
    .max(2000, "Seu pedido está um pouco longo — tente resumir.")
    .optional(),
  consent_aceito: z.boolean().refine((v) => v === true, {
    message:
      "Para enviar seu pedido, é preciso concordar com a política de privacidade.",
  }),
  turnstile_token: z
    .string()
    .min(1, "Verificação anti-robô obrigatória. Aguarde alguns segundos."),
});

export type PedidoGratuitoInput = z.input<typeof pedidoGratuitoSchema>;
export type PedidoGratuitoData = z.output<typeof pedidoGratuitoSchema>;

export function getPedidoGratuitoSchema(): typeof pedidoGratuitoSchema {
  return pedidoGratuitoSchema;
}
