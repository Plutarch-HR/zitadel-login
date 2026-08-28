import "@/styles/globals.scss";

import { BackgroundWrapper } from "@/components/background-wrapper";
import { DefaultTags } from "@/components/default-tags";
import { LanguageProvider } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Skeleton } from "@/components/skeleton";
import { ThemeProvider } from "@/components/theme-provider";
import ThemeSwitch from "@/components/theme-switch";
import { LANGS, getLanguage } from "@/lib/i18n";
import { getServiceConfig } from "@/lib/service-url";
import { getAllowedLanguages } from "@/lib/zitadel";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import React, { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: t("title") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);
  const tTheme = await getTranslations("plutarch");

  let languages = LANGS;
  try {
    const settings = await getAllowedLanguages({ serviceConfig });
    if (settings.allowedLanguages?.length) {
      languages = settings.allowedLanguages
        .filter((code) => LANGS.find((l) => l.code === code))
        .map((code) => getLanguage(code));
    }
  } catch (e) {
    console.error("Failed to load supported languages", e);
  }

  // Resolved server-side so ThemeSwitch stays renderable inside the Suspense
  // fallback, which mounts outside the NextIntlClientProvider.
  const themeSwitchLabels = {
    light: tTheme("aria.themeLight"),
    system: tTheme("aria.themeSystem"),
    dark: tTheme("aria.themeDark"),
  };

  return (
    <html className="font-body" suppressHydrationWarning>
      <head>
        <DefaultTags />
      </head>
      <body>
        <ThemeProvider>
          <Tooltip.Provider>
            <Suspense
              fallback={
                <BackgroundWrapper
                  className={`relative flex min-h-screen flex-col justify-center bg-[image:var(--glas-mat)] bg-fixed text-[var(--glas-text)]`}
                >
                  <div className="relative mx-auto w-full max-w-[440px] py-8">
                    <Skeleton>
                      <div className="h-40"></div>
                    </Skeleton>
                    <div className="flex flex-row items-center justify-end space-x-4 py-4">
                      <ThemeSwitch labels={themeSwitchLabels} />
                    </div>
                  </div>
                </BackgroundWrapper>
              }
            >
              <LanguageProvider>
                <BackgroundWrapper
                  className={`relative flex min-h-screen flex-col justify-center bg-[image:var(--glas-mat)] bg-fixed text-[var(--glas-text)]`}
                >
                  <div className="relative mx-auto w-full max-w-[1100px] py-8">
                    <div>{children}</div>
                    <div className="mx-auto flex max-w-[440px] flex-row items-center justify-end space-x-4 px-4 py-4 md:max-w-full md:px-8">
                      <LanguageSwitcher languages={languages} />
                      <ThemeSwitch labels={themeSwitchLabels} />
                    </div>
                  </div>
                </BackgroundWrapper>
              </LanguageProvider>
            </Suspense>
          </Tooltip.Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
