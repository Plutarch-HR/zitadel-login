"use client";

import { APPEARANCE_STYLES, getComponentRoundness, getThemeConfig } from "@/lib/theme";
import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { ThemeMode } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useThemeMode } from "./branding-context";
function getThemeToggleRoundness() {
  return getComponentRoundness("themeSwitch");
}

// Helper function to get card appearance styles for the theme switch wrapper
function getThemeSwitchCardAppearance(): string {
  const themeConfig = getThemeConfig();
  const appearance = APPEARANCE_STYLES[themeConfig.appearance];
  return appearance?.card || "bg-black/5 dark:bg-white/5"; // Fallback to current styling
}

// Helper function to get selected button styling for clear visibility
function getSelectedButtonStyle(isSelected: boolean): string {
  const themeConfig = getThemeConfig();

  if (!isSelected) {
    return "text-gray-400 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-400";
  }

  // Selected state styling based on appearance theme
  switch (themeConfig.appearance) {
    case "glass":
      return "bg-white/30 dark:bg-black/30 text-gray-900 dark:text-white shadow-lg backdrop-blur-sm border border-white/40 dark:border-white/20";
    case "milchglas":
      return "bg-[var(--glas-chip)] border border-[var(--glas-rand)] rounded-full";
    case "material":
      return "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md";
    case "flat":
    default:
      return "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700";
  }
}

// Keyboard focus indicator shared by the three mode buttons (WCAG 2.4.7).
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--indigo)]";

// Labels are passed in from the server layout rather than read via useTranslations,
// because the layout mounts this component inside a Suspense fallback that renders
// outside the NextIntlClientProvider.
export default function ThemeSwitch({ labels }: { labels: { light: string; system: string; dark: string } }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const themeMode = useThemeMode();
  const toggleRoundness = getThemeToggleRoundness();
  const cardAppearance = getThemeSwitchCardAppearance();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Hide toggle when theme is forced to light or dark only
  if (themeMode === ThemeMode.LIGHT || themeMode === ThemeMode.DARK) {
    return null;
  }

  // themeMode is AUTO (1) or UNSPECIFIED (0): show light, system, dark options
  return (
    <div className={`flex space-x-1 p-1 ${toggleRoundness} ${cardAppearance}`}>
      <button
        className={`flex h-8 w-8 flex-row items-center justify-center ${toggleRoundness} transition-colors ${FOCUS_RING} ${getSelectedButtonStyle(theme === "light")}`}
        onClick={() => setTheme("light")}
        aria-label={labels.light}
      >
        <SunIcon className="h-5 w-5" />
      </button>
      <button
        className={`flex h-8 w-8 flex-row items-center justify-center ${toggleRoundness} transition-colors ${FOCUS_RING} ${getSelectedButtonStyle(theme === "system")}`}
        onClick={() => setTheme("system")}
        aria-label={labels.system}
      >
        <ComputerDesktopIcon className="h-4 w-4" />
      </button>
      <button
        className={`flex h-8 w-8 flex-row items-center justify-center ${toggleRoundness} transition-colors ${FOCUS_RING} ${getSelectedButtonStyle(theme === "dark")}`}
        onClick={() => setTheme("dark")}
        aria-label={labels.dark}
      >
        <MoonIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
