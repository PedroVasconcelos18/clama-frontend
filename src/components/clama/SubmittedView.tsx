import { Link } from "react-router-dom";

/** Tela "Confira seu e-mail" do pedido gratuito anônimo (double opt-in). */
export function SubmittedView({
  email,
  isDark,
}: {
  email: string
  isDark: boolean
}) {
  return (
    <section
      className="text-center"
      role="region"
      aria-label="Confirmação enviada por e-mail"
    >
      <div
        className={`w-20 h-20 border-[3px] border-clama-gold rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? "bg-clama-gold/10" : "bg-[#fffbee]"}`}
      >
        <span className="text-[2rem]" role="img" aria-label="E-mail enviado">
          📩
        </span>
      </div>

      <h2
        className={`font-serif text-[1.6rem] mb-3 ${isDark ? "text-clama-cream" : "text-clama-night"}`}
      >
        Confira seu e-mail
      </h2>

      <p
        className={`font-sans text-[0.95rem] leading-relaxed mb-2 ${isDark ? "text-clama-cream/60" : "text-[#666]"}`}
      >
        Mandamos um link de confirmação para
        <br />
        <strong className={isDark ? "text-clama-cream" : "text-clama-night"}>
          {email}
        </strong>
        .
      </p>
      <p
        className={`font-sans text-[0.95rem] leading-relaxed mb-8 ${isDark ? "text-clama-cream/60" : "text-[#666]"}`}
      >
        Clique no link pra finalizar e receber sua oração. O link vale 24h.
      </p>

      <div
        className={`rounded-xl p-5 mb-8 text-left border ${isDark ? "border-clama-gold/20 bg-clama-night-deep" : "border-[#e0d8f0] bg-clama-cream"}`}
      >
        <p
          className={`font-sans text-[0.78rem] tracking-[1px] uppercase mb-2 ${isDark ? "text-clama-gold-soft" : "text-[#888]"}`}
        >
          Não recebeu?
        </p>
        <p
          className={`font-sans text-[0.9rem] leading-relaxed ${isDark ? "text-clama-cream/60" : "text-[#666]"}`}
        >
          Confira a pasta de spam/lixo eletrônico. Se ainda não chegou em
          alguns minutos, entre em contato em{" "}
          <a
            href="mailto:contato@clama.me"
            className={
              isDark
                ? "text-clama-gold hover:underline"
                : "text-[#8a5cf6] hover:underline"
            }
          >
            contato@clama.me
          </a>
          .
        </p>
      </div>

      <Link to="/">
        <button
          className={
            isDark
              ? "bg-transparent text-clama-cream border-[1.5px] border-clama-gold/40 py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-clama-gold/10 transition-colors"
              : "bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors"
          }
        >
          Voltar para o início
        </button>
      </Link>
    </section>
  );
}
