import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import PedidoGratuito from "../PedidoGratuito";
import * as freemiumApi from "@/lib/api/freemium";
import { PastoralApiError } from "@/lib/api";
import * as fingerprintModule from "@/lib/fingerprint";

const VALID_CPF = "111.444.777-35"; // CPF com dígitos verificadores válidos
const INVALID_CPF = "111.444.777-30"; // mesma raiz, dígito errado

const navigateMock = vi.fn();

// Mock react-router useNavigate (caso a página use no futuro).
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Sonner toast mock — captura chamadas para asserções.
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner");
  return {
    ...actual,
    toast: {
      ...actual.toast,
      success: (...args: unknown[]) => toastSuccessMock(...args),
      error: (...args: unknown[]) => toastErrorMock(...args),
    },
  };
});

/**
 * Mock do componente Turnstile: renderiza um div invisível e dispara
 * `onSuccess("mock-turnstile-token")` no mount, simulando o caminho feliz
 * (Cloudflare resolveu sem desafio interativo).
 */
vi.mock("@/lib/captcha/turnstile", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    Turnstile: ({
      onSuccess,
    }: {
      onSuccess?: (token: string) => void;
    }) => {
      React.useEffect(() => {
        onSuccess?.("mock-turnstile-token");
      }, [onSuccess]);
      return React.createElement("div", { "data-testid": "turnstile-mock" });
    },
    getTurnstileSiteKey: () => "mock-site-key",
    TURNSTILE_SANDBOX_ALWAYS_PASS: "1x00000000000000000000AA",
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PedidoGratuito />
    </MemoryRouter>,
  );
}

/**
 * Preenche os campos do formulário com dados válidos.
 * Não clica em nenhum botão — chamadores decidem o próximo passo.
 */
async function fillBasicFields() {
  fireEvent.change(screen.getByPlaceholderText(/Como você se chama/i), {
    target: { value: "Pedro Henrique" },
  });
  fireEvent.change(screen.getByPlaceholderText(/seu@email/i), {
    target: { value: "pedro@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText(/000\.000\.000-00/), {
    target: { value: VALID_CPF },
  });
  fireEvent.change(screen.getByPlaceholderText(/\(11\) 99999-9999/), {
    target: { value: "11987654321" },
  });

  // Sexo (select)
  const selects = screen.getAllByRole("combobox");
  if (selects[0]) {
    fireEvent.change(selects[0], { target: { value: "masculino" } });
  }

  // Consent
  const consent = screen.getByLabelText(/Termos de Uso/i);
  fireEvent.click(consent);
}

describe("PedidoGratuito (/oracao-gratis) — fluxo v2 (CAPTCHA + email opt-in)", () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
    toastSuccessMock.mockClear();
    toastErrorMock.mockClear();
    fingerprintModule._resetDeviceHashCache();
    vi.spyOn(fingerprintModule, "obterDeviceHash").mockResolvedValue(
      "mock-device-hash-12345",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza o cabeçalho pastoral e o form", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        name: /Sua primeira oração — por nossa conta/i,
      }),
    ).toBeInTheDocument();
    // Subtítulo novo: descreve fluxo de email
    expect(
      screen.getByText(/você receberá um e-mail pra confirmar/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Receber minha oração gratuita/i }),
    ).toBeInTheDocument();
    // Captcha host está presente
    expect(screen.getByTestId("turnstile-mock")).toBeInTheDocument();
  });

  it("happy path: preenche → submit envia payload com turnstile_token + device_hash → mostra tela de confirmação por e-mail", async () => {
    const apiSpy = vi
      .spyOn(freemiumApi, "criarPedidoGratuito")
      .mockResolvedValue({
        pedido_id: "uuid-123",
        status: "AGUARDANDO_CONFIRMACAO_EMAIL",
      });

    renderPage();
    await fillBasicFields();

    const submitBtn = screen.getByRole("button", {
      name: /Receber minha oração gratuita/i,
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => expect(apiSpy).toHaveBeenCalledTimes(1));

    // Payload deve conter turnstile_token + device_hash + telefone E.164
    const payload = apiSpy.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      nome: "Pedro Henrique",
      email: "pedro@example.com",
      cpf_cnpj: "11144477735",
      sexo: "masculino",
      consent_aceito: true,
      turnstile_token: "mock-turnstile-token",
      device_hash: "mock-device-hash-12345",
    });
    expect(payload?.telefone).toMatch(/^\+55/);

    // Tela "verifique seu e-mail" aparece (não redireciona)
    await waitFor(() =>
      expect(screen.getByText(/Confira seu e-mail/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/pedro@example\.com/)).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      expect.stringMatching(/Pedido recebido/i),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("CPF inválido: bloqueia submit no front (Zod) sem chamar a API", async () => {
    const apiSpy = vi
      .spyOn(freemiumApi, "criarPedidoGratuito")
      .mockResolvedValue({
        pedido_id: "uuid-x",
        status: "AGUARDANDO_CONFIRMACAO_EMAIL",
      });

    renderPage();
    await fillBasicFields();

    // Sobrescreve com CPF inválido
    const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/);
    fireEvent.change(cpfInput, { target: { value: INVALID_CPF } });
    fireEvent.blur(cpfInput);

    const submitBtn = screen.getByRole("button", {
      name: /Receber minha oração gratuita/i,
    });
    await waitFor(() => expect(submitBtn).toBeDisabled());

    fireEvent.click(submitBtn);
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it("e-mail descartável (400): mostra mensagem pastoral", async () => {
    vi.spyOn(freemiumApi, "criarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "disposable_email",
        "Use um e-mail principal — assim a oração não se perde.",
        400,
      ),
    );

    renderPage();
    await fillBasicFields();

    const submitBtn = screen.getByRole("button", {
      name: /Receber minha oração gratuita/i,
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Use um e-mail principal — assim a oração não se perde.",
      );
    });
    // Mensagem inline também aparece
    expect(
      screen.getByText(
        /Use um e-mail principal — assim a oração não se perde\./i,
      ),
    ).toBeInTheDocument();
  });

  it("blacklist hit (409): mostra pastoral inline + toast", async () => {
    vi.spyOn(freemiumApi, "criarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Conflict",
        "blacklist_hit",
        "Você já recebeu sua oração gratuita. Que bom te ver de novo!",
        409,
      ),
    );

    renderPage();
    await fillBasicFields();

    const submitBtn = screen.getByRole("button", {
      name: /Receber minha oração gratuita/i,
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Você já recebeu sua oração gratuita. Que bom te ver de novo!",
      );
    });
    expect(
      screen.getByText(
        /Você já recebeu sua oração gratuita\. Que bom te ver de novo!/i,
      ),
    ).toBeInTheDocument();
  });

  it("CAPTCHA inválido (400): mostra pastoral", async () => {
    vi.spyOn(freemiumApi, "criarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "captcha_invalido",
        "Verificação anti-robô falhou. Recarregue a página e tente de novo.",
        400,
      ),
    );

    renderPage();
    await fillBasicFields();

    const submitBtn = screen.getByRole("button", {
      name: /Receber minha oração gratuita/i,
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Verificação anti-robô falhou. Recarregue a página e tente de novo.",
      );
    });
  });

  it("rate limit IP (429): mostra pastoral", async () => {
    vi.spyOn(freemiumApi, "criarPedidoGratuito").mockRejectedValue(
      new PastoralApiError(
        "Erro",
        "rate_limit",
        "Muitos cadastros recentes desse IP. Aguarde uma hora.",
        429,
      ),
    );

    renderPage();
    await fillBasicFields();

    const submitBtn = screen.getByRole("button", {
      name: /Receber minha oração gratuita/i,
    });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Muitos cadastros recentes desse IP. Aguarde uma hora.",
      );
    });
  });

  it("turnstile_token vazio: schema Zod rejeita o submit", async () => {
    // Verifica diretamente no schema que sem `turnstile_token` o pedido
    // é inválido. Como o componente usa `mode: "onChange"` com
    // `zodResolver(schema)`, o botão fica desabilitado pelo `formState.isValid`.
    // Asserir no schema é mais robusto do que tentar dynamic-mock o Turnstile.
    const { pedidoGratuitoSchema } = await import(
      "@/lib/schemas/pedido-gratuito"
    );

    const valid = {
      nome: "Pedro Henrique",
      email: "pedro@example.com",
      cpf_cnpj: "11144477735",
      telefone: "11987654321",
      sexo: "masculino",
      consent_aceito: true,
      turnstile_token: "",
      device_hash: "mock-device-hash-12345",
    } as const;

    const result = pedidoGratuitoSchema.safeParse(valid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("turnstile_token");
    }
  });
});
