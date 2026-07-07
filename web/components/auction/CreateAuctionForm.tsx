"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EducationTip } from "@/components/ui/EducationTip";
import { CONTRACTS } from "@/lib/contracts/config";
import { toWei } from "@/lib/format";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { decodeEventLog } from "viem";
import { Loader2, Gem, Gavel, CheckCircle2 } from "lucide-react";

type Step = "form" | "minting" | "approving" | "listing" | "done";

export function CreateAuctionForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  const [itemName, setItemName] = useState("");
  const [startingPrice, setStartingPrice] = useState("0.01");
  const [durationHours, setDurationHours] = useState("72");
  const [minIncrementPct, setMinIncrementPct] = useState("5");
  const [extensionMinutes, setExtensionMinutes] = useState("5");

  const [step, setStep] = useState<Step>("form");
  const [createdAuctionId, setCreatedAuctionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mintAction = useContractAction();
  const approveAction = useContractAction();
  const createAction = useContractAction();

  const isValid = itemName.trim().length > 0 && Number(startingPrice) > 0 && Number(durationHours) > 0;

  async function handleSubmit() {
    if (!address || !publicClient || !isValid) return;
    setError(null);

    try {
      // Step 1: mint the item.
      setStep("minting");
      const mintHash = await mintAction.execute({
        address: CONTRACTS.nft.address,
        abi: CONTRACTS.nft.abi,
        functionName: "mint",
        args: [itemName.trim()],
      });
      const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
      let tokenId: bigint | null = null;
      for (const log of mintReceipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: CONTRACTS.nft.abi, ...log });
          if (decoded.eventName === "Minted") {
            tokenId = (decoded.args as unknown as { tokenId: bigint }).tokenId;
            break;
          }
        } catch {
          // not the event we're looking for
        }
      }
      if (tokenId === null) throw new Error("Could not determine the minted item's ID.");

      // Step 2: approve the auction house to escrow it.
      setStep("approving");
      await approveAction.execute({
        address: CONTRACTS.nft.address,
        abi: CONTRACTS.nft.abi,
        functionName: "approve",
        args: [CONTRACTS.auctionHouse.address, tokenId],
      });

      // Step 3: create the auction.
      setStep("listing");
      const minIncrementBps = BigInt(Math.round(Number(minIncrementPct) * 100));
      const durationSeconds = BigInt(Math.round(Number(durationHours) * 3600));
      const extensionWindowSeconds = BigInt(Math.round(Number(extensionMinutes) * 60));
      const extensionDurationSeconds = extensionWindowSeconds;

      const createHash = await createAction.execute({
        address: CONTRACTS.auctionHouse.address,
        abi: CONTRACTS.auctionHouse.abi,
        functionName: "createAuction",
        args: [
          CONTRACTS.nft.address,
          tokenId,
          toWei(startingPrice),
          durationSeconds,
          minIncrementBps,
          extensionWindowSeconds,
          extensionDurationSeconds,
        ],
      });
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
      let auctionId: number | null = null;
      for (const log of createReceipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: CONTRACTS.auctionHouse.abi, ...log });
          if (decoded.eventName === "AuctionCreated") {
            auctionId = Number((decoded.args as unknown as { auctionId: bigint }).auctionId);
            break;
          }
        } catch {
          // not the event we're looking for
        }
      }

      setCreatedAuctionId(auctionId);
      setStep("done");
    } catch (err) {
      setStep("form");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (step === "done" && createdAuctionId !== null) {
    return (
      <Card className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-success-soft text-success flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={26} />
        </div>
        <h2 className="font-display text-xl font-semibold mb-2">Your auction is live</h2>
        <p className="text-sm text-ink-soft mb-6">
          &ldquo;{itemName}&rdquo; is now listed and accepting bids.
        </p>
        <Button onClick={() => router.push(`/auctions/${createdAuctionId}`)}>View your auction</Button>
      </Card>
    );
  }

  const isBusy = step !== "form";

  return (
    <Card className="p-6 space-y-5">
      <div>
        <label className="text-xs text-ink-faint mb-2 flex items-center gap-1">
          <Gem size={13} /> Item name
        </label>
        <input
          type="text"
          placeholder="e.g. Vintage Synth #1"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          disabled={isBusy}
          className="w-full px-4 py-3 rounded-xl border border-line bg-canvas-alt text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors disabled:opacity-60"
        />
        <p className="text-xs text-ink-faint mt-1.5">
          This mints a free demo collectible you&apos;ll then list for
          auction — no need to already own an item.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-ink-faint mb-2 block">Starting price (ETH)</label>
          <input
            type="number"
            step="0.001"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            disabled={isBusy}
            className="w-full px-4 py-3 rounded-xl border border-line bg-canvas-alt text-sm font-mono-num focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-ink-faint mb-2 block">Duration (hours)</label>
          <input
            type="number"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            disabled={isBusy}
            className="w-full px-4 py-3 rounded-xl border border-line bg-canvas-alt text-sm font-mono-num focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-ink-faint mb-2 flex items-center gap-1">
            Min. bid increment (%)
            <EducationTip label="Minimum increment">
              How much each new bid must beat the previous one by. 5% is a
              reasonable default — low enough to encourage bidding, high
              enough to keep it meaningful.
            </EducationTip>
          </label>
          <input
            type="number"
            value={minIncrementPct}
            onChange={(e) => setMinIncrementPct(e.target.value)}
            disabled={isBusy}
            className="w-full px-4 py-3 rounded-xl border border-line bg-canvas-alt text-sm font-mono-num focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-ink-faint mb-2 flex items-center gap-1">
            Anti-snipe window (min)
            <EducationTip label="Anti-snipe window">
              Any bid placed within this many minutes of the deadline
              extends the auction by the same amount, so late snipers
              can&apos;t shut out real competition.
            </EducationTip>
          </label>
          <input
            type="number"
            value={extensionMinutes}
            onChange={(e) => setExtensionMinutes(e.target.value)}
            disabled={isBusy}
            className="w-full px-4 py-3 rounded-xl border border-line bg-canvas-alt text-sm font-mono-num focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {!isConnected ? (
        <Button size="lg" className="w-full" disabled>
          Connect your wallet to list an item
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={!isValid || isBusy}>
          {isBusy && <Loader2 size={16} className="animate-spin" />}
          {!isBusy && <Gavel size={16} />}
          {step === "form" && "Mint item & create auction"}
          {step === "minting" && "Minting your item..."}
          {step === "approving" && "Approving auction house..."}
          {step === "listing" && "Creating auction..."}
        </Button>
      )}
      {isBusy && (
        <p className="text-xs text-ink-faint text-center">
          This takes three signatures: mint, approve, and list. Please
          confirm each one in your wallet.
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
