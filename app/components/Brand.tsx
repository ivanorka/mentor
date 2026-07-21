import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href="/" aria-label="Gaudeamus Mentor početna">
      <span className="brand-mark"><Sparkles size={compact ? 15 : 18} strokeWidth={2.2} /></span>
      <span className="brand-copy">
        <strong>GAUDEAMUS</strong>
        <em>MENTOR</em>
      </span>
    </Link>
  );
}
