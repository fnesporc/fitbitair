import "./globals.css";

export const metadata = {
  title: "Pulse — i tuoi dati Fitbit",
  description: "Insight utili dal tuo Fitbit Air",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1120",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
