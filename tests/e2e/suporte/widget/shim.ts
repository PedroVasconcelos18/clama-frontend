/**
 * O WordPress entrega `wp.element` e `ReactJSXRuntime` como globais (dependências `wp-element` e `react-jsx-runtime`
 * do `index.asset.php`); aqui o React 19 do próprio front faz esse papel. Precisa carregar ANTES do bundle
 * (`<script type="module">` executa na ordem do documento).
 */
import * as React from "react"
import * as jsxRuntime from "react/jsx-runtime"
import { createRoot } from "react-dom/client"

const w = window as unknown as Record<string, unknown>
w.wp = { element: { ...React, render: (el: React.ReactNode, alvo: Element) => createRoot(alvo).render(el) } }
w.ReactJSXRuntime = jsxRuntime
