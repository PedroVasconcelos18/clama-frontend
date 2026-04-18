export const ptBR = {
  errors: {
    // Erros genéricos
    generic: "Algo não saiu como o esperado. Tente novamente.",
    networkError: "Parece que sua conexão oscilou. Tente novamente daqui a pouco.",
    sessionExpired: "Sua sessão expirou. Por favor, faça login novamente.",

    // Validações do Django REST Framework
    validation: {
      "Ensure this value is greater than or equal to":
        "O valor deve ser maior ou igual a",
      "Ensure this value is less than or equal to":
        "O valor deve ser menor ou igual a",
      "This field is required.": "Este campo é obrigatório.",
      "This field may not be blank.": "Este campo não pode ficar em branco.",
      "This field may not be null.": "Este campo não pode ser nulo.",
      "Not found.": "Não encontrado.",
      "A valid integer is required.": "Informe um número inteiro válido.",
      "A valid number is required.": "Informe um número válido.",
      "Enter a valid email address.": "Informe um email válido.",
      "Enter a valid URL.": "Informe uma URL válida.",
      "This password is too short.": "Esta senha é muito curta.",
      "This password is too common.": "Esta senha é muito comum.",
      "This password is entirely numeric.": "Esta senha não pode ser apenas números.",
      "The two password fields didn't match.": "As senhas não coincidem.",
      "A user with that username already exists.": "Já existe um usuário com este nome.",
      "A user with that email already exists.": "Já existe um usuário com este email.",
      "Unable to log in with provided credentials.":
        "Não foi possível fazer login com as credenciais informadas.",
      "Invalid token.": "Token inválido.",
      "Token has expired.": "Token expirado.",
      "No active account found with the given credentials.":
        "Nenhuma conta ativa encontrada com as credenciais informadas.",
      "String value too large.": "Texto muito longo.",
      "Ensure this field has no more than": "Este campo deve ter no máximo",
      "Ensure this field has at least": "Este campo deve ter pelo menos",
      characters: "caracteres",
      "Invalid pk": "Registro não encontrado.",
      "does not exist.": "não existe.",
      "Incorrect type.": "Tipo incorreto.",
      "Expected a": "Esperado um",
      "but got": "mas recebeu",
      "This list may not be empty.": "Esta lista não pode estar vazia.",
      "Duplicate values are not allowed.": "Valores duplicados não são permitidos.",
    },
  },
} as const
