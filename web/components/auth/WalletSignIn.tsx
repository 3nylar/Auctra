"use client";

import { useState } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Wallet, Loader2, AlertCircle } from "lucide-react";

export function WalletSignIn({ callbackUrl }: { callbackUrl: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<"idle" | "signing" | "verifying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!address || !chainId) return;
    setStatus("signing");
    setError(null);
    try {
      const nonceRes = await fetch("/api/auth/siwe-nonce");
      if (!nonceRes.ok) throw new Error("Could not prepare a sign-in request. Please try again.");
      const { nonce } = await nonceRes.json();

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Auctra. This request will not trigger a blockchain transaction or cost any gas.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });
      const preparedMessage = message.prepareMessage();

      const signature = await signMessageAsync({ message: preparedMessage });

      setStatus("verifying");
      const result = await signIn("ethereum", {
        message: preparedMessage,
        signature,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error("We couldn't verify that signature. Please try again.");
      }
      window.location.href = result?.url || callbackUrl;
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Sign-in was cancelled or failed. Please try again."
      );
    }
  }

  return (
    <div className="space-y-4">
      <ConnectButton.Custom>
        {({ openConnectModal, mounted }) => {
          if (!mounted) return null;
          if (!isConnected) {
            return (
              <Button size="lg" className="w-full" onClick={openConnectModal}>
                <Wallet size={18} /> Connect wallet
              </Button>
            );
          }
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-line bg-canvas-alt px-4 py-3 text-sm">
                <span className="font-mono-num text-ink-soft">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="text-ink-faint hover:text-danger transition-colors text-xs"
                >
                  Disconnect
                </button>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleSignIn}
                disabled={status === "signing" || status === "verifying"}
              >
                {status === "signing" && <Loader2 size={18} className="animate-spin" />}
                {status === "verifying" && <Loader2 size={18} className="animate-spin" />}
                {status === "signing"
                  ? "Waiting for your signature..."
                  : status === "verifying"
                  ? "Verifying..."
                  : "Sign in with Ethereum"}
              </Button>
              <p className="text-xs text-ink-faint text-center leading-relaxed">
                This only proves wallet ownership. It never triggers a
                transaction and never costs gas.
              </p>
            </div>
          );
        }}
      </ConnectButton.Custom>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-danger-soft text-danger text-sm p-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
