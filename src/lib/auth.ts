import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const instructor = await prisma.instructor.findUnique({
          where: { email: credentials.email },
        });
        if (!instructor) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          instructor.password
        );
        if (!valid) return null;

        return {
          id: instructor.id,
          email: instructor.email,
          name: instructor.nombre,
          isAdmin: instructor.isAdmin,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/instructor/login",
    error: "/instructor/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.instructorId = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.instructorId = token.instructorId as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
