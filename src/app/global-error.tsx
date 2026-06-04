"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", padding: 40, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ color: "#666", marginTop: 8 }}>
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p style={{ color: "#999", fontSize: 12, marginTop: 4 }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 16,
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
