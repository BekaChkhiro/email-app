import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user in database
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (user.length === 0) {
          return null;
        }

        const foundUser = user[0];

        // Check if user is active
        if (!foundUser.isActive) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(password, foundUser.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name || "Admin",
        };
      },
    }),
  ],
});
