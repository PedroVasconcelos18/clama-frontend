import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import {
  WhatsAppShareButton,
  buildWhatsAppShareUrl,
} from "../WhatsAppShareButton";

describe("buildWhatsAppShareUrl", () => {
  it("encodes the prayer text and clama link into a wa.me URL", () => {
    const url = buildWhatsAppShareUrl("Senhor, abençoa minha família.");

    expect(url.startsWith("https://wa.me/?text=")).toBe(true);

    const decoded = decodeURIComponent(url.replace("https://wa.me/?text=", ""));
    expect(decoded).toContain("Recebi essa oração através do Clama:");
    expect(decoded).toContain('"Senhor, abençoa minha família."');
    expect(decoded).toContain("Faça também seu pedido: https://clama.me");
  });

  it("preserves real newlines (not literal backslash-n) in the encoded payload", () => {
    const url = buildWhatsAppShareUrl("Texto curto.");
    const decoded = decodeURIComponent(url.replace("https://wa.me/?text=", ""));

    expect(decoded.includes("\n")).toBe(true);
    expect(decoded.includes("\\n")).toBe(false);
  });
});

describe("WhatsAppShareButton", () => {
  it("renders an anchor with the WhatsApp share label", () => {
    render(<WhatsAppShareButton oracaoTexto="Uma oração de paz." />);
    expect(
      screen.getByRole("link", { name: /compartilhar oração no whatsapp/i })
    ).toBeInTheDocument();
  });

  it("opens the wa.me URL in a new tab with safe rel attributes", () => {
    render(<WhatsAppShareButton oracaoTexto="Uma oração de paz." />);

    const link = screen.getByRole("link", {
      name: /compartilhar oração no whatsapp/i,
    });

    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    const decoded = decodeURIComponent(href.replace("https://wa.me/?text=", ""));
    expect(decoded).toContain('"Uma oração de paz."');
    expect(decoded).toContain("https://clama.me");
  });
});
