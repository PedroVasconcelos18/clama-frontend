import { forwardRef } from "react";
import { steps } from "@/data/steps";

export const StepsSection = forwardRef<HTMLElement>(
  function StepsSection(_props, ref) {
    return (
      <section
        ref={ref}
        id="como-funciona"
        aria-labelledby="steps-title"
        className="bg-clama-cream py-12 px-6"
      >
        <div className="max-w-[700px] mx-auto text-center">
          {/* Eyebrow */}
          <p className="font-sans text-[0.9rem] text-[#888] tracking-[2px] uppercase mb-2">
            Simples assim
          </p>

          {/* Title */}
          <h2
            id="steps-title"
            className="font-serif text-clama-night text-[1.7rem] mb-10"
          >
            Como o Clama funciona
          </h2>

          {/* Steps Grid */}
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step) => (
              <li
                key={step.number}
                className="bg-white border border-[#ede8d8] rounded-2xl py-6 px-5 text-center"
              >
                {/* Step Number */}
                <div className="w-11 h-11 bg-clama-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-sans text-[1.2rem] font-bold text-clama-night">
                    {step.number}
                  </span>
                </div>
                {/* Step Title */}
                <h3 className="font-serif text-clama-night text-base mb-1">
                  {step.title}
                </h3>
                {/* Step Description */}
                <p className="font-sans text-[#777] text-[0.82rem] leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }
);
