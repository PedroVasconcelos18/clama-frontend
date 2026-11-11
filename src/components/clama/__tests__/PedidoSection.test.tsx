import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PedidoSection } from "../PedidoSection";
import { mockApiFetch, usuarioFixture } from "@/test/sessao";
import { formatCurrency } from "@/lib/formatters";
import { SessaoProvider } from "@/contexts/SessaoContext";
import { PastoralApiError } from "@/lib/api";

// Anti-robô e fingerprint resolvem na hora (o real depende da rede).
vi.mock("@/lib/captcha/turnstile", () => ({
  getTurnstileSiteKey: () => "chave",
  Turnstile: ({ onSuccess }: { onSuccess: (t: string) => void }) => {
    setTimeout(() => onSuccess("token-turnstile"), 0);
    return null;
  },
}));
// O select do base-ui precisa de APIs que o jsdom não tem; um <select> nativo basta aqui.
vi.mock("@/components/clama/InstituicaoSelect", () => ({
  InstituicaoSelect: ({
    instituicoes,
    value,
    onChange,
  }: {
    instituicoes: { id: number; nome: string }[];
    value: number | null;
    onChange: (v: number | null) => void;
  }) => (
    <select
      aria-label="Instituição"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">Sem instituição</option>
      {instituicoes.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nome}
        </option>
      ))}
    </select>
  ),
}));
vi.mock("@/lib/fingerprint", () => ({ obterDeviceHash: () => Promise.resolve("hash-do-aparelho") }));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// O Intl separa "R$" do número com U+00A0; casa qualquer espaço.
const moeda = (centavos: number) =>
  new RegExp(formatCurrency(centavos).replace(/[$]/g, "\\$").replace(/\s/g, "\\s"));

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <SessaoProvider>{ui}</SessaoProvider>
    </MemoryRouter>,
  );
}

describe("PedidoSection", () => {
  let planos: unknown[];
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
    planos = [
      { id: 1, nome: "Plano 1", descricao: "d1", valorCentavos: 199, complexidade: "SIMPLES", ordem: 1 },
      { id: 2, nome: "Plano 2", descricao: "d2", valorCentavos: 999, complexidade: "COM_VERSICULO", ordem: 2 },
      { id: 3, nome: "Plano 3", descricao: "d3", valorCentavos: 4999, complexidade: "COM_PROFECIA_E_VERSICULOS", ordem: 3 },
    ];
    mockApiFetch({ outras: (path) => (path === "/api/planos" ? planos : []) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("renders a section with id='fazer-pedido'", async () => {
    const { container } = renderWithRouter(<PedidoSection />);
    const section = container.querySelector("#fazer-pedido");
    expect(section).not.toBeNull();
    expect(section?.tagName.toLowerCase()).toBe("section");
  });

  it("exposes the section element through forwarded ref", async () => {
    const ref = createRef<HTMLElement>();
    renderWithRouter(<PedidoSection ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.id).toBe("fazer-pedido");
  });

  it("does not render the old 'Leve seu clamor' intro", async () => {
    renderWithRouter(<PedidoSection />);
    expect(screen.queryByText("Leve seu clamor")).toBeNull();
  });

  it("renders the form section labels after planos load", async () => {
    renderWithRouter(<PedidoSection />);
    await waitFor(() => {
      expect(screen.getByText("Seus dados")).toBeInTheDocument();
    });
    expect(screen.getByText("Escolha sua contribuição")).toBeInTheDocument();
  });

  it("renders with scroll-mt utility for sticky-nav offset", () => {
    const { container } = renderWithRouter(<PedidoSection />);
    const section = container.querySelector("#fazer-pedido");
    expect(section?.className).toMatch(/scroll-mt-/);
  });

  describe("AC8 — CTA condicional por auth", () => {
    it("anônimo: o pedido (UI unificada) não exige login nem mostra 'Levar meu clamor'", async () => {
      renderWithRouter(<PedidoSection />);

      await waitFor(() => {
        expect(screen.getByText("Seus dados")).toBeInTheDocument();
      });
      expect(
        screen.queryByRole("button", { name: /Entrar para fazer pedido/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /Levar meu clamor/i }),
      ).toBeNull();
    });

    it("autenticado: CTA é 'Levar meu clamor' (comportamento atual preservado)", async () => {
      mockApiFetch({ usuario: usuarioFixture, outras: (path) => (path === "/api/planos" ? planos : []) });
      renderWithRouter(<PedidoSection />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Levar meu clamor/i }),
        ).toBeInTheDocument();
      });

      // Botão de login não deve aparecer
      expect(
        screen.queryByRole("button", { name: /Entrar para fazer pedido/i }),
      ).toBeNull();
    });
  });

  describe("vitrine com o catálogo novo", () => {
    it("lê /api/planos e /api/instituicoes sem barra final e formata o valor com Intl", async () => {
      const spy = mockApiFetch({
        outras: (path) =>
          path === "/api/planos"
            ? planos
            : [{ id: 3, nome: "Casa de Apoio", logoUrl: "/api/instituicoes/3/logo?v=abcd1234" }],
      });
      renderWithRouter(<PedidoSection />);

      expect(await screen.findByText(moeda(999))).toBeInTheDocument();
      expect(screen.getByText(moeda(4999))).toBeInTheDocument();
      expect(screen.getByText("Mais escolhido")).toBeInTheDocument();
      const caminhos = spy.mock.calls.map((c) => c[0]);
      expect(caminhos).toContain("/api/planos");
      expect(caminhos).toContain("/api/instituicoes");
    });

    it("descarta em silêncio o rascunho antigo com selectedPlanId UUID", async () => {
      localStorage.setItem(
        "clama:form-draft",
        JSON.stringify({
          formData: {},
          offering: { selectedPlanId: "0b8f-uuid-antigo", valorLivre: null, valorLivreActive: false, gratuito: false },
          canal: "EMAIL",
        }),
      );
      renderWithRouter(<PedidoSection />);
      await screen.findByText(moeda(999));
      expect(screen.queryAllByRole("radio", { checked: true }).length).toBe(1); // o semeado (Livre), não o plano antigo
      expect(localStorage.getItem("clama:form-draft") ?? "").not.toContain("uuid-antigo");
    });
  });

  describe("envio do pedido (contrato da onda 4a)", () => {
    const ID = "12345678-aaaa-bbbb-cccc-1234567890ab";
    const CPF = "529.982.247-25";
    let criados: number;
    let corpos: Record<string, Record<string, unknown>>;
    let statusDoPedido: string;
    let falhaNaCriacao: PastoralApiError | null;

    const outras = (path: string, init?: RequestInit) => {
      if (path === "/api/planos") return planos;
      if (path === "/api/instituicoes") return [{ id: 7, nome: "Casa de Apoio", logoUrl: null }];
      if (init?.method === "POST") {
        if (falhaNaCriacao) throw falhaNaCriacao;
        criados += 1;
        corpos[path] = JSON.parse(String(init.body));
        return { id: ID, status: "AGUARDANDO_PAGAMENTO" };
      }
      if (path === `/api/pedidos/${ID}`) return { id: ID, status: statusDoPedido, valorCentavos: 999 };
      throw new Error(`sem mock: ${path}`);
    };

    beforeEach(() => {
      criados = 0;
      corpos = {};
      statusDoPedido = "AGUARDANDO_PAGAMENTO";
      falhaNaCriacao = null;
    });

    // O FormControl do projeto é um <div>: o rótulo não aponta para o campo; vai pelo name.
    const campo = (name: string) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (!el) throw new Error(`campo ${name} ausente`);
      return el as HTMLElement;
    };

    async function preencherLogado() {
      await screen.findByText("Seus dados");
      await waitFor(() => campo("cpf_cnpj"));
      await userEvent.type(campo("cpf_cnpj"), CPF);
      await userEvent.type(campo("idade"), "30");
      await userEvent.selectOptions(campo("sexo"), "feminino");
      await userEvent.click(screen.getByRole("checkbox"));
    }

    async function enviarLogadoPago() {
      mockApiFetch({ usuario: usuarioFixture, outras });
      renderWithRouter(<PedidoSection />);
      await preencherLogado();
      await userEvent.click(screen.getByRole("radio", { name: /Plano 2|Mais escolhido/ }));
      await userEvent.click(screen.getByRole("button", { name: /Levar meu clamor/i }));
    }

    it("logado pago: cria em /api/pedidos com camelCase, sem canal, e vai para a confirmação", async () => {
      await enviarLogadoPago();
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/confirmacao?pedido_id=${ID}`));
      expect(corpos["/api/pedidos"]).toMatchObject({
        nome: "Pedro",
        email: "fiel@example.com",
        cpfCnpj: "52998224725",
        idade: 30,
        sexo: "feminino",
        consentAceito: true,
        plano: 2,
        valorCentavos: 999,
      });
      expect(corpos["/api/pedidos"]).not.toHaveProperty("canal_entrega");
      expect(corpos["/api/pedidos"]).not.toHaveProperty("telefone"); // opcional e vazio
      expect(Object.keys(corpos)).toEqual(["/api/pedidos"]); // o Pix é da confirmação
    });

    const enviarDeNovo = () => userEvent.click(screen.getByRole("button", { name: /Levar meu clamor/i }));
    const primeiroEnvio = async () => {
      await enviarLogadoPago();
      await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
      expect(criados).toBe(1);
    };

    it("logado pago: enviar de novo com os mesmos dados reusa o pedido, sem POST novo", async () => {
      await primeiroEnvio();
      await enviarDeNovo();
      await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(2));
      expect(navigateMock).toHaveBeenLastCalledWith(`/confirmacao?pedido_id=${ID}`);
      expect(criados).toBe(1);
    });

    it("mesmo valor e mesmo dono, mas outro CPF: cria um pedido novo", async () => {
      await primeiroEnvio();
      await userEvent.clear(campo("cpf_cnpj"));
      await userEvent.type(campo("cpf_cnpj"), "111.444.777-35");
      await enviarDeNovo();
      await waitFor(() => expect(criados).toBe(2));
    });

    it("mesmo valor e mesmo dono, mas outra instituição: cria um pedido novo", async () => {
      await primeiroEnvio();
      await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Instituição" }), "7");
      await enviarDeNovo();
      await waitFor(() => expect(criados).toBe(2));
      expect(corpos["/api/pedidos"]).toMatchObject({ instituicao: 7 });
    });

    it("pedido já pago: cria um pedido novo", async () => {
      await primeiroEnvio();
      statusDoPedido = "PAGO";
      await enviarDeNovo();
      await waitFor(() => expect(criados).toBe(2));
    });

    it("depois de 24 h (prazo do Pix) não reusa", async () => {
      await primeiroEnvio();
      const agora = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(agora + 24 * 3600_000 + 1000);
      await enviarDeNovo();
      await waitFor(() => expect(criados).toBe(2));
    });

    it("o rascunho guarda só id, assinatura e data: nem CPF nem nome em claro", async () => {
      await primeiroEnvio();
      const rascunho = localStorage.getItem("clama:form-draft") ?? "";
      expect(rascunho).toContain(ID);
      expect(rascunho).not.toContain("52998224725");
      expect(rascunho).not.toContain("529.982.247-25");
      expect(rascunho).not.toContain("Pedro");
      expect(rascunho).not.toContain("fiel@example.com");
      const { valor } = JSON.parse(rascunho);
      expect(Object.keys(valor.pedido).sort()).toEqual(["assinatura", "criadoEm", "id"]);
      expect(valor.pedido.assinatura).toMatch(/^[0-9a-f]{64}$/);
      expect(valor.formData).toEqual({});
    });

    it("o rascunho sobrevive a recarregar: mesmos dados vão direto à confirmação", async () => {
      const { unmount } = await (async () => {
        mockApiFetch({ usuario: usuarioFixture, outras });
        const r = renderWithRouter(<PedidoSection />);
        await preencherLogado();
        await userEvent.click(screen.getByRole("radio", { name: /Plano 2|Mais escolhido/ }));
        await enviarDeNovo();
        await waitFor(() => expect(criados).toBe(1));
        return r;
      })();
      unmount();
      renderWithRouter(<PedidoSection />);
      await preencherLogado();
      await enviarDeNovo(); // o plano 2 continua marcado pelo rascunho
      await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(2));
      expect(criados).toBe(1);
    });

    it("erro da criação mostra a mensagem pastoral do servidor", async () => {
      falhaNaCriacao = new PastoralApiError(
        "Erro",
        "valor_abaixo_do_minimo",
        "O valor mínimo para doação é R$ 1,00.",
        422,
      );
      await enviarLogadoPago();
      expect(await screen.findByText("O valor mínimo para doação é R$ 1,00.")).toBeInTheDocument();
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("400 dados_invalidos mostra a mensagem do campo, não só 'Dados inválidos.'", async () => {
      falhaNaCriacao = new PastoralApiError("Erro", "dados_invalidos", "Dados inválidos.", 400, {}, {
        instituicao: "Não encontramos essa instituição. Escolha uma da lista, por favor.",
      });
      await enviarLogadoPago();
      expect(await screen.findByText(/Não encontramos essa instituição/)).toBeInTheDocument();
    });

    it("logado gratuito: /api/pedidos/gratuito e confirmação", async () => {
      mockApiFetch({ usuario: usuarioFixture, outras });
      renderWithRouter(<PedidoSection />);
      await preencherLogado();
      await userEvent.click(screen.getByRole("radio", { name: /Gratuito/ }));
      await userEvent.click(screen.getByRole("button", { name: /Levar meu clamor/i }));
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/confirmacao?pedido_id=${ID}`));
      expect(Object.keys(corpos)).toEqual(["/api/pedidos/gratuito"]);
      expect(corpos["/api/pedidos/gratuito"]).toMatchObject({ cpfCnpj: "52998224725", consentAceito: true });
    });

    it("anônimo pago: /api/doacoes com Turnstile, valor livre e instituição; telefone opcional", async () => {
      mockApiFetch({ outras });
      renderWithRouter(<PedidoSection />);
      expect(await screen.findByText("Telefone (opcional)")).toBeInTheDocument();
      await userEvent.type(campo("nome"), "Maria Doadora");
      await userEvent.type(campo("email"), "maria@example.com");
      await userEvent.type(campo("cpf_cnpj"), CPF);
      await userEvent.type(campo("idade"), "40");
      await userEvent.selectOptions(campo("sexo"), "nao_informado");
      await userEvent.click(screen.getByRole("checkbox"));
      await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Instituição" }), "7");
      await userEvent.click(screen.getByRole("button", { name: /Contribuir e receber/i }));
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/confirmacao?pedido_id=${ID}`));
      expect(Object.keys(corpos)).toEqual(["/api/doacoes"]);
      expect(corpos["/api/doacoes"]).toMatchObject({
        nome: "Maria Doadora",
        email: "maria@example.com",
        cpfCnpj: "52998224725",
        valorCentavos: 100,
        instituicao: 7,
        turnstileToken: "token-turnstile",
        deviceHash: "hash-do-aparelho",
        consentAceito: true,
      });
      expect(corpos["/api/doacoes"]).not.toHaveProperty("telefone");
    });
  });
});
