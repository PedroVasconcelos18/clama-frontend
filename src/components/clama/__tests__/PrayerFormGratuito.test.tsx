import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrayerFormGratuito } from "../PrayerFormGratuito";

const { resetTurnstile } = vi.hoisted(() => ({ resetTurnstile: vi.fn() }));
vi.mock("@/lib/captcha/turnstile", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react");
  return {
    getTurnstileSiteKey: () => "chave",
    Turnstile: forwardRef(function Turnstile(
      { onSuccess }: { onSuccess: (t: string) => void },
      ref: React.Ref<{ reset: () => void }>,
    ) {
      useImperativeHandle(ref, () => ({ reset: resetTurnstile }), []);
      useEffect(() => {
        const t = setTimeout(() => onSuccess("token-turnstile"), 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }),
  };
});

const campo = (name: string) => document.querySelector(`[name="${name}"]`) as HTMLElement;

async function preencher() {
  await userEvent.type(campo("nome"), "Maria Gratuita");
  await userEvent.type(campo("email"), "maria@example.com");
  await userEvent.type(campo("cpf_cnpj"), "52998224725");
  await userEvent.type(campo("idade"), "40");
  await userEvent.selectOptions(campo("sexo"), "nao_informado");
  await userEvent.click(screen.getByRole("checkbox"));
}

describe("PrayerFormGratuito", () => {
  beforeEach(() => resetTurnstile.mockClear());

  it("envia sem device_hash e com o telefone opcional vazio", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(
      <MemoryRouter>
        <PrayerFormGratuito onSubmit={onSubmit} isSubmitting={false} />
      </MemoryRouter>,
    );
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /enviar|receber|clamor/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const dados = onSubmit.mock.calls[0]![0];
    expect(dados).not.toHaveProperty("device_hash");
    expect(dados.telefone).toBeUndefined();
    expect(dados.turnstile_token).toBe("token-turnstile");
    expect(resetTurnstile).not.toHaveBeenCalled();
  });

  it("reinicia o Turnstile quando o envio falha (o token é de uso único)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <MemoryRouter>
        <PrayerFormGratuito onSubmit={onSubmit} isSubmitting={false} />
      </MemoryRouter>,
    );
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: /enviar|receber|clamor/i }));
    await waitFor(() => expect(resetTurnstile).toHaveBeenCalledTimes(1));
  });
});
