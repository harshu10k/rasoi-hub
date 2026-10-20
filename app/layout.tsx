import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasoi Hub | Ghar ki recipes, dil se",
  description: "Discover, share and save the recipes that make home feel like home.",
};

// Applies the saved theme before first paint so dark mode doesn't flash light on load.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className="h-full antialiased"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className="min-h-full">{children}</body></html>
  );
}
