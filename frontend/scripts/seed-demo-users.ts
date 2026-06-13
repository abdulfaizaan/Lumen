import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function seedUsers() {
  console.log("Seeding demo users for judging...");
  const hashedPassword = await bcrypt.hash("demo123", 10);

  const users = [
    {
      name: "Admin Demo",
      email: "admin@lumen.com",
      role: "ADMIN",
    },
    {
      name: "Agent Demo",
      email: "agent@lumen.com",
      role: "AGENT",
    },
    {
      name: "Customer Demo",
      email: "customer@lumen.com",
      role: "CUSTOMER",
    }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashedPassword, role: u.role as any },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role as any,
      }
    });
    console.log(`Created/Updated ${u.role}: ${u.email} / password: demo123`);
  }

  console.log("User seed complete!");
}

seedUsers().catch(console.error).finally(() => prisma.$disconnect());
