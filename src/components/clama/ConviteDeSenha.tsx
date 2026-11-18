import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useSessao } from "@/contexts/SessaoContext";
import { apiFetch, PastoralApiError } from "@/lib/api";
import PastoralAlert from "@/components/utility/PastoralAlert";

/**
 * Convite para criar a senha na tela da oração. Com `tokenDeSenha` (freemium: a pessoa acabou de provar o
 * e-mail) a senha é definida ali mesmo; sem ele (pago anônimo) o link vai no e-mail da oração, se a conta ainda não
 * tem senha; no freemium com `tokenDeSenha: null` (`jaTemConta`) a conta pode já ter senha (ou a emissão falhou), então
 * o texto é condicional nos dois casos. Quem já tem sessão não vê nada. O token vem do state do router e nunca passa pela URL.
 */
export function ConviteDeSenha({ tokenDeSenha, jaTemConta = false }: { tokenDeSenha?: string | null; jaTemConta?: boolean }) {
  const { usuario, carregando } = useSessao();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState(false);

  if (carregando || usuario) return null;

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await apiFetch("/api/auth/redefinicao-de-senha", {
        method: "POST",
        body: JSON.stringify({ token: tokenDeSenha, novaSenha: senha }),
        showToast: false,
      });
      setCriada(true);
    } catch (err) {
      setErro(
        err instanceof PastoralApiError ? err.pastoralMessage : "Algo não saiu como o esperado. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="border border-[#e0d8f0] rounded-xl p-5 bg-clama-cream mb-8 text-left">
      <p className="font-sans text-clama-accent text-[0.78rem] tracking-[1px] uppercase mb-2">Sua conta no Clama</p>
      <h2 className="font-display text-clama-night text-[1.3rem] mb-2">Guarde sua oração</h2>
      {criada ? (
        <p className="font-sans text-[#444] text-[0.95rem]">
          Senha criada — agora é só entrar.{" "}
          <Link to="/login" className="underline font-semibold">
            Entrar
          </Link>
        </p>
      ) : tokenDeSenha ? (
        <form onSubmit={criar} className="space-y-3">
          <p className="font-sans text-[#666] text-[0.9rem]">
            Falta só uma senha para guardar suas orações e acompanhar sua jornada.
          </p>
          {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
          <label htmlFor="senha-convite" className="block font-sans text-[0.85rem] text-[#444]">
            Crie uma senha
          </label>
          <input
            id="senha-convite"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border border-[#e0d8f0] rounded-lg px-3 py-2 bg-white"
          />
          <button
            type="submit"
            disabled={enviando || !senha}
            className="bg-clama-night text-white py-[0.7rem] px-6 text-[0.9rem] font-semibold font-sans rounded-full disabled:opacity-60"
          >
            Criar senha
          </button>
        </form>
      ) : jaTemConta ? (
        <p className="font-sans text-[#666] text-[0.95rem]">
          Se você já tem senha no Clama, entre para guardar esta oração.{" "}
          <Link to="/login" className="underline font-semibold">
            Entrar
          </Link>
        </p>
      ) : (
        <p className="font-sans text-[#666] text-[0.95rem]">
          Se você ainda não tem senha no Clama, o link para criar a sua vai junto com a oração no seu e-mail.
        </p>
      )}
    </section>
  );
}
