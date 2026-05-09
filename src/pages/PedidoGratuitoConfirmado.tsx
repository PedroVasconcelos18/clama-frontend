import { Link, useSearchParams } from "react-router-dom";

import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
import PastoralAlert from "@/components/utility/PastoralAlert";

/**
 * Página /oracao-gratis/confirmado
 *
 * Para onde o backend redireciona depois que o usuário clica no link de
 * confirmação no e-mail (`GET /api/freemium/confirmar/?token=X` com Accept:
 * text/html → 302 → cá). A query string traz `pedido_id`.
 *
 * O frontend NÃO chama nenhum endpoint daqui — a saga (criar User, gravar
 * blacklist, transitar status, disparar `gerar_oracao_task`) já rodou no
 * backend antes do redirect.
 *
 * Daqui o usuário pode ir pra `/confirmacao?pedido_id=X`, que já existe e
 * faz polling do status até `enviada`.
 */
export default function PedidoGratuitoConfirmado() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get("pedido_id");

  if (!pedidoId) {
    return (
      <div className="min-h-screen bg-white">
        <StickyNav />

        <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
          <div className="mb-8">
            <PastoralAlert variant="error">
              Link inválido ou incompleto. Faça um novo pedido em{" "}
              <Link to="/oracao-gratis" className="underline font-semibold">
                /oracao-gratis
              </Link>
              .
            </PastoralAlert>
          </div>

          <Link to="/oracao-gratis">
            <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
              Fazer um novo pedido
            </button>
          </Link>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
        <div className="w-20 h-20 bg-[#fffbee] border-[3px] border-clama-gold rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-[2rem]" role="img" aria-label="Oração">
            🙏
          </span>
        </div>

        <h1 className="font-serif text-[1.7rem] text-clama-night mb-3">
          Sua oração está sendo preparada
        </h1>

        <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
          Vamos te enviar a oração e suas credenciais por e-mail em alguns
          minutos. Enquanto aguarda, respire e se coloque em silêncio.
        </p>

        <div className="border border-[#e0d8f0] rounded-xl p-5 bg-clama-cream mb-8">
          <p className="font-serif text-[#444] text-[0.95rem] italic leading-relaxed">
            "O Espírito do Senhor está sobre mim, porque me ungiu para
            evangelizar os pobres. Enviou-me para proclamar libertação aos
            cativos."
          </p>
          <p className="font-sans text-[#8a5cf6] text-[0.78rem] tracking-[1px] uppercase mt-2">
            Lucas 4:18
          </p>
        </div>

        <Link to={`/confirmacao?pedido_id=${pedidoId}`}>
          <button className="bg-clama-gold text-clama-night py-[0.85rem] px-8 text-[0.95rem] font-bold font-sans rounded-full hover:opacity-90 transition-opacity">
            Acompanhar minha oração
          </button>
        </Link>
      </main>

      <Footer />
    </div>
  );
}
