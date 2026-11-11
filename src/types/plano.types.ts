import type { components } from "@/types/api-schema";

// Derivado do contrato gerado (`npm run generate:api-types`); o springdoc
// marca tudo como opcional, mas a API sempre devolve todos os campos.
export type Plan = Required<components["schemas"]["PlanoPublico"]>;
