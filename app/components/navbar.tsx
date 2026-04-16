"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const links = [
  { href: "/",          label: "Dashboard"  },
  { href: "/camiones",  label: "Camiones"   },
  { href: "/espacios",  label: "Espacios"   },
  { href: "/historial", label: "Historial"  },
  { href: "/reportes",  label: "Reportes"   },
];

export default function Navbar() {
  const path   = usePathname();
  const router = useRouter();

  if (path === "/login") return null;

  const logout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <nav style={{
      background: "#1E3A5F", padding: "0 2rem",
      display: "flex", alignItems: "center",
      height: 56, position: "sticky", top: 0, zIndex: 100,
    }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginRight: 32, fontFamily: "Arial" }}>
        Control Planta
      </span>
      <div style={{ display: "flex", flex: 1, gap: 4 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            color: path === l.href ? "#fff" : "#93C5FD",
            background: path === l.href ? "#2E6DA4" : "transparent",
            padding: "6px 18px", borderRadius: 6, textDecoration: "none",
            fontSize: 14, fontFamily: "Arial", fontWeight: path === l.href ? 600 : 400,
          }}>
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#93C5FD", fontSize: 13 }}>
          {auth.currentUser?.email}
        </span>
        <button onClick={logout} style={{
          background: "transparent", border: "1px solid #475569",
          color: "#94A3B8", borderRadius: 6, padding: "5px 14px",
          cursor: "pointer", fontSize: 13, fontFamily: "Arial",
        }}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}