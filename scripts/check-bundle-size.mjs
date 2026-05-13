#!/usr/bin/env node
/**
 * Bundle size threshold check pra rota pública /blog/*.
 *
 * NFR4: "blog adiciona ≤80KB hidratação por rota" (architecture-blog.md).
 *
 * Estratégia: medir a hidratação ADICIONAL específica de /blog/*, isto é:
 * - pages_blog_*.js (chunks de página gerados pelo Vike)
 * - entry-client-routing*.js (boot do client Vike — pago uma vez, mas necessário
 *   pra /blog/* renderizar interatividade)
 *
 * Chunks compartilhados (React, Vite runtime, etc.) NÃO contam aqui — são parte
 * do bundle global do app, validados por orçamento separado (NFR4 público ≤150KB).
 *
 * Pra inspeção visual de chunks pesados: `npm run analyze:bundle` gera
 * dist/bundle-stats.html com treemap.
 *
 * Uso:
 *   npm run check:bundle-size          # threshold default 80KB
 *   THRESHOLD_KB=100 npm run check:bundle-size
 */

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { gzipSync } from "node:zlib"

const ROOT = path.resolve(process.cwd())
const ASSETS_DIR = path.join(ROOT, "dist", "client", "assets")
const ENTRIES_DIR = path.join(ASSETS_DIR, "entries")
const THRESHOLD_KB = Number(process.env.THRESHOLD_KB ?? 80)
const THRESHOLD_BYTES = THRESHOLD_KB * 1024

const BLOG_ENTRY_PATTERNS = [
  /^pages_blog_/, // pages_blog_index, pages_blog_-slug, pages_blog_teste
  /^entry-client-routing/, // Vike client runtime
]

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function gzippedSize(filePath) {
  const buf = await readFile(filePath)
  return gzipSync(buf).length
}

async function listFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".js"))
      .map((e) => path.join(dir, e.name))
  } catch {
    return []
  }
}

async function main() {
  if (!(await exists(ASSETS_DIR))) {
    console.error(
      `dist/client/assets ausente — rode 'npm run build' antes de check:bundle-size.`,
    )
    process.exit(1)
  }

  const entryFiles = await listFiles(ENTRIES_DIR)
  const blogEntries = entryFiles.filter((p) => {
    const base = path.basename(p)
    return BLOG_ENTRY_PATTERNS.some((re) => re.test(base))
  })

  if (blogEntries.length === 0) {
    console.error(
      `Nenhum chunk de blog encontrado em ${ENTRIES_DIR}. Verifique se 'npm run build' completou.`,
    )
    process.exit(1)
  }

  let totalGzipped = 0
  const breakdown = []
  for (const f of blogEntries) {
    const size = await gzippedSize(f)
    totalGzipped += size
    breakdown.push({ file: path.relative(ROOT, f), gzippedBytes: size })
  }

  breakdown.sort((a, b) => b.gzippedBytes - a.gzippedBytes)

  console.log(`Hidratação adicional /blog/* (NFR4):`)
  for (const { file, gzippedBytes } of breakdown) {
    const kb = (gzippedBytes / 1024).toFixed(2)
    console.log(`  ${kb.padStart(7)} KB gz  ${file}`)
  }
  const totalKb = (totalGzipped / 1024).toFixed(2)
  console.log(`\nTotal: ${totalKb} KB gz`)
  console.log(`Threshold: ${THRESHOLD_KB} KB gz`)

  if (totalGzipped > THRESHOLD_BYTES) {
    console.error(
      `\n[FAIL] Hidratação /blog/* excede threshold em ${(
        (totalGzipped - THRESHOLD_BYTES) /
        1024
      ).toFixed(2)} KB gz. Investigue chunks pesados via 'npm run analyze:bundle'.`,
    )
    process.exit(1)
  }
  console.log(`\n[PASS] Hidratação dentro do orçamento NFR4.`)
}

main().catch((err) => {
  console.error("check-bundle-size erro:", err)
  process.exit(1)
})
