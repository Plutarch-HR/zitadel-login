import { sendPassword } from "@/lib/server/password";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PasswordForm } from "./password-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/server/password", () => ({
  sendPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

describe("PasswordForm", () => {
  afterEach(cleanup);

  test("should autofocus the password input on mount", () => {
    const { getByTestId } = render(<PasswordForm loginSettings={undefined} loginName="test@example.com" />);
    expect(getByTestId("password-text-input")).toHaveFocus();
  });
});

describe("PasswordForm double submit", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.mocked(sendPassword).mockReset();
  });

  // Fills the password field and waits until react-hook-form reports the form valid,
  // i.e. until the submit button is enabled.
  async function renderReadyToSubmit() {
    const view = render(<PasswordForm loginSettings={undefined} loginName="test@example.com" />);
    fireEvent.change(view.getByTestId("password-text-input"), { target: { value: "sup3r-s3cret" } });
    const submit = view.getByTestId("submit-button");
    await waitFor(() => expect(submit).toBeEnabled());
    return { ...view, submit };
  }

  test("a second click while the first submit is in flight does not re-run the server action", async () => {
    // Never resolves during this test: the form stays in the in-flight window.
    vi.mocked(sendPassword).mockReturnValue(new Promise(() => {}) as never);

    const { submit } = await renderReadyToSubmit();

    fireEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);

    expect(submit).toBeDisabled();
    expect(sendPassword).toHaveBeenCalledTimes(1);
  });

  test("the button stays disabled once the response starts a navigation", async () => {
    let resolveSend: (value: unknown) => void = () => {};
    vi.mocked(sendPassword).mockReturnValue(new Promise((resolve) => (resolveSend = resolve)) as never);

    const { submit } = await renderReadyToSubmit();

    fireEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());

    // The next step is a client navigation; the form remains mounted while it runs,
    // so re-enabling the button here would hand the user a second submit.
    resolveSend({ redirect: "/otp/time-based?loginName=test%40example.com" });
    await waitFor(() => expect(sendPassword).toHaveBeenCalledTimes(1));

    expect(submit).toBeDisabled();
  });

  test("the button is re-enabled when the response carries an inline error", async () => {
    vi.mocked(sendPassword).mockResolvedValue({ error: "Invalid password" } as never);

    const { submit, findByTestId } = await renderReadyToSubmit();

    fireEvent.click(submit);

    await findByTestId("error");
    await waitFor(() => expect(submit).toBeEnabled());
  });
});
