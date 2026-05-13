import { type ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StickyNav } from "../StickyNav";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  // Garante que CustomerAuthProvider inicia anônimo (sem state em localStorage).
  localStorage.clear();
});

function renderNav(props: ComponentProps<typeof StickyNav> = {}) {
  mockNavigate.mockReset();
  return render(
    <MemoryRouter>
      <CustomerAuthProvider>
        <StickyNav {...props} />
      </CustomerAuthProvider>
    </MemoryRouter>,
  );
}

describe("StickyNav", () => {
  it("renders the 'Fazer pedido' button by default", () => {
    renderNav();
    expect(screen.getByRole("button", { name: /fazer pedido/i })).toBeInTheDocument();
  });

  it("calls onCtaClick when the button is clicked (when provided)", () => {
    const onCtaClick = vi.fn();
    renderNav({ onCtaClick });
    fireEvent.click(screen.getByRole("button", { name: /fazer pedido/i }));
    expect(onCtaClick).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("applies opacity-0 + pointer-events-none when showCta is false", () => {
    const { container } = renderNav({ showCta: false });
    // aria-hidden removes the element from the accessibility tree entirely,
    // so getByRole cannot match it even with { hidden: true } + name filter.
    // Query directly via the DOM instead.
    const btn = container.querySelector("button")!;
    expect(btn.className).toMatch(/opacity-0/);
    expect(btn.className).toMatch(/pointer-events-none/);
    expect(btn.getAttribute("aria-hidden")).toBe("true");
    expect(btn.getAttribute("tabindex")).toBe("-1");
  });

  it("does not apply opacity-0 when showCta is true", () => {
    renderNav({ showCta: true });
    const btn = screen.getByRole("button", { name: /fazer pedido/i });
    expect(btn.className).not.toMatch(/opacity-0/);
    expect(btn.getAttribute("aria-hidden")).toBe("false");
    expect(btn.getAttribute("tabindex")).toBe("0");
  });

  it("falls back to navigate('/#fazer-pedido') when onCtaClick is not provided", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /fazer pedido/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/#fazer-pedido");
  });
});
