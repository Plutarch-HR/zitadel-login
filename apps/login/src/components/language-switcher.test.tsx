import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LanguageSwitcher } from "./language-switcher";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/cookies", () => ({
  setLanguageCookie: vi.fn(async () => undefined),
}));

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
];

describe("LanguageSwitcher", () => {
  afterEach(cleanup);

  // WCAG 2.4.7: the switcher must be keyboard reachable and must paint a visible
  // indicator when it holds focus.
  test("the trigger is focusable and keeps the natural tab order", () => {
    const { getByRole } = render(<LanguageSwitcher languages={LANGUAGES as never} />);
    const trigger = getByRole("button");

    trigger.focus();

    expect(trigger).toHaveFocus();
    expect(trigger).not.toHaveAttribute("tabindex");
  });

  test("the trigger carries an indigo focus ring and no outline suppression", () => {
    const { getByRole } = render(<LanguageSwitcher languages={LANGUAGES as never} />);
    const className = getByRole("button").className;

    expect(className).toContain("outline-[var(--indigo)]");
    expect(className).not.toContain("focus:outline-none");
  });
});
