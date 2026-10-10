import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasoi Hub | Ghar ki recipes, dil se",
  description: "Discover, share and save the recipes that make home feel like home.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased"><body className="min-h-full">{children}</body></html>
  );
}
