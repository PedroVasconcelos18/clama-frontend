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
    text: "Cheguei aqui me sentindo esmagada pelo peso do mundo. A oração que recebi não me prometeu saída fácil — me devolveu dignidade e a coragem de caminhar. Reencontrei em mim uma ternura que eu achava perdida.",
    name: "Juliana M.",
    city: "São Paulo, SP",
    isIllustrative: true,
  },
  {
    text: "A oração que recebi não prometeu milagre fácil. Falou do Deus que ouve o clamor e caminha com quem sofre. Saí do lugar do lamento solitário e encontrei a força de seguir em comunhão.",
    name: "Rodrigo & Ana Paula",
    city: "Goiânia, GO",
    isIllustrative: true,
  },
  {
    text: "Pedi por libertação do que me oprimia por dentro. A palavra que recebi me fez enxergar o outro — e, ao cuidar, fui cuidado. O Evangelho que liberta não adormece: desperta.",
    name: "Marcelo F.",
    city: "Belo Horizonte, MG",
    isIllustrative: true,
  },
];
