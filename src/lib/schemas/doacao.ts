import { z } from "zod";
import { isValidCpfOrCnpj } from "@/lib/validators/cpfCnpj";

/**
 * Schema da doação paga SEM conta (Landing pública) — Objetivo 2.
 *
 * Espelha `pedido-gratuito.ts` (Turnstile + device_hash + consent + CPF/CNPJ
 * por dígito verificador + idade coerce) e ADICIONA:
 * - `valor_centavos`: valor da doação em centavos (mín. R$ 1,00 = 100).
 * - `instituicao`: UUID da instituição parceira (opcional; direciona o repasse).
 *
 * `valor_centavos` é preenchido programaticamente pelo componente (input em
 * reais → centavos via `reaisToInt`), então chega ao schema já como number.
 * `instituicao` é controlada por `useState` no componente (fora do RHF) e só
 * é incluída no payload quando há seleção — o schema apenas a tipa/valida
 * quando presente.
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

const telefoneRequired = z
  .string()
  .min(1, "Para entrarmos em contato, precisamos do seu número.")
  .refine((v) => v.replace(/\D/g, "").length === 11, {
    message: "Informe um celular com DDD (11 dígitos).",
  });

export const doacaoSchema = z.object({
  nome: z
    .string()
    .min(2, "Conta um pouco de você no nome — pelo menos 2 letras.")
    .max(120, "Nome muito longo."),
  email: z.string().email("Confira seu e-mail — parece que faltou algo."),
  cpf_cnpj: cpfCnpjSchema,
  telefone: telefoneRequired,
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
  valor_centavos: z
    .number({ error: "Por favor, informe o valor da sua doação." })
    .int("O valor precisa ser um número inteiro de centavos.")
    .min(100, "O valor mínimo para doação é R$ 1,00."),
  instituicao: z
    .string()
    .uuid("Instituição inválida.")
    .nullable()
    .optional(),
  consent_aceito: z.boolean().refine((v) => v === true, {
    message:
      "Para concluir sua doação, é preciso concordar com a política de privacidade.",
  }),
  turnstile_token: z
    .string()
    .min(1, "Verificação anti-robô obrigatória. Aguarde alguns segundos."),
  device_hash: z
    .string()
    .min(10, "Identificação do dispositivo incompleta. Recarregue a página.")
    .max(128, "Identificação do dispositivo inválida."),
});

export type DoacaoInput = z.input<typeof doacaoSchema>;
export type DoacaoData = z.output<typeof doacaoSchema>;

export function getDoacaoSchema(): typeof doacaoSchema {
  return doacaoSchema;
}
