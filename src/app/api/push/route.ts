import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_MAILTO || "mailto:admin@kmitsurat.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { subscriptions, title, body, url } = await req.json() as {
      subscriptions: PushSubscriptionJSON[];
      title: string;
      body: string;
      url?: string;
    };

    if (!subscriptions?.length) return NextResponse.json({ sent: 0 });

    const payload = JSON.stringify({ title, body, url: url || "/sales?tab=activities" });
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(sub as webpush.PushSubscription, payload)
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent, total: subscriptions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[push]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
