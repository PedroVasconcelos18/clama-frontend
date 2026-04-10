import { useEffect, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/utility/LoadingSpinner";

interface PrayerFormProps {
  planos: Plan[];
  onSubmit: (data: PedidoFormData) => void;
  isSubmitting: boolean;
  requireTelefone?: boolean;
}

export function PrayerForm({
  onSubmit,
  isSubmitting,
  requireTelefone = false,
}: PrayerFormProps) {
  const schema = useMemo(
    () => getPedidoSchema(requireTelefone),
    [requireTelefone]
  );

  const form = useForm<PedidoFormInput, unknown, PedidoFormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      pedido_oracao: "",
      consent_aceito: false,
    },
  });

  // Re-validate telefone when requireTelefone changes
  useEffect(() => {
    if (form.formState.isSubmitted || form.formState.touchedFields.telefone) {
      form.trigger("telefone");
    }
  }, [requireTelefone, form]);

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
  const inputClass = "w-full py-3 px-4 border-[1.5px] border-[#e0d8f0] rounded-[10px] text-[0.95rem] font-sans text-clama-night bg-white outline-none focus:border-[#8a5cf6]";
  const labelClass = "font-sans text-[0.8rem] font-semibold text-clama-night tracking-[0.5px] uppercase block mb-1";

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
                    className={`${inputClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center]`}
                    {...field}
                    value={field.value ?? ""}
                  >
                    <option value="">Selecione</option>
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

        {/* WhatsApp */}
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
              <FormLabel className={labelClass}>Escreva sua demanda</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Conte o que está no seu coração. Pode ser uma cura, uma bênção financeira, restauração, proteção, direção... Deus está ouvindo."
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
          Ou simplesmente feche os olhos, pense no seu pedido e clique em gerar — Ele já sabe.
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
                  Li e concordo com a{" "}
                  <Link
                    to="/privacidade"
                    target="_blank"
                    className="text-[#8a5cf6] hover:underline"
                  >
                    Política de Privacidade
                  </Link>{" "}
                  e os{" "}
                  <Link
                    to="/termos"
                    target="_blank"
                    className="text-[#8a5cf6] hover:underline"
                  >
                    Termos de Uso
                  </Link>
                  .
                </label>
              </div>
              <FormMessage className="text-[#8a5cf6] text-sm mt-2" />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="gold"
          size="lg"
          disabled={isSubmitting || !form.formState.isValid}
          className="w-full h-12 text-[1.05rem] font-bold rounded-full mt-6"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size={20} className="mr-2" />
              Enviando...
            </>
          ) : (
            "🙏 Gerar minha oração"
          )}
        </Button>

        {/* Privacy Note */}
        <p className="font-sans text-[0.75rem] text-[#aaa] text-center leading-relaxed">
          Seus dados são tratados com sigilo e respeito.
          <br />
          Jamais compartilhamos suas informações.
        </p>
      </form>
    </Form>
  );
}
