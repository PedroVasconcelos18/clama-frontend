import { useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getPedidoSchema,
  type PedidoFormData,
  type PedidoFormInput,
} from "@/lib/schemas/pedido";
import { type Plan } from "@/types/plano.types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { maskCpfCnpj, maskTelefoneBR } from "@/lib/formatters";

interface PrayerFormProps {
  planos: Plan[];
  onSubmit: (data: PedidoFormData) => void;
  /**
   * @deprecated Telefone agora é sempre obrigatório (paridade com form
   * gratuito). Prop mantida pra retrocompat — ignorada.
   */
  requireTelefone?: boolean;
  onValidityChange?: (isValid: boolean) => void;
  /** "light" (default) = LP; "dark" = variante /conta. */
  theme?: "light" | "dark";
  /**
   * Valores iniciais pra pré-preencher (cliente logado na /conta). Os campos
   * continuam editáveis — só semeia os defaults. `pedido_oracao`/`consent`
   * nunca são pré-preenchidos (são sempre do usuário no momento).
   */
  prefill?: {
    nome?: string;
    email?: string;
    cpf_cnpj?: string;
    telefone?: string;
    idade?: number | null;
    sexo?: string;
  };
}

export function PrayerForm({
  onSubmit,
  onValidityChange,
  theme = "light",
  prefill,
}: PrayerFormProps) {
  const isDark = theme === "dark";
  const schema = useMemo(() => getPedidoSchema(), []);

  // Sexo do backend é "" | "feminino" | "masculino" | "nao_informado".
  // Vazio/ inválido → undefined (Select cai no placeholder "-").
  const prefillSexo = (
    prefill?.sexo && prefill.sexo !== ""
      ? (prefill.sexo as PedidoFormInput["sexo"])
      : undefined
  );
  const prefillIdade = prefill?.idade ?? "";
  // Telefone do cadastro chega cru (ex.: +5511999999999). Mascara aqui pra
  // exibir formatado — maskTelefoneBR descarta o código de país 55.
  const prefillTelefone = prefill?.telefone
    ? maskTelefoneBR(prefill.telefone)
    : "";
  // CPF/CNPJ do cadastro chega só com dígitos. Mascara aqui pra exibir
  // formatado (000.000.000-00 / 00.000.000/0000-00).
  const prefillCpfCnpj = prefill?.cpf_cnpj
    ? maskCpfCnpj(prefill.cpf_cnpj)
    : "";

  const form = useForm<PedidoFormInput, unknown, PedidoFormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      nome: prefill?.nome ?? "",
      email: prefill?.email ?? "",
      cpf_cnpj: prefillCpfCnpj,
      telefone: prefillTelefone,
      idade: prefillIdade,
      sexo: prefillSexo,
      pedido_oracao: "",
      consent_aceito: false,
    },
  });

  // Robustez: se o prefill chegar async (user carregado depois do mount) e o
  // usuário ainda não tocou no form, semeia os campos uma única vez. Não
  // sobrescreve nada que o usuário já tenha editado (guarda por isDirty).
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!prefill) return;
    if (form.formState.isDirty) return;
    const hasAny =
      prefill.nome ||
      prefill.email ||
      prefill.cpf_cnpj ||
      prefill.telefone ||
      prefill.idade != null ||
      prefill.sexo;
    if (!hasAny) return;
    prefilledRef.current = true;
    form.reset({
      nome: prefill.nome ?? "",
      email: prefill.email ?? "",
      cpf_cnpj: prefill.cpf_cnpj ? maskCpfCnpj(prefill.cpf_cnpj) : "",
      telefone: prefill.telefone ? maskTelefoneBR(prefill.telefone) : "",
      idade: prefill.idade ?? "",
      sexo:
        prefill.sexo && prefill.sexo !== ""
          ? (prefill.sexo as PedidoFormInput["sexo"])
          : undefined,
      pedido_oracao: "",
      consent_aceito: false,
    });
  }, [prefill, form]);

  // Handler para aplicar máscara no CPF/CNPJ
  const handleCpfCnpjChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCpfCnpj(e.target.value);
      form.setValue("cpf_cnpj", masked, { shouldValidate: true });
    },
    [form]
  );

  // Handler para aplicar máscara no telefone (visual; o submit envia
  // só dígitos — backend não recebe a máscara).
  const handleTelefoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskTelefoneBR(e.target.value);
      form.setValue("telefone", masked, { shouldValidate: true });
    },
    [form]
  );

  // Notify parent of validity changes
  useEffect(() => {
    onValidityChange?.(form.formState.isValid);
  }, [form.formState.isValid, onValidityChange]);

  const handleSubmit = form.handleSubmit((data) => {
    const cleanedData: PedidoFormData = {
      ...data,
      pedido_oracao: data.pedido_oracao || undefined,
      sexo: data.sexo || undefined,
      // Backend espera só dígitos — remove a máscara visual do telefone.
      telefone: data.telefone.replace(/\D/g, ""),
    };
    onSubmit(cleanedData);
  });

  // Estilos por tema. Light = visual original (LP, intacto).
  const inputClass = isDark
    ? "w-full py-2 px-3 border-[1.5px] border-clama-gold/30 rounded-[10px] text-[0.9rem] font-sans text-clama-cream bg-clama-night [color-scheme:dark] placeholder:text-clama-cream/35 outline-none focus:border-clama-gold"
    : "w-full py-2 px-3 border-[1.5px] border-[#e0d8f0] rounded-[10px] text-[0.9rem] font-sans text-clama-night bg-white outline-none focus:border-[#8a5cf6]";
  const labelClass = isDark
    ? "font-sans text-[0.8rem] font-semibold text-clama-cream tracking-[0.5px] uppercase block mb-1"
    : "font-sans text-[0.8rem] font-semibold text-clama-night tracking-[0.5px] uppercase block mb-1";
  const msgClass = isDark
    ? "text-red-300 text-sm"
    : "text-[#8a5cf6] text-sm";
  const linkClass = isDark
    ? "text-clama-gold hover:underline"
    : "text-[#8a5cf6] hover:underline";

  return (
    <Form {...form}>
      <form id="prayer-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Nome completo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Como você se chama?"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage className={msgClass} />
            </FormItem>
          )}
        />

        {/* Idade + Sexo Grid */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="idade"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Idade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Ex: 28"
                    className={inputClass}
                    {...field}
                    value={(field.value as number | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage className={msgClass} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Sexo</FormLabel>
                <FormControl>
                  <Select
                    className={
                      isDark
                        ? `${inputClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23f0c040' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center]`
                        : `${inputClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center]`
                    }
                    {...field}
                    value={field.value ?? ""}
                  >
                    <option value="">-</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="nao_informado">Prefiro não informar</option>
                  </Select>
                </FormControl>
                <FormMessage className={msgClass} />
              </FormItem>
            )}
          />
        </div>

        {/* E-mail */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="seu@email.com.br"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage className={msgClass} />
            </FormItem>
          )}
        />

        {/* CPF/CNPJ */}
        <FormField
          control={form.control}
          name="cpf_cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>CPF ou CNPJ</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className={inputClass}
                  {...field}
                  onChange={handleCpfCnpjChange}
                />
              </FormControl>
              <FormMessage className={msgClass} />
            </FormItem>
          )}
        />

        {/* Telefone — sempre obrigatório (paridade com form gratuito). */}
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>WhatsApp</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                  {...field}
                  onChange={handleTelefoneChange}
                />
              </FormControl>
              <FormMessage className={msgClass} />
            </FormItem>
          )}
        />

        {/* Divider */}
        <hr
          className={`border-none border-t my-6 ${isDark ? "border-clama-gold/12" : "border-[#f0eaf8]"}`}
        />

        {/* Section: Seu pedido */}
        <div
          className={`font-sans text-[0.72rem] font-bold tracking-[2px] uppercase mb-4 ${isDark ? "text-clama-gold-soft" : "text-[#8a5cf6]"}`}
        >
          Seu pedido
        </div>

        {/* Pedido de Oração */}
        <FormField
          control={form.control}
          name="pedido_oracao"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Escreva seu clamor</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Conte o que está no seu coração. Sua dor, sua indignação, sua esperança — tudo o que pede libertação."
                  rows={5}
                  className={`${inputClass} font-serif leading-relaxed resize-y min-h-[120px]`}
                  {...field}
                />
              </FormControl>
              <FormMessage className={msgClass} />
            </FormItem>
          )}
        />

        <p
          className={`font-sans text-[0.78rem] leading-relaxed mb-6 ${isDark ? "text-clama-cream/45" : "text-[#aaa]"}`}
        >
          Sua dor, sua indignação, sua esperança são sagradas. Deus ouve desde o fundo do poço — e do fundo da história.
        </p>

        {/* Consent Checkbox */}
        <FormField
          control={form.control}
          name="consent_aceito"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3">
                <FormControl>
                  <input
                    type="checkbox"
                    id="consent_aceito"
                    checked={field.value}
                    onChange={field.onChange}
                    className={
                      isDark
                        ? "mt-1 h-4 w-4 rounded border-clama-gold/40 bg-clama-night text-clama-gold accent-clama-gold focus:ring-clama-gold/30"
                        : "mt-1 h-4 w-4 rounded border-[#e0d8f0] bg-white text-[#8a5cf6] focus:ring-[#8a5cf6]/30"
                    }
                  />
                </FormControl>
                <label
                  htmlFor="consent_aceito"
                  className={`text-sm leading-relaxed cursor-pointer ${isDark ? "text-clama-cream/75" : "text-clama-night/80"}`}
                >
                  Li e concordo com os{" "}
                  <Link to="/termos" target="_blank" className={linkClass}>
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link
                    to="/privacidade"
                    target="_blank"
                    className={linkClass}
                  >
                    Política de Privacidade
                  </Link>
                  . Autorizo o uso do conteúdo do meu pedido exclusivamente para geração da oração personalizada.
                </label>
              </div>
              <FormMessage className={`${msgClass} mt-2`} />
            </FormItem>
          )}
        />

      </form>
    </Form>
  );
}
