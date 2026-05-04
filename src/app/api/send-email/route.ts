import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name, to, cc, subject, body: emailBody } = body;

    if (!smtp_host || !smtp_user || !smtp_pass || !to || !subject) {
      return NextResponse.json({ error: "Missing required fields: smtp_host, smtp_user, smtp_pass, to, subject" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port || 587,
      secure: smtp_port === 465,
      auth: { user: smtp_user, pass: smtp_pass },
    });

    const info = await transporter.sendMail({
      from: from_name ? `"${from_name}" <${from_email || smtp_user}>` : from_email || smtp_user,
      to: Array.isArray(to) ? to.join(", ") : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      subject,
      text: emailBody,
      html: emailBody.replace(/\n/g, "<br>"),
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Send email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
