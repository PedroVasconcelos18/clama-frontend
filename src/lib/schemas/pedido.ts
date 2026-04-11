import { z } from "zod";

const telefoneOptional = z
  .string()
  .optional()
  .refine((v) => !v || v.replace(/\D/g, "").length >= 8, {
    message: "Precisamos de um telefone válido.",
  });

const telefoneRequired = z
  .string()
  .min(1, "Para receber por WhatsApp, precisamos do seu número.")
  .refine((v) => v.replace(/\D/g, "").length >= 8, {
    message: "Precisamos de um telefone válido.",
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
  .transform((v) => v.replace(/\D/g, "")); // Remove mask before sending

const baseSchema = {
  nome: z
    .string()
    .min(2, "Conta um pouco de você no nome — pelo menos 2 letras.")
    .max(120, "Nome muito longo."),
  email: z.string().email("Confira seu e-mail — parece que faltou algo."),
  cpf_cnpj: cpfCnpjSchema,
  idade: z.coerce
    .number()
    .int()
    .min(1, "Idade precisa ser maior que zero.")
    .max(120, "Idade parece estar incorreta.")
    .optional()
    .or(z.literal("")),
  sexo: z.enum(["feminino", "masculino", "nao_informado"]).optional(),
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
  telefone: telefoneOptional,
});

export const pedidoSchemaWithTelefone = z.object({
  ...baseSchema,
  telefone: telefoneRequired,
});

export function getPedidoSchema(requireTelefone: boolean): typeof pedidoSchema {
  return (requireTelefone ? pedidoSchemaWithTelefone : pedidoSchema) as typeof pedidoSchema;
}

export type PedidoFormInput = z.input<typeof pedidoSchema>;
export type PedidoFormData = z.output<typeof pedidoSchema>;
