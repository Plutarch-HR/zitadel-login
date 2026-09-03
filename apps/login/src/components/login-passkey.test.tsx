import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LoginPasskey } from "./login-passkey";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
vi.mock("@/lib/server/passkeys", () => ({
  sendPasskey: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  updateOrCreateSession: vi.fn(),
}));

// Mock navigator.credentials
const mockCredentialsGet = vi.fn();
Object.defineProperty(global.navigator, "credentials", {
  value: {
    get: mockCredentialsGet,
  },
  writable: true,
});

describe("LoginPasskey Component", () => {
  let mockSendPasskey: any;
  let mockUpdateSession: any;

  const messages = {
    passkey: {
      verify: {
        title: "Authenticate with a passkey",
        description: "Your device will ask for your fingerprint",
        usePassword: "Use password",
        submit: "Continue",
        waitingForDevice: "Please confirm with your device. This can take a moment.",
        errors: {
          couldNotRequestChallenge: "Could not request passkey challenge",
          couldNotVerifyPasskey: "Could not verify passkey",
          noResponseReceived: "Passkey verification failed - no response received",
          noRedirectProvided: "Passkey verification completed but no redirect was provided",
          couldNotRetrievePasskey: "An error occurred while retrieving passkey",
          verificationCancelled: "Passkey verification was cancelled",
          verificationFailed: "An error occurred during passkey verification",
        },
      },
    },
  };

  const renderWithIntl = (component: React.ReactElement) => {
    return render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {component}
      </NextIntlClientProvider>,
    );
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockCredentialsGet.mockClear();

    const { sendPasskey } = await import("@/lib/server/passkeys");
    const { updateOrCreateSession } = await import("@/lib/server/session");

    mockSendPasskey = vi.mocked(sendPasskey);
    mockUpdateSession = vi.mocked(updateOrCreateSession);
  });

  // Vitest runs without globals here, so testing-library's automatic cleanup is
  // never registered and renders would otherwise pile up in the same document.
  afterEach(() => {
    cleanup();
  });

  describe("Initialization and Challenge Request", () => {
    test("should display error when challenge request fails", async () => {
      mockUpdateSession.mockResolvedValue({
        error: "Challenge failed",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Could not request passkey challenge")).toBeInTheDocument();
      });
    });

    test("should display translated error when no public key is returned", async () => {
      mockUpdateSession.mockResolvedValue({
        challenges: {
          webAuthN: {
            publicKeyCredentialRequestOptions: {},
          },
        },
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Could not request passkey challenge")).toBeInTheDocument();
      });
    });

    test("should trigger passkey prompt when public key is available", async () => {
      const mockPublicKey = {
        challenge: new Uint8Array([1, 2, 3]),
        allowCredentials: [
          {
            id: new Uint8Array([4, 5, 6]),
            type: "public-key",
          },
        ],
      };

      mockUpdateSession.mockResolvedValue({
        challenges: {
          webAuthN: {
            publicKeyCredentialRequestOptions: {
              publicKey: mockPublicKey,
            },
          },
        },
      });

      mockCredentialsGet.mockResolvedValue({
        id: "credential-id",
        rawId: new ArrayBuffer(8),
        type: "public-key",
        response: {
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: new ArrayBuffer(8),
        },
      });

      mockSendPasskey.mockResolvedValue({
        redirect: "/success",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockCredentialsGet).toHaveBeenCalled();
      });
    });
  });

  describe("Passkey Verification", () => {
    const setupSuccessfulChallenge = () => {
      const mockPublicKey = {
        challenge: new Uint8Array([1, 2, 3]),
        allowCredentials: [
          {
            id: new Uint8Array([4, 5, 6]),
            type: "public-key",
          },
        ],
      };

      mockUpdateSession.mockResolvedValue({
        challenges: {
          webAuthN: {
            publicKeyCredentialRequestOptions: {
              publicKey: mockPublicKey,
            },
          },
        },
      });

      return mockPublicKey;
    };

    test("should redirect on successful verification", async () => {
      setupSuccessfulChallenge();

      mockCredentialsGet.mockResolvedValue({
        id: "credential-id",
        rawId: new ArrayBuffer(8),
        type: "public-key",
        response: {
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: new ArrayBuffer(8),
        },
      });

      mockSendPasskey.mockResolvedValue({
        redirect: "/success",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/success");
      });
    });

    test("should display error when sendPasskey returns error", async () => {
      setupSuccessfulChallenge();

      mockCredentialsGet.mockResolvedValue({
        id: "credential-id",
        rawId: new ArrayBuffer(8),
        type: "public-key",
        response: {
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: new ArrayBuffer(8),
        },
      });

      mockSendPasskey.mockResolvedValue({
        error: "Verification failed",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Verification failed")).toBeInTheDocument();
      });
    });

    test("should display error when sendPasskey returns undefined", async () => {
      setupSuccessfulChallenge();

      mockCredentialsGet.mockResolvedValue({
        id: "credential-id",
        rawId: new ArrayBuffer(8),
        type: "public-key",
        response: {
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: new ArrayBuffer(8),
        },
      });

      mockSendPasskey.mockResolvedValue(undefined);

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Passkey verification failed - no response received")).toBeInTheDocument();
      });
    });

    test("should display error when sendPasskey returns object without redirect", async () => {
      setupSuccessfulChallenge();

      mockCredentialsGet.mockResolvedValue({
        id: "credential-id",
        rawId: new ArrayBuffer(8),
        type: "public-key",
        response: {
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: new ArrayBuffer(8),
        },
      });

      mockSendPasskey.mockResolvedValue({});

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Passkey verification completed but no redirect was provided")).toBeInTheDocument();
      });
    });

    test("should display error when credential retrieval returns null", async () => {
      setupSuccessfulChallenge();
      mockCredentialsGet.mockResolvedValue(null);

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred while retrieving passkey")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling for Passkey Cancellation", () => {
    test("should display cancellation message when user cancels passkey", async () => {
      const mockPublicKey = {
        challenge: new Uint8Array([1, 2, 3]),
        allowCredentials: [
          {
            id: new Uint8Array([4, 5, 6]),
            type: "public-key",
          },
        ],
      };

      mockUpdateSession.mockResolvedValue({
        challenges: {
          webAuthN: {
            publicKeyCredentialRequestOptions: {
              publicKey: mockPublicKey,
            },
          },
        },
      });

      const notAllowedError = new Error("User cancelled");
      (notAllowedError as any).name = "NotAllowedError";
      mockCredentialsGet.mockRejectedValue(notAllowedError);

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Passkey verification was cancelled")).toBeInTheDocument();
      });
    });

    test("should display generic error for other credential errors", async () => {
      const mockPublicKey = {
        challenge: new Uint8Array([1, 2, 3]),
        allowCredentials: [
          {
            id: new Uint8Array([4, 5, 6]),
            type: "public-key",
          },
        ],
      };

      mockUpdateSession.mockResolvedValue({
        challenges: {
          webAuthN: {
            publicKeyCredentialRequestOptions: {
              publicKey: mockPublicKey,
            },
          },
        },
      });

      const genericError = new Error("Unknown error");
      mockCredentialsGet.mockRejectedValue(genericError);

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred during passkey verification")).toBeInTheDocument();
      });
    });
  });

  describe("Props Handling", () => {
    test("should pass sessionId to server actions when provided", async () => {
      mockUpdateSession.mockResolvedValue({
        error: "Test error",
      });

      renderWithIntl(<LoginPasskey sessionId="session-123" altPassword={false} />);

      await waitFor(() => {
        expect(mockUpdateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: "session-123",
          }),
        );
      });
    });

    test("should pass loginName to server actions when provided", async () => {
      mockUpdateSession.mockResolvedValue({
        error: "Test error",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockUpdateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            loginName: "test@example.com",
          }),
        );
      });
    });

    test("should pass organization to server actions when provided", async () => {
      mockUpdateSession.mockResolvedValue({
        error: "Test error",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" organization="org-123" altPassword={false} />);

      await waitFor(() => {
        expect(mockUpdateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            organization: "org-123",
          }),
        );
      });
    });

    test("should pass requestId to server actions when provided", async () => {
      mockUpdateSession.mockResolvedValue({
        error: "Test error",
      });

      renderWithIntl(<LoginPasskey loginName="test@example.com" requestId="request-123" altPassword={false} />);

      await waitFor(() => {
        expect(mockUpdateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: "request-123",
          }),
        );
      });
    });
  });

  describe("useEffect Initialization Guard", () => {
    test("should only initialize once even if component re-renders", async () => {
      mockUpdateSession.mockResolvedValue({
        error: "Test error",
      });

      const { rerender } = renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockUpdateSession).toHaveBeenCalledTimes(1);
      });

      // Rerender the component
      rerender(
        <NextIntlClientProvider locale="en" messages={messages}>
          <LoginPasskey loginName="test@example.com" altPassword={false} />
        </NextIntlClientProvider>,
      );

      // Should still only be called once
      expect(mockUpdateSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("Ceremony Feedback", () => {
    const WAITING = "Please confirm with your device. This can take a moment.";

    const challengeWithPublicKey = () =>
      mockUpdateSession.mockResolvedValue({
        challenges: {
          webAuthN: {
            publicKeyCredentialRequestOptions: {
              publicKey: {
                challenge: new Uint8Array([1, 2, 3]),
                allowCredentials: [{ id: new Uint8Array([4, 5, 6]), type: "public-key" }],
              },
            },
          },
        },
      });

    const assertedCredential = () => ({
      id: "credential-id",
      rawId: new ArrayBuffer(8),
      type: "public-key",
      response: {
        authenticatorData: new ArrayBuffer(8),
        clientDataJSON: new ArrayBuffer(8),
        signature: new ArrayBuffer(8),
        userHandle: new ArrayBuffer(8),
      },
    });

    // A ceremony the test controls: navigator.credentials.get stays pending until
    // the returned settle function is called, which is what the WebAuthn dialog
    // does while it waits for the person to touch their key or unlock the device.
    const pendingCeremony = () => {
      let settle!: (value: unknown) => void;
      mockCredentialsGet.mockReturnValue(
        new Promise((resolve) => {
          settle = resolve;
        }),
      );
      return async (value: unknown = null) => {
        await act(async () => {
          settle(value);
        });
      };
    };

    test("keeps the submit button disabled and announces the wait while the ceremony is pending", async () => {
      challengeWithPublicKey();
      const finish = pendingCeremony();

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockCredentialsGet).toHaveBeenCalled();
      });

      const button = screen.getByTestId("submit-button");
      expect(button).toBeDisabled();
      // The Spinner also carries role="status", so it is matched by tag, not by role.
      expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();

      const status = screen.getByTestId("passkey-status");
      expect(status).toHaveAttribute("role", "status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveTextContent(WAITING);

      await finish();
    });

    test("a click while a ceremony is pending starts no second ceremony and reports no error", async () => {
      challengeWithPublicKey();
      const finish = pendingCeremony();

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockCredentialsGet).toHaveBeenCalledTimes(1);
      });
      expect(mockUpdateSession).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId("submit-button"));
      await act(async () => {});

      expect(mockUpdateSession).toHaveBeenCalledTimes(1);
      expect(mockCredentialsGet).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("An error occurred during passkey verification")).not.toBeInTheDocument();

      await finish();
    });

    test("two clicks inside one render pass start only one ceremony", async () => {
      challengeWithPublicKey();

      const notAllowedError = new Error("User cancelled");
      (notAllowedError as any).name = "NotAllowedError";
      mockCredentialsGet.mockRejectedValueOnce(notAllowedError);

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Passkey verification was cancelled")).toBeInTheDocument();
      });

      const button = screen.getByTestId("submit-button");
      expect(button).not.toBeDisabled();

      const finish = pendingCeremony();

      // Both clicks are dispatched on the DOM node inside a single act pass, so the
      // second one lands in the render gap where the button is not yet disabled.
      await act(async () => {
        button.click();
        button.click();
      });

      expect(mockCredentialsGet).toHaveBeenCalledTimes(2); // the cancelled one plus exactly one retry
      expect(mockUpdateSession).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("An error occurred during passkey verification")).not.toBeInTheDocument();

      await finish();
    });

    test("keeps the submit button disabled after a successful verification redirects", async () => {
      challengeWithPublicKey();
      mockCredentialsGet.mockResolvedValue(assertedCredential());
      mockSendPasskey.mockResolvedValue({ redirect: "/success" });

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/success");
      });

      expect(screen.getByTestId("submit-button")).toBeDisabled();
    });

    test("re-enables the submit button and drops the wait notice when the ceremony is cancelled", async () => {
      challengeWithPublicKey();

      const notAllowedError = new Error("User cancelled");
      (notAllowedError as any).name = "NotAllowedError";
      mockCredentialsGet.mockRejectedValue(notAllowedError);

      renderWithIntl(<LoginPasskey loginName="test@example.com" altPassword={false} />);

      await waitFor(() => {
        expect(screen.getByText("Passkey verification was cancelled")).toBeInTheDocument();
      });

      expect(screen.getByTestId("submit-button")).not.toBeDisabled();
      expect(screen.queryByTestId("passkey-status")).not.toBeInTheDocument();
    });
  });
});
