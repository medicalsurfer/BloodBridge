import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Fraunces, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AssistantWidget } from "@/src/components/assistant/AssistantWidget";

// Three roles, three faces: a characterful serif for display, a clean humanist
// sans for everything operational, and a mono for identifiers and figures.
const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BloodBridge",
  description: "Intelligent Blood Donation Management System",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A chosen theme is rendered here so it survives hydration; no choice means
  // the stylesheet follows the visitor's system preference.
  const cookieStore = await cookies();
  const chosenTheme = cookieStore.get("bb-theme")?.value;
  const theme = chosenTheme === "dark" || chosenTheme === "light" ? chosenTheme : undefined;

  /*
    The assistant is for signed-in people, so it is not rendered at all when
    there is no session cookie. It used to mount everywhere and ask
    /api/auth/me who the visitor was — which on the landing, login, register,
    privacy and terms pages is a request that can only come back 401, and the
    browser logs every one of those in the console.

    The cookie is only checked for existence here, not verified: an expired one
    still mounts the widget, which then hides itself after its own check. That
    keeps this free — no token verification and no database read on a page
    nobody has signed in to.
  */
  const hasSession = cookieStore.has("bloodbridge_session");

  return (
    <html
      lang="en"
      data-theme={theme}
      // The beforeInteractive script below adds `js` to this element, so the
      // server and client class lists differ by design on the first pass.
      suppressHydrationWarning
      className={`${sourceSans3.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Marks that scripting is available, before first paint. Reveal-on-
          scroll hides its elements only under `.js`, so a browser without
          JavaScript renders every section visible instead of blank.
        */}
        <Script id="bb-js-flag" strategy="beforeInteractive">
          {`document.documentElement.classList.add('js')`}
        </Script>

        {children}
        {hasSession && <AssistantWidget />}
      </body>
    </html>
  );
}

