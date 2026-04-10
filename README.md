# Clama Frontend

Frontend do Clama - plataforma de orações personalizadas.

## URLs

- **Produção:** `https://clama.vercel.app` (atualizar após configurar Vercel)
- **Local:** `http://localhost:5173`

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Rodar testes
npm run test

# Build de produção
npm run build

# Lint
npm run lint
```

## Variáveis de Ambiente

Criar arquivo `.env.local` baseado em `.env.example`:

| Variável | Descrição | Exemplo |
|---|---|---|
| `VITE_API_URL` | URL base da API backend | `http://localhost:8000` |

### Configuração Vercel

Configurar no dashboard do Vercel:
- `VITE_API_URL`: URL pública do backend Railway

## Estrutura do Projeto

```
src/
  pages/           # Componentes de página (1 por rota)
  components/
    ui/            # Primitivos shadcn/ui
    clama/         # Composições de domínio do Clama
    utility/       # Helpers visuais reutilizáveis
  hooks/           # Custom React hooks
  lib/             # Utilitários puros (api.ts, utils.ts)
  types/           # TypeScript type definitions
  data/            # Conteúdo estático
  styles/          # CSS global (Tailwind)
```

## Stack

- React 19 + TypeScript (strict mode)
- Vite 8
- Tailwind CSS 3
- shadcn/ui (Radix primitives)
- React Router 7
- Vitest + React Testing Library

## Deploy

Push em `main` dispara deploy automático no Vercel.

Para forçar redeploy:
```bash
git commit --allow-empty -m "trigger deploy" && git push
```
