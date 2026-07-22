import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";

export const metadata = {
  title: "Panel Administrativo - Don José",
  description: "Panel administrativo para secadero Don José",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
