export const metadata = {
  title: "Fitbit Air",
  description: "I miei dati Fitbit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, system-ui, sans-serif",
          background: "linear-gradient(160deg, #0f172a, #1e293b)",
          color: "#e2e8f0",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
