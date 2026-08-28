// Default <head> tags we want shared across the app.
// Next only rewrites hrefs it owns (next/link, next/image, the file-based icon
// convention); a hand-written <link href="/favicon/..."> is emitted verbatim and
// 404s whenever the app is mounted under a basePath, so prefix it ourselves.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function DefaultTags() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href={`${basePath}/favicon/apple-touch-icon.png`} rel="apple-touch-icon" sizes="180x180" />
      <link href={`${basePath}/favicon/favicon-32x32.png`} rel="icon" sizes="32x32" type="image/png" />
      <link href={`${basePath}/favicon/favicon-16x16.png`} rel="icon" sizes="16x16" type="image/png" />
      <link href={`${basePath}/favicon/site.webmanifest`} rel="manifest" />
      {/* <link
        color="#000000"
        href="/favicon/safari-pinned-tab.svg"
        rel="mask-icon"
      /> */}
      <link href={`${basePath}/favicon/favicon.ico`} rel="shortcut icon" />
    </>
  );
}
