import type { components } from "@/types/api-schema";

type Gerada = components["schemas"]["InstituicaoPublica"];

/** `logoUrl` é relativo (ex.: "/api/instituicoes/3/logo?v=abcd1234") ou null sem logo. */
export type Instituicao = Required<Omit<Gerada, "logoUrl">> & {
  logoUrl: string | null;
};
