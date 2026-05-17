import { cn } from "@/lib/utils";

export type CanalEntrega = "EMAIL" | "WHATSAPP";

interface ChannelToggleProps {
  value: CanalEntrega;
  onChange: (value: CanalEntrega) => void;
  /** "light" (default) = LP; "dark" = variante /conta. */
  theme?: "light" | "dark";
}

export function ChannelToggle({
  value,
  onChange,
  theme = "light",
}: ChannelToggleProps) {
  const isDark = theme === "dark";
  const selected = value === "EMAIL";

  return (
    <div className="space-y-3">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onChange("EMAIL")}
        className={cn(
          "w-full flex items-center gap-3 p-4 border-[1.5px] rounded-[10px] cursor-pointer transition-all",
          isDark
            ? selected
              ? "border-clama-gold bg-clama-gold/10"
              : "border-clama-gold/20 bg-clama-night-deep hover:border-clama-gold/45"
            : selected
              ? "border-[#8a5cf6] bg-[#f9f5ff]"
              : "border-[#e0d8f0] bg-white hover:border-[#8a5cf6]/50",
        )}
      >
        <div
          className={cn(
            "w-[38px] h-[38px] rounded-full flex items-center justify-center text-[1.1rem] flex-shrink-0",
            isDark ? "bg-clama-night-soft" : "bg-[#eef0ff]",
          )}
        >
          ✉️
        </div>
        <div className="flex-1 text-left">
          <div
            className={cn(
              "font-sans text-[0.88rem] font-semibold",
              isDark ? "text-clama-cream" : "text-clama-night",
            )}
          >
            E-mail
          </div>
          <div
            className={cn(
              "font-sans text-[0.75rem]",
              isDark ? "text-clama-cream/50" : "text-[#888]",
            )}
          >
            Oração enviada ao seu inbox
          </div>
        </div>
        <div
          className={cn(
            "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0",
            isDark
              ? selected
                ? "border-clama-gold bg-clama-gold"
                : "border-clama-cream/30 bg-transparent"
              : selected
                ? "border-[#8a5cf6] bg-[#8a5cf6]"
                : "border-[#ddd] bg-transparent",
          )}
        >
          {selected && (
            <div
              className={cn(
                "w-[7px] h-[7px] rounded-full",
                isDark ? "bg-clama-night" : "bg-white",
              )}
            />
          )}
        </div>
      </button>

      {/* WhatsApp Option - desabilitado temporariamente */}
    </div>
  );
}
