import { z } from "zod";
import { isValidCpfOrCnpj } from "@/lib/validators/cpfCnpj";

// Telefone sempre obrigatório no form pago — paridade com o form gratuito
// (decisão do PM em 2026-05-10: coletar telefone independente do canal de
// entrega, pra uso futuro). O `telefoneOptional` ficou no histórico mas
// não é mais usado.
const telefoneRequired = z
  .string()
  .min(1, "Para entrarmos em contato, precisamos do seu número.")
  .refine((v) => v.replace(/\D/g, "").length === 11, {
    message: "Informe um celular com DDD (11 dígitos).",
  });

const cpfCnpjSchema = z
  .string()
  .min(1, "Por favor, digite seu CPF ou CNPJ.")
  .refine(
    (v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length === 11 || digits.length === 14;
    },
    { message: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos." }
  )
  .refine(isValidCpfOrCnpj, {
    message: "CPF ou CNPJ inválido — confira os dígitos.",
  })
  .transform((v) => v.replace(/\D/g, "")); // Remove mask before sending

const baseSchema = {
  nome: z
    .string()
    .min(2, "Conta um pouco de você no nome — pelo menos 2 letras.")
    .max(120, "Nome muito longo."),
  email: z.string().email("Confira seu e-mail — parece que faltou algo."),
  cpf_cnpj: cpfCnpjSchema,
  idade: z.coerce
    .number({ error: "Por favor, informe sua idade." })
    .int("Idade precisa ser um número inteiro.")
    .min(1, "Idade precisa ser maior que zero.")
    .max(120, "Idade parece estar incorreta."),
  sexo: z
    .enum(["feminino", "masculino", "nao_informado"], {
      error: "Por favor, selecione o sexo.",
    }),
  pedido_oracao: z
    .string()
    .max(2000, "Seu pedido está um pouco longo — tente resumir.")
    .optional(),
  consent_aceito: z
    .boolean()
    .refine((v) => v === true, {
      message: "Para enviar seu pedido, é preciso concordar com a política de privacidade.",
    }),
};

export const pedidoSchema = z.object({
  ...baseSchema,
  telefone: telefoneRequired,
});

/**
 * @deprecated Telefone agora é sempre obrigatório no form pago. A função
 * mantém a assinatura por retrocompatibilidade — `requireTelefone` é
 * ignorado, retorna sempre o schema com telefone obrigatório.
 */
export function getPedidoSchema(_requireTelefone?: boolean): typeof pedidoSchema {
  return pedidoSchema;
}

export type PedidoFormInput = z.input<typeof pedidoSchema>;
export type PedidoFormData = z.output<typeof pedidoSchema>;
