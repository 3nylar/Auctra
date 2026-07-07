import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SiweMessage } from "siwe";
import { prisma } from "@/lib/prisma";

/// Auth.js (NextAuth v5) setup with two independent, equally "real" sign-in
/// paths:
///
///  1. Wallet (SIWE — Sign-In With Ethereum): the primary path for this
///     product, since it's a Web3 app. The user signs a structured,
///     human-readable message with their wallet; we verify the signature
///     server-side and recover their address. No password, no email needed.
///
///  2. Email magic link: a fallback for people who land on the app before
///     installing a wallet, or who prefer email. A one-time sign-in link is
///     emailed to them via SMTP (nodemailer).
///
/// Both paths converge on the same `User` model (see prisma/schema.prisma),
/// so a user could in principle link both an email and a wallet to one
/// account in a future iteration, though the current UI treats them as
/// separate entry points.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    // Credentials-based sign-in (our SIWE provider) is only supported with
    // JWT sessions in Auth.js -- the adapter is still used to persist users
    // and email verification tokens, just not the session record itself.
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "ethereum",
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) return null;

          const siwe = new SiweMessage(credentials.message as string);

          // The nonce must have been issued by us (via /api/auth/siwe-nonce)
          // and not already used, to prevent replay of a captured signature.
          const nonceRecord = await prisma.siweNonce.findUnique({
            where: { nonce: siwe.nonce },
          });
          if (!nonceRecord || nonceRecord.usedAt) return null;

          const ageMs = Date.now() - nonceRecord.createdAt.getTime();
          if (ageMs > 10 * 60 * 1000) return null; // nonces expire after 10 minutes

          const result = await siwe.verify({
            signature: credentials.signature as string,
            nonce: siwe.nonce,
          });
          if (!result.success) return null;

          await prisma.siweNonce.update({
            where: { nonce: siwe.nonce },
            data: { usedAt: new Date() },
          });

          const walletAddress = siwe.address.toLowerCase();

          const user = await prisma.user.upsert({
            where: { walletAddress },
            update: {},
            create: {
              walletAddress,
              name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            },
          });

          return { id: user.id, name: user.name, walletAddress: user.walletAddress };
        } catch {
          return null;
        }
      },
    }),
    Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "Auctra <no-reply@example.com>",
      maxAge: 15 * 60, // magic link valid for 15 minutes
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = (user as { walletAddress?: string }).walletAddress ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { walletAddress?: string | null }).walletAddress =
          (token.walletAddress as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
