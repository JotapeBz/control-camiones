"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",          label: "Dashboard"  },
  { href: "/camiones",  label: "Camiones"   },
  { href: "/espacios",  label: "Espacios"   },
  { href: "/historial", label: "Historial"  },
  { href: "/reportes",  label: "Reportes"   },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav style={{
      background: "#1E3A5F", padding: "0 2rem",
      display: "flex", alignItems: "center", gap: 0,
      height: 56, position: "sticky", top: 0, zIndex: 100,
    }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginRight: 32, fontFamily: "Arial" }}>
        Control Planta
      </span>
      {links.map(l => (
        <Link key={l.href} href={l.href} style={{
          color: path === l.href ? "#fff" : "#93C5FD",
          background: path === l.href ? "#2E6DA4" : "transparent",
          padding: "6px 18px", borderRadius: 6, textDecoration: "none",
          fontSize: 14, fontFamily: "Arial", fontWeight: path === l.href ? 600 : 400,
          marginRight: 4,
        }}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}