import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WishLink — Online Birthday Cards",
  description: "Create animated birthday cards and share them by email or WhatsApp.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} h-full`} suppressHydrationWarning>
      <body className="site-shell antialiased" suppressHydrationWarning>
        <header className="site-nav">
          <Link href="/" className="brand">
            Wish<span>Link</span>
          </Link>
          <nav className="nav-links">
            {user ? (
              <>
                <Link className="btn btn-ghost" href="/dashboard">
                  Dashboard
                </Link>
                <Link className="btn btn-primary" href="/dashboard/new">
                  New card
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link className="btn btn-ghost" href="/login">
                  Log in
                </Link>
                <Link className="btn btn-primary" href="/register">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
