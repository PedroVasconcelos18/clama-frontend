import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-[#110720] py-8 px-6 text-center">
      {/* Logo */}
      <Link
        to="/"
        className="font-serif text-[1.6rem] font-bold text-clama-gold inline-block mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold rounded"
      >
        Clama.
      </Link>

      {/* Tagline */}
      <p className="font-sans text-[0.78rem] text-white/35 leading-relaxed">
        Seu oratório digital • Intercedemos por você 24h
        <br />
        contato@clama.me
      </p>
    </footer>
  );
}
