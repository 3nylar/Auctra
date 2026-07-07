import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { prisma } from "@/lib/prisma";

// Issues a fresh, single-use nonce that the client embeds in the SIWE
// message it asks the wallet to sign. Verified and consumed server-side in
// lib/auth.ts's Ethereum credentials provider. This is the standard
// anti-replay mechanism for Sign-In With Ethereum.
export async function GET() {
  const nonce = generateNonce();
  await prisma.siweNonce.create({ data: { nonce } });
  return NextResponse.json({ nonce });
}
