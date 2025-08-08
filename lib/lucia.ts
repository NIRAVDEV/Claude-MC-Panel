import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production"
    }
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
      role: attributes.role,
      credits: attributes.credits
    };
  }
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      name: string | null;
      role: "USER" | "ADMIN";
      credits: number;
    };
  }
}