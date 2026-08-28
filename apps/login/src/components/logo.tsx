import { useTranslations } from "next-intl";

type Props = {
  darkSrc?: string;
  lightSrc?: string;
  height?: number;
  width?: number;
};

export function Logo({ lightSrc, darkSrc, height = 40, width = 147.5 }: Props) {
  const t = useTranslations("plutarch");

  return (
    <>
      {darkSrc && (
        <div className="hidden dark:flex">
          <img height={height} width={width} src={darkSrc} alt={t("aria.logo")} />
        </div>
      )}
      {lightSrc && (
        <div className="flex dark:hidden">
          <img height={height} width={width} src={lightSrc} alt={t("aria.logo")} />
        </div>
      )}
    </>
  );
}
