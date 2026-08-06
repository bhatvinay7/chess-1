import Link from "next/link";

export default function NotFound() {
  return (
    <main className="lightPage min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="text-center flex flex-col items-center gap-6 max-w-md w-full">
        <div
          className="text-9xl select-none leading-none"
          style={{
            color: "var(--primary)",
            filter: "drop-shadow(0 8px 24px rgba(242,139,56,0.3))",
          }}
        >
          ♜
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-8xl font-extrabold text-gradient leading-none"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            404
          </h1>
          <h2
            className="text-2xl font-bold"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-nunito)",
            }}
          >
            Page Not Found
          </h2>
          <p
            className="text-base mt-1"
            style={{ color: "var(--muted)", fontFamily: "var(--font-nunito)" }}
          >
            Looks like this square is off the board. The page you&apos;re
            looking for doesn&apos;t exist.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/"
            className="btn-primary"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            Back to Home
          </Link>
          <Link
            href="/arena"
            className="btn-outline"
            style={{ fontFamily: "var(--font-nunito)" }}
          >
            Go to Arena
          </Link>
        </div>
      </div>
    </main>
  );
}
