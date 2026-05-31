import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export interface NotifyPayload {
  channel: {
    type: string;
    smtp_host?: string; smtp_port?: number; smtp_user?: string; smtp_pass?: string;
    from_email?: string; from_name?: string;
    line_notify_token?: string;
    line_channel_token?: string; line_group_id?: string;
    teams_webhook_url?: string;
    webhook_url?: string; webhook_method?: string; webhook_headers?: string;
  };
  to_emails?: string[];
  subject: string;
  body: string;
}

export async function POST(req: NextRequest) {
  try {
    const { channel, to_emails, subject, body }: NotifyPayload = await req.json();

    if (channel.type === "email") {
      if (!channel.smtp_host || !channel.smtp_user || !channel.smtp_pass) {
        return NextResponse.json({ error: "Email channel not fully configured" }, { status: 400 });
      }
      const transporter = nodemailer.createTransport({
        host: channel.smtp_host,
        port: channel.smtp_port || 587,
        secure: channel.smtp_port === 465,
        auth: { user: channel.smtp_user, pass: channel.smtp_pass },
      });
      await transporter.sendMail({
        from: channel.from_name ? `"${channel.from_name}" <${channel.from_email || channel.smtp_user}>` : channel.from_email || channel.smtp_user,
        to: (to_emails || []).join(", "),
        subject,
        text: body,
        html: body.replace(/\n/g, "<br>"),
      });
      return NextResponse.json({ success: true, channel: "email" });
    }

    if (channel.type === "line_notify") {
      if (!channel.line_notify_token) return NextResponse.json({ error: "LINE Notify token missing" }, { status: 400 });
      const params = new URLSearchParams({ message: `\n${subject}\n\n${body}` });
      const res = await fetch("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: { Authorization: `Bearer ${channel.line_notify_token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.message || "LINE Notify failed" }, { status: 502 });
      return NextResponse.json({ success: true, channel: "line_notify" });
    }

    if (channel.type === "line_messaging") {
      if (!channel.line_channel_token || !channel.line_group_id) return NextResponse.json({ error: "LINE Messaging config missing" }, { status: 400 });
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { Authorization: `Bearer ${channel.line_channel_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: channel.line_group_id, messages: [{ type: "text", text: `${subject}\n\n${body}` }] }),
      });
      if (!res.ok) { const d = await res.json(); return NextResponse.json({ error: d.message || "LINE Messaging failed" }, { status: 502 }); }
      return NextResponse.json({ success: true, channel: "line_messaging" });
    }

    if (channel.type === "ms_teams") {
      if (!channel.teams_webhook_url) return NextResponse.json({ error: "Teams webhook URL missing" }, { status: 400 });
      const res = await fetch(channel.teams_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "@type": "MessageCard", "@context": "http://schema.org/extensions", themeColor: "0076D7", summary: subject, sections: [{ activityTitle: subject, activityText: body.replace(/\n/g, "<br>") }] }),
      });
      if (!res.ok) return NextResponse.json({ error: "Teams webhook failed" }, { status: 502 });
      return NextResponse.json({ success: true, channel: "ms_teams" });
    }

    if (channel.type === "webhook") {
      if (!channel.webhook_url) return NextResponse.json({ error: "Webhook URL missing" }, { status: 400 });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (channel.webhook_headers) {
        try { Object.assign(headers, JSON.parse(channel.webhook_headers)); } catch { /* ignore */ }
      }
      const method = channel.webhook_method || "POST";
      const res = await fetch(channel.webhook_url, { method, headers, body: method !== "GET" ? JSON.stringify({ subject, body }) : undefined });
      if (!res.ok) return NextResponse.json({ error: "Webhook failed" }, { status: 502 });
      return NextResponse.json({ success: true, channel: "webhook" });
    }

    return NextResponse.json({ error: `Unknown channel type: ${channel.type}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[notify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
