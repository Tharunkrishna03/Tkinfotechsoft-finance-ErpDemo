import type { Metadata } from "next";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import ToastProvider from "./toast-provider";
import RuntimeApiBridge from "./runtime-api-bridge";

export const metadata: Metadata = {
  title: "Jewel Finance Login",
  description: "Backend-verified login page for Jewel Finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('app-theme') || 'default';
                document.documentElement.dataset.theme = theme;
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <RuntimeApiBridge />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
