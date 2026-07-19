import webpush from "web-push";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export async function sendOperationalAlert(input: { userId?: string; type: string; title: string; body: string; url?: string }) {
  const users = input.userId ? await prisma.user.findMany({ where: { id: input.userId } }) : await prisma.user.findMany({ where: { role: "admin" } });
  for (const user of users) {
    const notification = await prisma.notification.create({ data: { userId: user.id, type: input.type, title: input.title, body: input.body, channels: ["email", "web_push"], metadata: { url: input.url || "/en/admin" } } });
    const deliveries: Promise<unknown>[] = [];
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      deliveries.push(resend.emails.send({ from: process.env.EMAIL_FROM || "noreply@azharinoyume.cloud", to: user.email, subject: input.title, text: `${input.body}\n\n${process.env.NEXT_PUBLIC_APP_URL || ""}${input.url || "/en/admin"}` }));
    }
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@azharinoyume.cloud", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
      for (const subscription of subscriptions) deliveries.push(webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: input.title, body: input.body, url: input.url })) .catch(async (error: { statusCode?: number }) => { if (error.statusCode === 404 || error.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: subscription.id } }); }));
    }
    await Promise.allSettled(deliveries);
    await prisma.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date() } });
  }
}
