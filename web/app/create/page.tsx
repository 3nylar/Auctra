import { TopBar } from "@/components/auction/TopBar";
import { CreateAuctionForm } from "@/components/auction/CreateAuctionForm";

export default function CreateAuctionPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 bg-canvas">
        <div className="max-w-lg mx-auto px-4 md:px-6 py-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">List an item</h1>
          <p className="text-ink-soft mb-8">
            Mint a free demo item and put it up for auction in one flow.
          </p>
          <CreateAuctionForm />
        </div>
      </main>
    </>
  );
}
