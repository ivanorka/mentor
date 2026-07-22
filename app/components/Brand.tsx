import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href="/" aria-label="Gaudeamus Mentor početna">
      <span className="brand-mark"><GraduationCap size={compact ? 16 : 20} strokeWidth={2.2} /></span>
      <span className="brand-copy">
        <strong>GAUDEAMUS</strong>
        <em>MENTOR</em>
      </span>
    </Link>
  );
}
