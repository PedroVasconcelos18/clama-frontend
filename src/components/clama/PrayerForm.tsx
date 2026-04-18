import { useEffect, useMemo, useCallback } from "react";
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

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 * baseado na quantidade de dígitos.
 */
function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
}

interface PrayerFormProps {
  planos: Plan[];
  onSubmit: (data: PedidoFormData) => void;
  requireTelefone?: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

export function PrayerForm({
  onSubmit,
  requireTelefone = false,
  onValidityChange,
}: PrayerFormProps) {
  const schema = useMemo(
    () => getPedidoSchema(requireTelefone),
    [requireTelefone]
  );

  const form = useForm<PedidoFormInput, unknown, PedidoFormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      nome: "",
      email: "",
      cpf_cnpj: "",
      telefone: "",
      pedido_oracao: "",
      consent_aceito: false,
    },
  });

  // Handler para aplicar máscara no CPF/CNPJ
  const handleCpfCnpjChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCpfCnpj(e.target.value);
      form.setValue("cpf_cnpj", masked, { shouldValidate: true });
    },
    [form]
  );

  // Re-validate telefone when requireTelefone changes
  useEffect(() => {
    if (form.formState.isSubmitted || form.formState.touchedFields.telefone) {
      form.trigger("telefone");
    }
  }, [requireTelefone, form]);

  // Notify parent of validity changes
  useEffect(() => {
    onValidityChange?.(form.formState.isValid);
  }, [form.formState.isValid, onValidityChange]);

  const handleSubmit = form.handleSubmit((data) => {
    const cleanedData: PedidoFormData = {
      ...data,
      idade: data.idade === "" ? undefined : data.idade,
      telefone: data.telefone || undefined,
      pedido_oracao: data.pedido_oracao || undefined,
      sexo: data.sexo || undefined,
    };
    onSubmit(cleanedData);
  });

  // Input styles for white form
  const inputClass = "w-full py-2 px-3 border-[1.5px] border-[#e0d8f0] rounded-[10px] text-[0.9rem] font-sans text-clama-night bg-white outline-none focus:border-[#8a5cf6]";
  const labelClass = "font-sans text-[0.8rem] font-semibold text-clama-night tracking-[0.5px] uppercase block mb-1";

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
              <FormMessage className="text-[#8a5cf6] text-sm" />
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
                    value={(field.value as number | "" | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage className="text-[#8a5cf6] text-sm" />
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
                    className={`w-full py-2 px-3 border-[1.5px] border-[#e0d8f0] rounded-[10px] text-[0.9rem] font-sans text-clama-night bg-white outline-none focus:border-[#8a5cf6] appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center]`}
                    {...field}
                    value={field.value ?? ""}
                  >
                    <option value="">-</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="nao_informado">Prefiro não informar</option>
                  </Select>
                </FormControl>
                <FormMessage className="text-[#8a5cf6] text-sm" />
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
              <FormMessage className="text-[#8a5cf6] text-sm" />
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
              <FormMessage className="text-[#8a5cf6] text-sm" />
            </FormItem>
          )}
        />

        {/* WhatsApp - comentado temporariamente
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>WhatsApp</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[#8a5cf6] text-sm" />
            </FormItem>
          )}
        />
        */}

        {/* Divider */}
        <hr className="border-none border-t border-[#f0eaf8] my-6" />

        {/* Section: Seu pedido */}
        <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
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
                  placeholder="Conte o que está no seu coração. Sua dor, sua indignação, sua esperança — tudo o que pede libertação. Deus ouve o clamor do povo."
                  rows={5}
                  className={`${inputClass} font-serif leading-relaxed resize-y min-h-[120px]`}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[#8a5cf6] text-sm" />
            </FormItem>
          )}
        />

        <p className="font-sans text-[0.78rem] text-[#aaa] leading-relaxed mb-6">
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
                    className="mt-1 h-4 w-4 rounded border-[#e0d8f0] bg-white text-[#8a5cf6] focus:ring-[#8a5cf6]/30"
                  />
                </FormControl>
                <label
                  htmlFor="consent_aceito"
                  className="text-sm text-clama-night/80 leading-relaxed cursor-pointer"
                >
                  Li e concordo com os{" "}
                  <Link
                    to="/termos"
                    target="_blank"
                    className="text-[#8a5cf6] hover:underline"
                  >
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link
                    to="/privacidade"
                    target="_blank"
                    className="text-[#8a5cf6] hover:underline"
                  >
                    Política de Privacidade
                  </Link>
                  . Autorizo o uso do conteúdo do meu pedido exclusivamente para geração da oração personalizada.
                </label>
              </div>
              <FormMessage className="text-[#8a5cf6] text-sm mt-2" />
            </FormItem>
          )}
        />

      </form>
    </Form>
  );
}
