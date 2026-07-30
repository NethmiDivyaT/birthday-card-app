import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="hint" style={{ marginBottom: 0, fontWeight: 800, color: "var(--brand)" }}>
            WishLink
          </p>
          <h1>Birthday cards that feel personal — and travel by link.</h1>
          <p>
            Design animated cards with your photos, a matching video, custom colors, and a birthday
            tune. Then send a unique link to each person by email or WhatsApp.
          </p>
          <div className="hero-cta">
            {user ? (
              <>
                <Link className="btn btn-primary" href="/dashboard/new">
                  Create a card
                </Link>
                <Link className="btn btn-secondary" href="/dashboard">
                  Open dashboard
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" href="/register">
                  Start free
                </Link>
                <Link className="btn btn-secondary" href="/login">
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-visual" aria-hidden />
      </section>
    </main>
  );
}
