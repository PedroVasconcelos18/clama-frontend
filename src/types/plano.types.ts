export interface Plan {
  id: string;
  nome: string;
  valor_centavos: number;
  valor_reais_str: string;
  descricao: string;
  complexidade: "simples" | "media" | "profunda";
  ordem: number;
}
