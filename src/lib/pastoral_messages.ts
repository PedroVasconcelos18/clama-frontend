/**
 * Mensagens pastorais consolidadas do Clama.
 *
 * Todas as mensagens de erro, fallback e feedback ao usuário são centralizadas aqui
 * para garantir consistência de tom e facilitar revisão pastoral.
 *
 * REGRAS DE TOM:
 * - Acolhedor, nunca culpabiliza a usuária
 * - Sem jargão técnico (evitar: error, exception, null, undefined, 500, timeout)
 * - Curto e direto, mas gentil
 * - Usar português brasileiro coloquial mas respeitoso
 *
 * MANTER SINCRONIZADO:
 * - Backend: clama/core/pastoral_messages.py
 */

// =============================================================================
// ERROS DE REDE / INFRAESTRUTURA
// =============================================================================

/** Usado quando há problemas de conexão ou servidor */
export const MSG_NETWORK_ERROR =
  "Tivemos um soluço na conexão. Tenta de novo em um minutinho?";

/** Usado quando um erro inesperado acontece */
export const MSG_UNKNOWN_ERROR =
  "Algo não saiu como esperado. Estamos cuidando disso — tenta de novo mais tarde?";

// =============================================================================
// VALIDAÇÃO
// =============================================================================

/** Erro genérico de validação */
export const MSG_VALIDATION_GENERIC =
  "Confira os campos preenchidos e tenta de novo.";

// =============================================================================
// RATE LIMITING
// =============================================================================

/** Usuária fez muitas requisições */
export const MSG_RATE_LIMITED =
  "Você fez vários pedidos seguidos — espera um instante e tenta de novo, com calma.";

// =============================================================================
// PAGAMENTO
// =============================================================================

/** Falha no processamento do pagamento */
export const MSG_PAYMENT_FAILED =
  "Não conseguimos processar seu pagamento agora. Tenta de novo ou usa outro método.";

/** Pedido já foi pago (tentativa duplicada) */
export const MSG_PAYMENT_ALREADY_PAID =
  "Esse pedido já foi processado. Vamos te encaminhar para a confirmação.";

// =============================================================================
// GERAÇÃO DE ORAÇÃO
// =============================================================================

/** Falha definitiva na geração */
export const MSG_PRAYER_GENERATION_FAILED =
  "Não conseguimos preparar sua oração agora. Vamos tentar de novo em breve.";

/** Oração reagendada para tentar novamente (fallback) */
export const MSG_REAGENDADO =
  "Sua oração precisou de mais um instante. " +
  "Vamos enviar assim que estiver pronta — você não precisa fazer nada.";

/** Oração travada por falta de créditos na API — admin irá destravar em até 24h */
export const MSG_ERRO_CREDITOS_24H =
  "Recebemos seu pedido com carinho. Sua oração será preparada e enviada em até 24 horas. " +
  "Se precisar falar com alguém antes, escreva pra contato@clama.me.";

// =============================================================================
// EMAIL
// =============================================================================

/** Falha no envio de email */
export const MSG_EMAIL_FAILED =
  "O envio do e-mail não foi possível agora. Vamos tentar de novo logo.";

// =============================================================================
// WHATSAPP
// =============================================================================

/** Falha no envio de WhatsApp */
export const MSG_WHATSAPP_FAILED =
  "O envio pelo WhatsApp não foi possível agora. Vamos tentar de novo logo.";

/** Hint para usuária ao escolher WhatsApp */
export const MSG_WHATSAPP_HINT =
  "Vamos te enviar pelo WhatsApp em até 2 minutos. Confira que seu número está correto.";

// =============================================================================
// RECURSO NÃO ENCONTRADO
// =============================================================================

/** Pedido ou recurso não encontrado */
export const MSG_NOT_FOUND =
  "Não encontramos o que você procura. Pode ter sido removido ou nunca existiu.";

// =============================================================================
// CONFIRMAÇÃO / FEEDBACK
// =============================================================================

/** Mensagem de confirmação após pagamento (email) */
export const MSG_CONFIRMACAO_EMAIL =
  "Sua oração chegará na sua caixa de e-mail em até 2 minutos. " +
  "Confira também a aba spam por garantia.";

/** Mensagem de confirmação após pagamento (WhatsApp) */
export const MSG_CONFIRMACAO_WHATSAPP =
  "Sua oração chegará no seu WhatsApp em até 2 minutos.";

/** Mensagem durante geração */
export const MSG_GERANDO_ORACAO =
  "Estamos preparando sua oração com cuidado.";

/** Mensagem quando enviada (email) */
export const MSG_ORACAO_ENVIADA_EMAIL =
  "Sua oração já está aí! Confira seu e-mail.";

/** Mensagem quando enviada (WhatsApp) */
export const MSG_ORACAO_ENVIADA_WHATSAPP =
  "Sua oração já está aí! Confira seu WhatsApp.";

/** Mensagem de erro definitivo na confirmação */
export const MSG_ERRO_DEFINITIVO =
  "Tivemos um soluço — vamos reenviar logo. " +
  "Se demorar, escreva pra contato@clama.me.";

// =============================================================================
// VALIDAÇÃO DE TELEFONE
// =============================================================================

/** Telefone inválido */
export const MSG_TELEFONE_INVALIDO =
  "Confira seu telefone com DDD — vamos enviar a oração por aqui.";

// =============================================================================
// FREEMIUM (gate user-existence + pedido pendente)
// =============================================================================

/** User já tem conta criada (gate user-existence) — orienta pra fazer login. */
export const MSG_FREEMIUM_USER_JA_POSSUI_CONTA =
  "Você já tem conta com a gente. Faça login pra fazer um novo pedido.";

/** Pedido pendente aguardando confirmação por email — orienta a verificar email. */
export const MSG_FREEMIUM_PEDIDO_EM_ANDAMENTO =
  "Você já tem um pedido aguardando confirmação. Confira seu e-mail " +
  "para finalizar — se não achar, olha na aba de spam.";

// =============================================================================
// CUSTOMER AUTH
// =============================================================================

/** Credenciais inválidas no login customer (sem oracle de role). */
export const MSG_CUSTOMER_LOGIN_FALHOU =
  "E-mail ou senha não conferem. Tenta de novo.";

/** Senha trocada com sucesso. */
export const MSG_CUSTOMER_PASSWORD_TROCADA =
  "Senha atualizada com sucesso.";

/** 403 quando user logado precisa trocar senha temporária antes de continuar. */
export const MSG_CUSTOMER_FORCE_CHANGE_PASSWORD =
  "Antes de continuar, atualize sua senha.";
