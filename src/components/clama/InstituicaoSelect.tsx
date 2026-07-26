import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { logoSrc, LOGO_FALLBACK_PATH } from "@/lib/instituicoes";
import type { Instituicao } from "@/types/instituicao.types";

export interface InstituicaoSelectProps {
  instituicoes: Instituicao[];
  value: string | null;
  onChange: (id: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
  id?: string;
}

// Valor sentinela do item "Sem instituição". O base-ui usa `null` como valor
// de item; o componente traduz para/desde `string | null` na fronteira.
const SEM_INSTITUICAO_LABEL = "Sem instituição";

function handleImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  // Evita loop caso o próprio fallback falhe.
  img.onerror = null;
  if (img.src.endsWith(LOGO_FALLBACK_PATH)) return;
  img.src = LOGO_FALLBACK_PATH;
}

function InstituicaoLogo({ logo }: { logo: string }) {
  return (
    <img
      src={logoSrc(logo)}
      onError={handleImgError}
      width={20}
      height={20}
      alt=""
      className="h-5 w-5 shrink-0 rounded"
    />
  );
}

export function InstituicaoSelect({
  instituicoes,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  id,
}: InstituicaoSelectProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Select.Root<string | null>
      value={value}
      onValueChange={(next) => onChange(next)}
      disabled={isDisabled}
      id={id}
    >
      <Select.Trigger
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-clama-gold/30 bg-clama-night px-3 text-left text-sm text-clama-cream",
          "focus:outline-none focus:border-clama-gold data-disabled:opacity-50 data-disabled:cursor-not-allowed",
        )}
      >
        <Select.Value className="flex min-w-0 flex-1 items-center gap-2">
          {(selected: string | null) => {
            if (isLoading) {
              return (
                <span className="truncate text-clama-cream/50">Carregando…</span>
              );
            }
            const inst = selected
              ? instituicoes.find((item) => item.id === selected)
              : undefined;
            if (!inst) {
              return (
                <span className="truncate text-clama-cream/50">
                  {SEM_INSTITUICAO_LABEL}
                </span>
              );
            }
            return (
              <>
                <InstituicaoLogo logo={inst.logo} />
                <span className="min-w-0 truncate">{inst.nome}</span>
              </>
            );
          }}
        </Select.Value>
        <Select.Icon className="shrink-0">
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          alignItemWithTrigger={false}
          className="z-50 outline-none"
          sideOffset={4}
        >
          <Select.Popup
            className={cn(
              "max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-clama-gold/20 bg-clama-night-deep p-1 text-clama-cream shadow-lg outline-none",
            )}
          >
            <Select.List>
              <Select.Item
                value={null}
                label={SEM_INSTITUICAO_LABEL}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-sm outline-none",
                  "data-highlighted:bg-clama-gold/10 data-disabled:opacity-50",
                )}
              >
                <Select.ItemText className="text-clama-cream/70">
                  {SEM_INSTITUICAO_LABEL}
                </Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="h-4 w-4 text-clama-gold" />
                </Select.ItemIndicator>
              </Select.Item>

              {instituicoes.map((inst) => (
                <Select.Item
                  key={inst.id}
                  value={inst.id}
                  label={inst.nome}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-sm outline-none",
                    "data-highlighted:bg-clama-gold/10 data-disabled:opacity-50",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <InstituicaoLogo logo={inst.logo} />
                    <Select.ItemText className="min-w-0 truncate">
                      {inst.nome}
                    </Select.ItemText>
                  </span>
                  <Select.ItemIndicator>
                    <Check className="h-4 w-4 shrink-0 text-clama-gold" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export default InstituicaoSelect;
