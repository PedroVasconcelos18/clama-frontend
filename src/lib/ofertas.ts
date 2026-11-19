// Valores sugeridos fixos (decisão 5 da Onda 1). valorCentavos: null = livre, 0 = gratuito.
export type Oferta = {
  id: string
  nome?: string
  rotulo: string
  valorCentavos: number | null
  destaque?: boolean
}

export const OFERTAS: Oferta[] = [
  { id: "gratuito", rotulo: "Gratuito", valorCentavos: 0 },
  { id: "r12", nome: "Partilha", rotulo: "R$ 12", valorCentavos: 1200 },
  { id: "r25", nome: "Mais escolhido", rotulo: "R$ 25", valorCentavos: 2500, destaque: true },
  { id: "r50", nome: "Aliança", rotulo: "R$ 50", valorCentavos: 5000 },
  { id: "livre", rotulo: "Livre", valorCentavos: null },
]
