import type { components } from "@/types/api-schema";

type Gerada = components["schemas"]["InstituicaoPublica"];

type Anulaveis = "logoUrl" | "causa" | "metaMensalCentavos" | "custoUnidadeCentavos" | "unidade";

/**
 * `logoUrl` é relativo (ex.: "/api/instituicoes/3/logo?v=abcd1234") ou null sem logo; os campos de meta
 * vêm null quando a instituição não tem meta.
 */
export type Instituicao = Required<Omit<Gerada, Anulaveis>> & {
  [K in Anulaveis]: NonNullable<Gerada[K]> | null;
};
