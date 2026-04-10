// IMPORTANTE: testemunhos ilustrativos. Substituir por reais e remover
// badge "Ilustrativo" apenas após coleta com consentimento explícito
// (LGPD + CDC art. 37). Até lá, isIllustrative DEVE ser true.

export interface Testimonial {
  text: string;
  name: string;
  city: string;
  isIllustrative: boolean;
}

export const testimonials: Testimonial[] = [
  {
    text: "Estava desesperada com uma dívida enorme. Fiz meu pedido no Clama e em menos de 15 dias recebi uma proposta de emprego que mudou minha vida. Deus é fiel!",
    name: "Juliana M.",
    city: "São Paulo, SP",
    isIllustrative: true,
  },
  {
    text: "Pedi restauração no meu casamento. A oração que recebi era tão específica que chorei. Hoje minha família está completamente restaurada. Glória a Deus!",
    name: "Rodrigo & Ana Paula",
    city: "Goiânia, GO",
    isIllustrative: true,
  },
  {
    text: "Meu negócio estava quebrando. Semeei minha oferta e declarei a oração todo dia. Em 30 dias, assinei meu maior contrato. O Clama me conectou com o sobrenatural.",
    name: "Marcelo F.",
    city: "Belo Horizonte, MG",
    isIllustrative: true,
  },
];
