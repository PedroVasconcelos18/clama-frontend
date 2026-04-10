export type Sexo = "feminino" | "masculino" | "nao_informado";

export interface PedidoFormData {
  nome: string;
  email: string;
  telefone?: string;
  idade?: number;
  sexo?: Sexo;
  pedido_oracao?: string;
}
