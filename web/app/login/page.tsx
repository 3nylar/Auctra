import Link from "next/link";
import { Gavel, ShieldCheck } from "lucide-react";
import { WalletSignIn } from "@/components/auth/WalletSignIn";
import { EmailSignIn } from "@/components/auth/EmailSignIn";
import { Card } from "@/components/ui/Card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/auctions";

  return (
    <main className="flex-1 flex items-center justify-center gradient-trust px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg mb-6">
            <span className="w-8 h-8 rounded-lg gradient-primary-btn flex items-center justify-center text-[#141420]">
              <Gavel size={17} strokeWidth={2.4} />
            </span>
            Auctra
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign in to Auctra
          </h1>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            Use a wallet to bid and list items, or an email if you&apos;d
            rather just browse for now.
          </p>
        </div>

        <Card className="p-6">
          <WalletSignIn callbackUrl={callbackUrl} />

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <EmailSignIn callbackUrl={callbackUrl} />
        </Card>

        <div className="mt-6 flex items-start gap-2 text-xs text-ink-faint leading-relaxed justify-center text-center">
          <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-success" />
          <span>
            Runs on a public test network. No real funds are ever
            involved, and signing in never authorizes a transaction on its
            own.
          </span>
        </div>
      </div>
    </main>
  );
}
