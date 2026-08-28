import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ThemeSwitch from "./theme-switch";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: () => {},
  }),
}));

// Deliberately NOT mocking next-intl here: ThemeSwitch must not depend on it.

describe("ThemeSwitch Component", () => {
  // Constraint: the layout's Suspense fallback mounts ThemeSwitch outside the NextIntlClientProvider, so it must render with no intl context at all.
  it("renders the three theme buttons without any NextIntlClientProvider wrapper", () => {
    render(<ThemeSwitch labels={{ light: "a", system: "b", dark: "c" }} />);

    expect(screen.getByLabelText("a")).toBeTruthy();
    expect(screen.getByLabelText("b")).toBeTruthy();
    expect(screen.getByLabelText("c")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
});
