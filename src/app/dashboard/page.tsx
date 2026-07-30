import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCardsForUser } from "@/lib/db";
import { DashboardCardItem } from "@/components/DashboardCardItem";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const cards = await listCardsForUser(user.id);
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <main className="page">
      <div className="dashboard-head">
        <div>
          <h1 className="page-title">Your birthday cards</h1>
          <p className="hint" style={{ margin: 0 }}>
            Hi {user.name} — create unique cards and share each link by email or WhatsApp.
          </p>
        </div>
        <Link className="btn btn-primary" href="/dashboard/new">
          New card / batch
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="panel empty-state">
          <p>No cards yet. Create one and customize colors, photos, and video for each recipient.</p>
          <Link className="btn btn-primary" href="/dashboard/new">
            Create your first card
          </Link>
        </div>
      ) : (
        <div className="card-list">
          {cards.map((card) => (
            <DashboardCardItem key={card.id} card={card} origin={origin} />
          ))}
        </div>
      )}
    </main>
  );
}
