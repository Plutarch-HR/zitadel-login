"use client";

import { coerceToArrayBuffer, coerceToBase64Url } from "@/helpers/base64";
import { handleServerActionResponse } from "@/lib/client-utils";
import { sendPasskey } from "@/lib/server/passkeys";
import { updateOrCreateSession } from "@/lib/server/session";
import { create, JsonObject } from "@zitadel/client";
import { RequestChallengesSchema, UserVerificationRequirement } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "./alert";
import { AutoSubmitForm } from "./auto-submit-form";
import { BackButton } from "./back-button";
import { Button, ButtonVariants } from "./button";
import { Spinner } from "./spinner";
import { Translated } from "./translated";

// either loginName or sessionId must be provided
type Props = {
  loginName?: string;
  sessionId?: string;
  requestId?: string;
  altPassword: boolean;
  login?: boolean;
  organization?: string;
};

export function LoginPasskey({ loginName, sessionId, requestId, altPassword, organization, login = true }: Props) {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [samlData, setSamlData] = useState<{ url: string; fields: Record<string, string> } | null>(null);
  // Drives the wait notice only. It is not `loading`: after a handled redirect the
  // button must stay disabled while the page navigates away, but the ceremony is
  // over by then, so asking the person to confirm on their device would be a lie.
  const [waiting, setWaiting] = useState<boolean>(false);

  const t = useTranslations("passkey");
  const router = useRouter();

  const initialized = useRef(false);
  // True from the moment a ceremony run starts until it settles. The disabled
  // attribute alone cannot carry this: a click can land in the render gap between
  // starting a ceremony and the state commit that disables the button. A second
  // navigator.credentials.get while the first is still pending makes the browser
  // reject one of them, which surfaced as a bogus verification failure while the
  // first ceremony was still on its way to a successful login.
  const ceremonyInFlight = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      startCeremony();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One passkey run: request a challenge, then hand it to the authenticator.
  // `loading` is raised once here and only lowered again on a path that leaves the
  // component interactive, so the button stays disabled for the whole run. `waiting`
  // tracks the ceremony itself, which can take seconds on a slow device, and is
  // dropped as soon as the run settles however it settles.
  async function startCeremony() {
    if (ceremonyInFlight.current) {
      return;
    }
    ceremonyInFlight.current = true;
    setLoading(true);
    setWaiting(true);

    try {
      const response = await updateOrCreateSessionForChallenge();
      const pK = response?.challenges?.webAuthN?.publicKeyCredentialRequestOptions?.publicKey;

      if (!pK) {
        setError(t("verify.errors.couldNotRequestChallenge"));
        setLoading(false);
        return;
      }

      await submitLoginAndContinue(pK);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    } finally {
      ceremonyInFlight.current = false;
      setWaiting(false);
    }
  }

  async function updateOrCreateSessionForChallenge(
    userVerificationRequirement: number = login
      ? UserVerificationRequirement.REQUIRED
      : UserVerificationRequirement.DISCOURAGED,
  ) {
    setError("");
    const sessionResponse = await updateOrCreateSession({
      loginName,
      sessionId,
      organization,
      challenges: create(RequestChallengesSchema, {
        webAuthN: {
          domain: "",
          userVerificationRequirement,
        },
      }),
      requestId,
    }).catch((error) => {
      console.error(error);
      setError(t("verify.errors.couldNotRequestChallenge"));
      return;
    });

    if (sessionResponse && "error" in sessionResponse && sessionResponse.error) {
      setError(sessionResponse.error);
      return;
    }

    return sessionResponse;
  }

  async function submitLogin(data: JsonObject) {
    try {
      const response = await sendPasskey({
        loginName,
        sessionId,
        organization,
        checks: {
          webAuthN: { credentialAssertionData: data },
        } as Checks,
        requestId,
      });

      // The component stays mounted while the router navigates to the next step, so
      // the button must stay disabled once a navigation (or SAML auto-post) is
      // underway. handleServerActionResponse returns false when nothing was handled
      // and surfaces every non-navigating outcome through setError, so an inline
      // error is the signal that the component is interactive again.
      let inlineError = false;
      const handled = handleServerActionResponse(response, router, setSamlData, (message) => {
        inlineError = true;
        setError(message);
      });

      if (!handled) {
        if (!response) {
          setError(t("verify.errors.noResponseReceived"));
        } else {
          setError(t("verify.errors.noRedirectProvided"));
        }
      }

      if (!handled || inlineError) {
        setLoading(false);
      }
    } catch {
      setError(t("verify.errors.couldNotVerifyPasskey"));
      setLoading(false);
    }
  }

  async function submitLoginAndContinue(publicKey: any): Promise<boolean | void> {
    publicKey.challenge = coerceToArrayBuffer(publicKey.challenge, "publicKey.challenge");
    publicKey.allowCredentials.map((listItem: any) => {
      listItem.id = coerceToArrayBuffer(listItem.id, "publicKey.allowCredentials.id");
    });

    return navigator.credentials
      .get({
        publicKey,
      })
      .then((assertedCredential: any) => {
        if (!assertedCredential) {
          setError(t("verify.errors.couldNotRetrievePasskey"));
          setLoading(false);
          return;
        }

        const authData = new Uint8Array(assertedCredential.response.authenticatorData);
        const clientDataJSON = new Uint8Array(assertedCredential.response.clientDataJSON);
        const rawId = new Uint8Array(assertedCredential.rawId);
        const sig = new Uint8Array(assertedCredential.response.signature);
        const userHandle = new Uint8Array(assertedCredential.response.userHandle);
        const data = {
          id: assertedCredential.id,
          rawId: coerceToBase64Url(rawId, "rawId"),
          type: assertedCredential.type,
          response: {
            authenticatorData: coerceToBase64Url(authData, "authData"),
            clientDataJSON: coerceToBase64Url(clientDataJSON, "clientDataJSON"),
            signature: coerceToBase64Url(sig, "sig"),
            userHandle: coerceToBase64Url(userHandle, "userHandle"),
          },
        };

        return submitLogin(data);
      })
      .catch((error) => {
        // Handle passkey cancellation or errors
        if (error?.name === "NotAllowedError") {
          setError(t("verify.errors.verificationCancelled"));
        } else {
          setError(t("verify.errors.verificationFailed"));
        }
        console.error("Passkey verification error:", error);
        setLoading(false);
      });
  }

  return (
    <div className="w-full">
      {samlData && <AutoSubmitForm url={samlData.url} fields={samlData.fields} />}
      {error && (
        <div className="py-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {/* The live region is always mounted and only its text is toggled. A live region
          inserted together with its content is routinely missed by screen readers. */}
      <div className="mt-4 text-sm opacity-80 empty:mt-0" role="status" aria-live="polite" data-testid="passkey-status">
        {waiting && <Translated i18nKey="verify.waitingForDevice" namespace="passkey" />}
      </div>
      <div className="mt-8 flex w-full flex-row items-center">
        {altPassword ? (
          <Button
            type="button"
            variant={ButtonVariants.Secondary}
            onClick={() => {
              const params = new URLSearchParams();

              if (loginName) {
                params.append("loginName", loginName);
              }

              if (sessionId) {
                params.append("sessionId", sessionId);
              }

              if (requestId) {
                params.append("requestId", requestId);
              }

              if (organization) {
                params.append("organization", organization);
              }

              return router.push(
                "/password?" + params, // alt is set because password is requested as alternative auth method, so passkey prompt can be escaped
              );
            }}
            data-testid="password-button"
          >
            <Translated i18nKey="verify.usePassword" namespace="passkey" />
          </Button>
        ) : (
          <BackButton />
        )}

        <span className="flex-grow"></span>
        <Button
          type="submit"
          className="self-end"
          variant={ButtonVariants.Primary}
          disabled={loading}
          onClick={() => startCeremony()}
          data-testid="submit-button"
        >
          {loading && <Spinner className="mr-2 h-5 w-5" />} <Translated i18nKey="verify.submit" namespace="passkey" />
        </Button>
      </div>
    </div>
  );
}
