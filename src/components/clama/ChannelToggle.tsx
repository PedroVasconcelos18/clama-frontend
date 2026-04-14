import { cn } from "@/lib/utils";

export type CanalEntrega = "EMAIL" | "WHATSAPP";

interface ChannelToggleProps {
  value: CanalEntrega;
  onChange: (value: CanalEntrega) => void;
}

export function ChannelToggle({ value, onChange }: ChannelToggleProps) {
  return (
    <div className="space-y-3">
      {/* Email Option */}
      <button
        type="button"
        role="radio"
        aria-checked={value === "EMAIL"}
        onClick={() => onChange("EMAIL")}
        className={cn(
          "w-full flex items-center gap-3 p-4 border-[1.5px] rounded-[10px] cursor-pointer transition-all",
          value === "EMAIL"
            ? "border-[#8a5cf6] bg-[#f9f5ff]"
            : "border-[#e0d8f0] bg-white hover:border-[#8a5cf6]/50"
        )}
      >
        <div className="w-[38px] h-[38px] rounded-full bg-[#eef0ff] flex items-center justify-center text-[1.1rem] flex-shrink-0">
          ✉️
        </div>
        <div className="flex-1 text-left">
          <div className="font-sans text-[0.88rem] font-semibold text-clama-night">
            E-mail
          </div>
          <div className="font-sans text-[0.75rem] text-[#888]">
            Oração enviada ao seu inbox
          </div>
        </div>
        <div
          className={cn(
            "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0",
            value === "EMAIL"
              ? "border-[#8a5cf6] bg-[#8a5cf6]"
              : "border-[#ddd] bg-transparent"
          )}
        >
          {value === "EMAIL" && (
            <div className="w-[7px] h-[7px] bg-white rounded-full" />
          )}
        </div>
      </button>

      {/* WhatsApp Option - desabilitado temporariamente */}
    </div>
  );
}
