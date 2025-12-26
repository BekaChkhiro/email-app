"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/clients", label: "Clients" },
  { href: "/clients/import", label: "Import" },
  { href: "/templates", label: "Templates" },
  { href: "/campaigns", label: "Campaigns" },
];

export function NavLinks() {
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === "/clients/import") {
      return pathname === href;
    }
    if (href === "/clients") {
      return pathname === href || (pathname.startsWith("/clients/") && !pathname.startsWith("/clients/import"));
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              isActiveLink(link.href)
                ? "text-white bg-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {link.label}
            {isActiveLink(link.href) && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full" />
            )}
          </Link>
        ))}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden absolute left-0 right-0 top-16 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
              isActiveLink(link.href)
                ? "text-white bg-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {link.label}
            {isActiveLink(link.href) && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full" />
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
