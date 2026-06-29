import { prisma } from "./db";

export async function createNotification(input: {
  tenantId: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title,
      content: input.content,
      type: input.type,
      link: input.link,
    },
  });
}
