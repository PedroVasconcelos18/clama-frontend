import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-[#110720] py-10 px-6 text-center">
      {/* Logo */}
      <Link
        to="/"
        className="font-serif text-[1.6rem] font-bold text-clama-gold inline-block mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold rounded"
      >
        Clama.
      </Link>

      {/* Tagline */}
      <p className="font-sans text-[0.78rem] text-white/45 leading-relaxed">
        Oração, justiça e ternura · Inspirado no Evangelho da Libertação
        <br />
        A partir da teologia de Leonardo Boff
      </p>

      {/* Legal links */}
      <nav
        aria-label="Links legais"
        className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 font-sans text-[0.78rem]"
      >
        <Link
          to="/termos"
          className="text-white/60 hover:text-clama-gold underline-offset-4 hover:underline"
        >
          Termos de Uso
        </Link>
        <span className="text-white/25">·</span>
        <Link
          to="/privacidade"
          className="text-white/60 hover:text-clama-gold underline-offset-4 hover:underline"
        >
          Política de Privacidade
        </Link>
        <span className="text-white/25">·</span>
        <a
          href="mailto:contato@clama.me"
          className="text-white/60 hover:text-clama-gold underline-offset-4 hover:underline"
        >
          Contato
        </a>
      </nav>

      {/* Legal notice */}
      <p className="mt-6 font-sans text-[0.72rem] text-white/35 leading-relaxed max-w-[520px] mx-auto">
        O Clama é uma plataforma de conteúdo de apoio espiritual motivacional.
        Não é uma instituição religiosa ou serviço de aconselhamento profissional.
      </p>

      {/* Copyright */}
      <p className="mt-4 font-sans text-[0.7rem] text-white/30">
        © {new Date().getFullYear()} Clama. Todos os direitos reservados.
      </p>
    </footer>
  );
}
