#!/usr/bin/env bash
# Sobe Postgres 18 (container), o clama-api (perfil local) e o Vite, todos em portas livres, semeia usuários,
# roda o Playwright contra eles e derruba tudo no fim.
#
# Uso: tests/e2e/suporte/rodar-conta.sh [spec ou args do playwright]   (padrão: tests/e2e/conta.spec.ts; catálogo: tests/e2e/catalogo.spec.ts)
#      MERCADOPAGO_SIMULADO=1 tests/e2e/suporte/rodar-conta.sh tests/e2e/pedido.spec.ts   (oração: tests/e2e/oracao.spec.ts)
# Variáveis: CLAMA_API_DIR (padrão ../clama-api), SKIP_BUILD=1 para não recompilar o jar,
#   MERCADOPAGO_SIMULADO=1 sobe um WireMock (mapeamentos em suporte/mercadopago) no lugar do Mercado Pago e outro (suporte/claude)
#   no lugar da Claude e um terceiro (suporte/wordpress) no lugar do WordPress, e roda a API
#   com os perfis local,test (o perfil test é o único que aceita mercadopago-url em http; a regra de produção não muda),
#   API_PERFIS para trocar os perfis à mão.
set -euo pipefail

FRONT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
API_DIR="${CLAMA_API_DIR:-$FRONT_DIR/../clama-api}"
export DOCKER_HOST="${DOCKER_HOST:-unix://$HOME/.colima/default/docker.sock}"
export JAVA_HOME="$(brew --prefix openjdk@27)"
TMP="$(mktemp -d)"
API_LOG="$TMP/api.log"
CONTAINER="clama-e2e-pg-$$"
PIDS=()

livre() { python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])'; }
PG_PORT="$(livre)"; API_PORT="$(livre)"; FRONT_PORT="$(livre)"
API_PERFIS="${API_PERFIS:-local}"
API_ENV=()

limpar() {
  status=$?
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [ $status -ne 0 ]; then echo "--- falhou; log da API em $API_LOG" >&2; tail -n 30 "$API_LOG" >&2 || true; else rm -rf "$TMP"; fi
}
trap limpar EXIT

esperar() { # url, tentativas
  for _ in $(seq 1 "$2"); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$1" || true)"
    [ "$code" != "000" ] && return 0
    sleep 1
  done
  echo "timeout esperando $1" >&2; return 1
}

echo ">> Postgres 18 na porta $PG_PORT"
docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=clama \
  -p "127.0.0.1:$PG_PORT:5432" postgres:18-alpine >/dev/null
for _ in $(seq 1 30); do docker exec "$CONTAINER" pg_isready -U postgres -d clama >/dev/null 2>&1 && break; sleep 1; done

if [ "${MERCADOPAGO_SIMULADO:-}" = "1" ]; then
  WIREMOCK_JAR="$(ls "$HOME"/.m2/repository/org/wiremock/wiremock-standalone/*/wiremock-standalone-*.jar | tail -n 1)"
  WM_PORT="$(livre)"
  echo ">> WireMock (Mercado Pago simulado) na porta $WM_PORT"
  "$JAVA_HOME/bin/java" -jar "$WIREMOCK_JAR" --port "$WM_PORT" --root-dir "$FRONT_DIR/tests/e2e/suporte/mercadopago" \
    --disable-banner >"$TMP/wiremock.log" 2>&1 &
  PIDS+=($!)
  esperar "http://localhost:$WM_PORT/__admin/health" 30
  # A Claude também é simulada (suporte/claude): sem isso o pipeline da oração falharia por falta de chave. O e-mail
  # não precisa de stub: em perfil local sem RESEND_API_KEY o EnviadorDeEmail só escreve no log da API.
  CLAUDE_WM_PORT="$(livre)"
  echo ">> WireMock (Claude simulada) na porta $CLAUDE_WM_PORT"
  "$JAVA_HOME/bin/java" -jar "$WIREMOCK_JAR" --port "$CLAUDE_WM_PORT" --root-dir "$FRONT_DIR/tests/e2e/suporte/claude" \
    --disable-banner >"$TMP/wiremock-claude.log" 2>&1 &
  PIDS+=($!)
  esperar "http://localhost:$CLAUDE_WM_PORT/__admin/health" 30
  export CLAUDE_WIREMOCK_URL="http://localhost:$CLAUDE_WM_PORT"
  # O WordPress também é simulado (suporte/wordpress: um post publicado, um protegido, o resto = lista vazia): o blog
  # lê a API pública dele (WORDPRESS_API_URL) e o e2e nunca fala com o real.
  WP_WM_PORT="$(livre)"
  echo ">> WireMock (WordPress simulado) na porta $WP_WM_PORT"
  "$JAVA_HOME/bin/java" -jar "$WIREMOCK_JAR" --port "$WP_WM_PORT" --root-dir "$FRONT_DIR/tests/e2e/suporte/wordpress" \
    --disable-banner >"$TMP/wiremock-wordpress.log" 2>&1 &
  PIDS+=($!)
  esperar "http://localhost:$WP_WM_PORT/__admin/health" 30
  API_PERFIS="local,test"
  export WIREMOCK_URL="http://localhost:$WM_PORT"
  export MERCADOPAGO_WEBHOOK_SECRET="segredo-do-webhook-e2e"
  API_ENV=(CLAMA_PAGAMENTO_MERCADOPAGOURL="$WIREMOCK_URL" MERCADOPAGO_ACCESS_TOKEN="TEST-token-e2e"
    MERCADOPAGO_WEBHOOK_SECRET="$MERCADOPAGO_WEBHOOK_SECRET"
    CLAMA_ORACAO_ANTHROPICURL="$CLAUDE_WIREMOCK_URL" ANTHROPIC_API_KEY="sk-ant-e2e-simulada"
    WORDPRESS_API_URL="http://localhost:$WP_WM_PORT")
fi

if [ "${SKIP_BUILD:-}" != "1" ]; then
  echo ">> compilando o clama-api"
  (cd "$API_DIR" && ./mvnw -q package -DskipTests)
fi

echo ">> clama-api na porta $API_PORT, perfis $API_PERFIS (log em $API_LOG)"
# SPRING_DATASOURCE_*: o application-local.yml tem datasource explícito, que vence o DATABASE_URL; a variável de ambiente vence o yml.
(cd "$API_DIR" && exec env ${API_ENV[@]+"${API_ENV[@]}"} SPRING_PROFILES_ACTIVE="$API_PERFIS" SERVER_PORT="$API_PORT" \
  SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:$PG_PORT/clama" SPRING_DATASOURCE_USERNAME=postgres SPRING_DATASOURCE_PASSWORD=postgres \
  FRONTEND_URL="http://localhost:$FRONT_PORT" \
  "$JAVA_HOME/bin/java" -jar target/clama-api.jar >"$API_LOG" 2>&1) &
PIDS+=($!)
esperar "http://localhost:$API_PORT/api/auth/eu" 90

echo ">> semeando usuários (senha de todos: Senha-de-teste-123)"
HASH='{argon2}$argon2id$v=19$m=16384,t=2,p=1$pk1ZJowqetWplby0zBF2BA$U6LCBmZflPxoTAsOi4yLMWlsrBjrMy0CdcXxUfoKoDw'
docker exec -i "$CONTAINER" psql -q -U postgres -d clama -v hash="$HASH" <<'SQL'
INSERT INTO usuario (email, email_canonico, senha, nome_completo, papel, ativo, criado_em) VALUES
  ('super@clama.test',   'super@clama.test',   :'hash', 'Super Teste',   'SUPERUSUARIO', true, now()),
  ('super2@clama.test',  'super2@clama.test',  :'hash', 'Super Dois',    'SUPERUSUARIO', true, now()),
  ('cliente@clama.test', 'cliente@clama.test', :'hash', 'Cliente Teste', 'CLIENTE',      true, now()),
  ('esqueci@clama.test', 'esqueci@clama.test', :'hash', 'Esqueci Teste', 'CLIENTE',      true, now());
SQL

echo ">> Vite na porta $FRONT_PORT"
(cd "$FRONT_DIR" && VITE_DEV_API_PROXY_TARGET="http://localhost:$API_PORT" \
  exec node_modules/.bin/vite --port "$FRONT_PORT" --strictPort >"$TMP/vite.log" 2>&1) &
PIDS+=($!)
esperar "http://localhost:$FRONT_PORT/" 60

echo ">> Playwright"
cd "$FRONT_DIR"
BASE_URL="http://localhost:$FRONT_PORT" API_LOG="$API_LOG" \
  npx playwright test "${@:-tests/e2e/conta.spec.ts}"
