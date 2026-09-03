import { render } from "@testing-library/react";
import { ThemeMode } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeWrapper } from "./theme-wrapper";

// Mock next-themes: the spy is what tells us whether the wrapper reached into
// next-themes at all, which is the whole question here.
const mockSetTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: mockSetTheme,
  }),
}));

// The branding colour pass is not under test and touches the whole document.
vi.mock("@/helpers/colors", () => ({
  setTheme: vi.fn(),
}));

const STORAGE_KEY = "cp-theme";
const FORCED_KEY = "cp-theme-forced";

const renderWithMode = (themeMode: number) =>
  render(
    <ThemeWrapper branding={{ themeMode } as any}>
      <span>child</span>
    </ThemeWrapper>,
  );

describe("ThemeWrapper theme persistence", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
  });

  // The defect: every page mount re-ran this effect and overwrote the stored value,
  // so a choice made on the username page was gone by the password page.
  it("leaves a stored choice untouched in AUTO mode", () => {
    localStorage.setItem(STORAGE_KEY, "light");

    renderWithMode(ThemeMode.AUTO);

    expect(mockSetTheme).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("leaves a stored choice untouched in UNSPECIFIED mode", () => {
    localStorage.setItem(STORAGE_KEY, "dark");

    renderWithMode(ThemeMode.UNSPECIFIED);

    expect(mockSetTheme).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  // An instance that used to force a theme must not strand people on it after the
  // administrator switches that instance to AUTO.
  it("clears a value left behind by a forced mode and resets to system once", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    localStorage.setItem(FORCED_KEY, "1");

    renderWithMode(ThemeMode.AUTO);

    expect(mockSetTheme).toHaveBeenCalledTimes(1);
    expect(mockSetTheme).toHaveBeenCalledWith("system");
    expect(localStorage.getItem(FORCED_KEY)).toBeNull();
  });

  it("records the forced marker alongside the value in DARK mode", () => {
    renderWithMode(ThemeMode.DARK);

    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(localStorage.getItem(FORCED_KEY)).toBe("1");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("records the forced marker alongside the value in LIGHT mode", () => {
    renderWithMode(ThemeMode.LIGHT);

    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(localStorage.getItem(FORCED_KEY)).toBe("1");
    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
