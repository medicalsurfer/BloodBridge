import nodemailer from "nodemailer";

function getMailTransport() {
  const user = process.env.SMTP_USER ?? process.env.EMAIL_USER;
  const host = process.env.SMTP_HOST ?? (user?.endsWith("@gmail.com") ? "smtp.gmail.com" : undefined);
  const port = Number(process.env.SMTP_PORT ?? 587);
  const password = (process.env.SMTP_PASSWORD ?? process.env.EMAIL_PASSWORD)?.replace(/\s/g, "");

  if (!host || !user || !password || !Number.isFinite(port)) {
    throw new Error(
      "Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD (or EMAIL_USER and EMAIL_PASSWORD)."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass: password },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvitationHtml({
  greeting,
  intro,
  recipient,
  temporaryPassword,
}: {
  greeting: string;
  intro: string;
  recipient: string;
  temporaryPassword: string;
}) {
  return [
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:480px;margin:0 auto;">`,
    `<p style="font-weight:bold;font-size:18px;color:#7f1d1d;margin:0 0 16px;">BloodBridge</p>`,
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    `<table style="margin:20px 0;border-collapse:collapse;">`,
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Sign in with</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(recipient)}</td></tr>`,
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Temporary password</td><td style="padding:4px 0;font-weight:bold;font-family:monospace;">${escapeHtml(temporaryPassword)}</td></tr>`,
    `</table>`,
    `<p>Please sign in and change this temporary password as soon as possible.</p>`,
    `<p style="margin-top:24px;color:#6b7280;font-size:13px;">If you were not expecting this invitation, you can safely ignore this email.</p>`,
    `</div>`,
  ].join("");
}

export async function sendInstituteAdminInvitationEmail({
  recipient,
  firstName,
  temporaryPassword,
  instituteName,
}: {
  recipient: string;
  firstName: string;
  temporaryPassword: string;
  instituteName: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.");
  }

  const transport = getMailTransport();
  const greeting = `Hello ${firstName},`;
  const intro = `You have been invited to manage ${instituteName} on BloodBridge.`;

  try {
    await transport.sendMail({
      from,
      to: recipient,
      replyTo: from,
      subject: "Your BloodBridge administrator account is ready",
      text: [
        greeting,
        "",
        intro,
        "",
        `Sign in with: ${recipient}`,
        `Temporary password: ${temporaryPassword}`,
        "",
        "Please change this temporary password after signing in.",
      ].join("\n"),
      html: buildInvitationHtml({ greeting, intro, recipient, temporaryPassword }),
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EAUTH") {
      throw new Error(
        "Gmail rejected the SMTP credentials. Use a 16-character Gmail App Password in SMTP_PASSWORD."
      );
    }

    throw error;
  } finally {
    transport.close();
  }
}

export async function sendPasswordResetEmail({
  recipient,
  firstName,
  resetLink,
}: {
  recipient: string;
  firstName: string;
  resetLink: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.");
  }

  const transport = getMailTransport();
  const greeting = `Hello ${firstName},`;
  const intro = "We received a request to reset your BloodBridge password. This link expires in 1 hour.";

  try {
    await transport.sendMail({
      from,
      to: recipient,
      replyTo: from,
      subject: "Reset your BloodBridge password",
      text: [
        greeting,
        "",
        intro,
        "",
        resetLink,
        "",
        "If you did not request this, you can safely ignore this email.",
      ].join("\n"),
      html: [
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:480px;margin:0 auto;">`,
        `<p style="font-weight:bold;font-size:18px;color:#7f1d1d;margin:0 0 16px;">BloodBridge</p>`,
        `<p>${escapeHtml(greeting)}</p>`,
        `<p>${escapeHtml(intro)}</p>`,
        `<p style="margin:24px 0;"><a href="${resetLink}" style="background:#7f1d1d;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">Reset password</a></p>`,
        `<p style="color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>`,
        `</div>`,
      ].join(""),
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EAUTH") {
      throw new Error(
        "Gmail rejected the SMTP credentials. Use a 16-character Gmail App Password in SMTP_PASSWORD."
      );
    }

    throw error;
  } finally {
    transport.close();
  }
}

export async function sendAppointmentConfirmationEmail({
  recipient,
  firstName,
  instituteName,
  appointmentDate,
  appointmentTime,
}: {
  recipient: string;
  firstName: string;
  instituteName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.");
  }

  const transport = getMailTransport();
  const greeting = `Hello ${firstName},`;
  const intro = `Your donation appointment at ${instituteName} on ${appointmentDate} at ${appointmentTime} is confirmed.`;

  try {
    await transport.sendMail({
      from,
      to: recipient,
      replyTo: from,
      subject: "Your BloodBridge appointment is confirmed",
      text: [
        greeting,
        "",
        intro,
        "",
        "Please bring a valid form of identification and arrive a few minutes early.",
      ].join("\n"),
      html: [
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:480px;margin:0 auto;">`,
        `<p style="font-weight:bold;font-size:18px;color:#7f1d1d;margin:0 0 16px;">BloodBridge</p>`,
        `<p>${escapeHtml(greeting)}</p>`,
        `<p>${escapeHtml(intro)}</p>`,
        `<p style="color:#6b7280;font-size:13px;">Please bring a valid form of identification and arrive a few minutes early.</p>`,
        `</div>`,
      ].join(""),
    });
  } finally {
    transport.close();
  }
}

export async function sendBloodRequestAlertEmail({
  recipient,
  firstName,
  instituteName,
  bloodGroup,
  unitsNeeded,
  urgency,
}: {
  recipient: string;
  firstName: string;
  instituteName: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgency: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.");
  }

  const transport = getMailTransport();
  const greeting = `Hello ${firstName},`;
  const intro = `${instituteName} has an open ${urgency.toLowerCase()}-priority request for ${unitsNeeded} unit${unitsNeeded === 1 ? "" : "s"} of ${bloodGroup.replace("_", " ")} blood, matching your donor profile.`;

  try {
    await transport.sendMail({
      from,
      to: recipient,
      replyTo: from,
      subject: `${urgency.charAt(0)}${urgency.slice(1).toLowerCase()} priority blood request matches your blood type`,
      text: [
        greeting,
        "",
        intro,
        "",
        "Sign in to BloodBridge to view this request and book a donation appointment if you are able to help.",
      ].join("\n"),
      html: [
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:480px;margin:0 auto;">`,
        `<p style="font-weight:bold;font-size:18px;color:#7f1d1d;margin:0 0 16px;">BloodBridge</p>`,
        `<p>${escapeHtml(greeting)}</p>`,
        `<p>${escapeHtml(intro)}</p>`,
        `<p style="color:#6b7280;font-size:13px;">Sign in to BloodBridge to view this request and book a donation appointment if you are able to help.</p>`,
        `</div>`,
      ].join(""),
    });
  } finally {
    transport.close();
  }
}

export async function sendStaffInvitationEmail({
  recipient,
  firstName,
  temporaryPassword,
  instituteName,
  role,
}: {
  recipient: string;
  firstName: string;
  temporaryPassword: string;
  instituteName: string;
  role: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.");
  }

  const transport = getMailTransport();
  const greeting = `Hello ${firstName},`;
  const intro = `You have been invited to join ${instituteName} as ${role.toLowerCase()} on BloodBridge.`;

  try {
    await transport.sendMail({
      from,
      to: recipient,
      replyTo: from,
      subject: `Your BloodBridge ${role.toLowerCase()} account is ready`,
      text: [
        greeting,
        "",
        intro,
        "",
        `Sign in with: ${recipient}`,
        `Temporary password: ${temporaryPassword}`,
        "",
        "Please change this temporary password after signing in.",
      ].join("\n"),
      html: buildInvitationHtml({ greeting, intro, recipient, temporaryPassword }),
    });
  } finally {
    transport.close();
  }
}

// Used by System admin > Account settings to confirm SMTP is configured.
export async function sendTestEmail({ recipient, firstName }: { recipient: string; firstName: string }) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER;

  if (!from) {
    throw new Error("Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD.");
  }

  const transport = getMailTransport();
  const greeting = `Hello ${firstName},`;
  const intro = "This is a test email from BloodBridge. If you can read it, email delivery is working.";

  try {
    await transport.sendMail({
      from,
      to: recipient,
      subject: "BloodBridge test email",
      text: [greeting, "", intro].join("\n"),
      html: [
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:480px;margin:0 auto;">`,
        `<p style="font-weight:bold;font-size:18px;color:#7f1d1d;margin:0 0 16px;">BloodBridge</p>`,
        `<p>${escapeHtml(greeting)}</p>`,
        `<p>${escapeHtml(intro)}</p>`,
        `</div>`,
      ].join(""),
    });
  } finally {
    transport.close();
  }
}
