import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // Secure the route so only authorized cron calls can execute it
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const updated = await prisma.meeting.updateMany({
      where: {
        createdAt: {
          lt: twentyFourHoursAgo
        },
        status: {
          in: ['WAITING', 'ACTIVE']
        }
      },
      data: {
        status: 'ENDED'
      }
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error("Failed to expire sessions:", error);
    return NextResponse.json({ error: "Failed to expire sessions" }, { status: 500 });
  }
}
