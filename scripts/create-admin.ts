/**
 * Run once on VPS to create the admin account:
 * npx tsx scripts/create-admin.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import * as readline from "readline";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

  const email = await ask("Admin email: ");
  const password = await ask("Admin password: ");
  const name = await ask("Admin name: ");
  rl.close();

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { passwordHash, name, role: "admin" } });
    console.log("Admin account updated.");
  } else {
    await prisma.user.create({ data: { email, name, passwordHash, role: "admin" } });
    console.log("Admin account created.");
  }

  console.log(`Admin: ${email} — Login at https://azharinoyume.cloud/login`);
  await prisma.$disconnect();
}

main().catch(console.error);
