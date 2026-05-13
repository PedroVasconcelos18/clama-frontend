import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  pedidoGratuitoSchema,
  type PedidoGratuitoData,
  type PedidoGratuitoInput,
} from "@/lib/schemas/pedido-gratuito";
import { Turnstile, getTurnstileSiteKey } from "@/lib/captcha/turnstile";
import { obterDeviceHash } from "@/lib/fingerprint";

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
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/utility/LoadingSpinner";

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 * baseado na quantidade de dígitos.
 */
function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Normaliza telefone digitado em E.164 simples.
 * Aceita "(11) 99999-9999", "+55 11 99999-9999", etc — devolve "+55XXXXXXXXXXX".
 */
function toE164BR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `+${withCountry}`;
}

interface PrayerFormGratuitoProps {
  onSubmit: (data: PedidoGratuitoData) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function PrayerFormGratuito({
  onSubmit,
  isSubmitting = false,
}: PrayerFormGratuitoProps) {
  const schema = useMemo(() => pedidoGratuitoSchema, []);
  const siteKey = useMemo(() => getTurnstileSiteKey(), []);

  const form = useForm<PedidoGratuitoInput, unknown, PedidoGratuitoData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      nome: "",
      email: "",
      cpf_cnpj: "",
      telefone: "",
      pedido_oracao: "",
      consent_aceito: false,
      turnstile_token: "",
      device_hash: "",
    },
  });

  // Captcha + fingerprint vivem em hidden fields do RHF (validáveis via Zod)
  // mas também temos refs locais pra UX (mostrar erro inline antes do submit).
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const fingerprintRequested = useRef(false);

  // FingerprintJS roda uma vez no mount e popula o `device_hash` hidden.
  // `trigger()` no final força revalidação de TODO o form — necessário porque
  // hidden fields registrados via `register()` + `setValue` programático
  // não disparam o ciclo natural de "field touched → form re-validated",
  // o que mantinha `formState.isValid=false` indefinidamente em `mode: onChange`
  // (mesmo com `errors={}`).
  //
  // NÃO usamos cleanup com flag `cancelled`: em React StrictMode (dev) o
  // useEffect roda 2x (mount → cleanup → mount). Se a primeira promise
  // tivesse capturado um `cancelled` que vira true no cleanup #1, o
  // `setValue` nunca executava porque o segundo mount fazia early-return
  // pelo ref. `setValue` é seguro pós-unmount (RHF não toca React state
  // externo), então não precisamos abortar.
  useEffect(() => {
    if (fingerprintRequested.current) return;
    fingerprintRequested.current = true;

    obterDeviceHash().then((hash) => {
      form.setValue("device_hash", hash, {
        shouldValidate: true,
        shouldTouch: true,
      });
      form.trigger();
    });
  }, [form]);

  // DEV-only: o widget Turnstile invisible às vezes não emite o callback
  // `onSuccess` em ambiente local (rede chiando, iframe da Cloudflare
  // bloqueado, etc.) — o que trava o submit pra sempre. Como o backend em
  // dev opera em `mock_mode` (TURNSTILE_SECRET_KEY="") e aceita qualquer
  // token não-vazio, populamos um placeholder após 1.5s. Em produção isso
  // não roda (`import.meta.env.DEV` é false).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const t = setTimeout(() => {
      const current = form.getValues("turnstile_token");
      if (!current) {
        form.setValue("turnstile_token", "dev-fallback-token", {
          shouldValidate: true,
          shouldTouch: true,
        });
        form.trigger();
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [form]);

  const handleCpfCnpjChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskCpfCnpj(e.target.value);
      form.setValue("cpf_cnpj", masked, { shouldValidate: true });
    },
    [form],
  );

  const handleTurnstileSuccess = useCallback(
    (token: string) => {
      setCaptchaError(null);
      form.setValue("turnstile_token", token, {
        shouldValidate: true,
        shouldTouch: true,
      });
    },
    [form],
  );

  const handleTurnstileError = useCallback(() => {
    setCaptchaError(
      "Não conseguimos validar a verificação anti-robô. Recarregue a página.",
    );
    form.setValue("turnstile_token", "", {
      shouldValidate: true,
      shouldTouch: true,
    });
  }, [form]);

  const handleTurnstileExpire = useCallback(() => {
    form.setValue("turnstile_token", "", {
      shouldValidate: true,
      shouldTouch: true,
    });
  }, [form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const cleaned: PedidoGratuitoData = {
      ...data,
      idade: data.idade === "" ? undefined : data.idade,
      pedido_oracao: data.pedido_oracao || undefined,
      // Telefone vai em E.164 (backend aceita "+5511...").
      telefone: toE164BR(data.telefone),
    };
    await onSubmit(cleaned);
  });

  const inputClass =
    "w-full py-2 px-3 border-[1.5px] border-[#e0d8f0] rounded-[10px] text-[0.9rem] font-sans text-clama-night bg-white outline-none focus:border-[#8a5cf6] disabled:bg-[#f7f3fc] disabled:text-[#888] disabled:cursor-not-allowed";
  const labelClass =
    "font-sans text-[0.8rem] font-semibold text-clama-night tracking-[0.5px] uppercase block mb-1";

  return (
    <Form {...form}>
      <form
        id="prayer-form-gratuito"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
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

        {/* Idade + Sexo */}
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
                    className={`${inputClass} appearance-none`}
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
          render={({ field, fieldState }) => (
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
              {fieldState.isTouched && (
                <FormMessage className="text-[#8a5cf6] text-sm" />
              )}
            </FormItem>
          )}
        />

        {/* Telefone (obrigatório — Pedro decidiu coletar pra uso futuro) */}
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
                />
              </FormControl>
              <FormMessage className="text-[#8a5cf6] text-sm" />
            </FormItem>
          )}
        />

        <hr className="border-none border-t border-[#f0eaf8] my-6" />

        <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
          Seu pedido
        </div>

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
              <FormMessage className="text-[#8a5cf6] text-sm" />
            </FormItem>
          )}
        />

        <p className="font-sans text-[0.78rem] text-[#aaa] leading-relaxed mb-6">
          Sua dor, sua indignação, sua esperança são sagradas. Deus ouve desde o
          fundo do poço — e do fundo da história.
        </p>

        {/* Consent */}
        <FormField
          control={form.control}
          name="consent_aceito"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3">
                <FormControl>
                  <input
                    type="checkbox"
                    id="consent_aceito_gratuito"
                    checked={field.value}
                    onChange={field.onChange}
                    className="mt-1 h-4 w-4 rounded border-[#e0d8f0] bg-white text-[#8a5cf6] focus:ring-[#8a5cf6]/30"
                  />
                </FormControl>
                <label
                  htmlFor="consent_aceito_gratuito"
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
                  . Autorizo o uso do conteúdo do meu pedido exclusivamente para
                  geração da oração personalizada.
                </label>
              </div>
              <FormMessage className="text-[#8a5cf6] text-sm mt-2" />
            </FormItem>
          )}
        />

        {/* Turnstile invisível: Cloudflare cuida do timing.
            Renderiza em modo `managed` para que o widget se vire entre
            invisible / interactive conforme o risco do request. */}
        <div data-testid="turnstile-host" className="my-2">
          <Turnstile
            siteKey={siteKey}
            onSuccess={handleTurnstileSuccess}
            onError={handleTurnstileError}
            onExpire={handleTurnstileExpire}
            options={{ size: "invisible", appearance: "interaction-only" }}
          />
          {captchaError && (
            <p
              role="alert"
              className="mt-2 text-sm text-[#8a5cf6] font-sans"
            >
              {captchaError}
            </p>
          )}
        </div>

        {/* Hidden inputs pra manter os campos no RHF (sem renderizar UI extra). */}
        <input type="hidden" {...form.register("turnstile_token")} />
        <input type="hidden" {...form.register("device_hash")} />

        {/* DEV-only: mostra por que o submit está bloqueado */}
        {import.meta.env.DEV && !form.formState.isValid && (
          <div className="mt-4 p-3 rounded-md border border-dashed border-[#c9b3f0] bg-[#fbf8ff] text-[0.78rem] font-mono text-[#4a3c6c]">
            <strong>[dev] form inválido — campos pendentes:</strong>
            <ul className="mt-1 list-disc list-inside">
              {Object.entries(form.formState.errors).map(([k, v]) => (
                <li key={k}>
                  <code>{k}</code>: {v?.message?.toString() ?? "inválido"}
                </li>
              ))}
              {Object.keys(form.formState.errors).length === 0 && (
                <li>nenhum erro reportado — provavelmente algum campo ainda não foi tocado (mode: onChange)</li>
              )}
            </ul>
          </div>
        )}

        {/* Submit */}
        <div className="mt-8">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            disabled={isSubmitting || !form.formState.isValid}
            className="w-full h-12 text-[1.05rem] font-bold rounded-full"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size={20} className="mr-2" />
                Enviando...
              </>
            ) : (
              "Receber minha oração gratuita"
            )}
          </Button>
          <p className="font-sans text-[0.75rem] text-[#aaa] text-center leading-relaxed mt-4">
            Após enviar, vamos te mandar um e-mail pra confirmar.
            <br />
            Seus dados são tratados com sigilo e respeito.
          </p>
        </div>
      </form>
    </Form>
  );
}
