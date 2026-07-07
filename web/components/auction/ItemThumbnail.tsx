import { Gem } from "lucide-react";

const GRADIENTS = [
  "from-[#2a2333] to-[#1a1c28]",
  "from-[#233026] to-[#1a1c28]",
  "from-[#332a23] to-[#1a1c28]",
  "from-[#23272f] to-[#1a1c28]",
  "from-[#302333] to-[#1a1c28]",
];

export function ItemThumbnail({ tokenId, className }: { tokenId: bigint; className?: string }) {
  const index = Number(tokenId % BigInt(GRADIENTS.length));
  return (
    <div
      className={`aspect-[4/3] bg-gradient-to-br ${GRADIENTS[index]} flex items-center justify-center ${className ?? ""}`}
    >
      <Gem size={36} className="text-gold/30" strokeWidth={1.5} />
    </div>
  );
}
