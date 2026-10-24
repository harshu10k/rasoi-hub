import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasoi Hub | Ghar ki recipes, dil se",
  description: "Discover, share and save the recipes that make home feel like home.",
};

// Phone browser chrome matches the dark header; viewport-fit=cover lets the tab bar respect the iPhone home indicator.
// Pinch-zoom stays enabled for accessibility; inputs use 16px text so iOS doesn't auto-zoom on focus instead.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#050505" };

// Applies the saved theme before first paint so dark mode doesn't flash light on load.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className="h-full antialiased"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className="min-h-full">{children}</body></html>
  );
}
