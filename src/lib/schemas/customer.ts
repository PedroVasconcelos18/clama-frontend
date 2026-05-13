import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Por favor, informe seu e-mail.")
    .email("Confira seu e-mail — parece que faltou algo."),
  password: z.string().min(1, "Por favor, informe sua senha."),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    senha_atual: z.string().min(1, "Por favor, informe sua senha atual."),
    nova_senha: z
      .string()
      .min(8, "A nova senha precisa ter pelo menos 8 caracteres."),
    confirmar_senha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    message: "As senhas não coincidem — confira novamente.",
    path: ["confirmar_senha"],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
