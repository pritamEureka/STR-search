import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import { MoneyBackground } from "@/components/money-background";
import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STR Search",
  description:
    "Practice underwriting short-term rental deals and get graded against an analyst's reference.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <MoneyBackground />
          <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
              <Link href="/" aria-label="STR Search home" className="flex items-center rounded-md dark:bg-white/95 dark:px-1">
                <Image src="/logo.png" alt="STR Search" width={500} height={127} priority className="h-10 w-auto" />
              </Link>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Short-term rental analyst training
              </span>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
