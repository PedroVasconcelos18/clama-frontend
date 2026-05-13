/**
 * Microcopy do blog clama. Tom pastoral em pt-br.
 * Convenção: agrupar por contexto (commentForm, toasts, errors, validation).
 * NUNCA strings hardcoded em componentes — sempre referenciar aqui.
 */

export const microcopy = {
  commentForm: {
    placeholder: "Compartilhe um pensamento, uma oração, uma palavra…",
    helperDataSensiveis:
      "Por favor, não compartilhe dados pessoais sensíveis (CPF, telefone, endereço, etc.) nos comentários.",
    submitLabel: "Comentar",
    submitting: "Enviando…",
    promptLoginInicio: "Pra comentar, ",
    promptLoginLinkText: "faça login com sua conta do Clama",
    promptLoginFim: " — é a mesma conta dos pedidos de oração.",
  },
  toasts: {
    commentSent: "Seu comentário foi publicado.",
    commentEdited: "Comentário atualizado.",
    commentDeleted: "Comentário removido.",
    postPublished: "Publicação iniciada — post no ar em ~3 minutos.",
    postSavedDraft: "Rascunho salvo.",
    postUnpublished: "Post despublicado.",
    likeAdded: "Você curtiu este post.",
    likeRemoved: "Curtida removida.",
  },
  errors: {
    networkRetry: "Sem conexão agora. Tentamos de novo em instantes.",
    commentMuitoCurto: "Comentário muito curto — escreva ao menos 3 caracteres.",
    commentMuitoLongo: "Comentário longo demais (máx. 2000 caracteres).",
    customerBanido:
      "Sua conta está suspensa do sistema de comentários. Se acha que foi engano, fale com nosso suporte.",
    edicaoExpirada:
      "Janela de edição de 15 minutos encerrou. Você ainda pode excluir o comentário.",
    generico: "Algo não saiu como o esperado. Vamos tentar de novo em instantes.",
    rateLimitComentarios:
      "Você está comentando muito rápido. Aguarde um pouco antes de tentar novamente.",
  },
  validation: {
    commentMuitoCurto: "Escreva ao menos 3 caracteres.",
    commentMuitoLongo: "Limite de 2000 caracteres.",
  },
  comments: {
    heading: (count: number) =>
      count === 0
        ? "Comentários"
        : count === 1
          ? "1 comentário"
          : `${count} comentários`,
    emptyState:
      "Seja o primeiro a deixar uma palavra por aqui. Comentários são lidos com carinho.",
    paused: "Atualização automática pausada. Recarregue a página para ver novos.",
  },
  likes: {
    countLabel: (count: number) =>
      count === 0
        ? "0 curtidas"
        : count === 1
          ? "1 curtida"
          : `${count} curtidas`,
  },
} as const

export type Microcopy = typeof microcopy
