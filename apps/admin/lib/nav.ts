import type { Permission } from "@salil-sandesh/shared";

export interface NavItem {
  href: string;
  label: string;
  anyOf: Permission[];
}

export const navItems: NavItem[] = [
  { href: "/", label: "डैशबोर्ड", anyOf: [] },
  {
    href: "/articles",
    label: "लेख",
    anyOf: ["article:create", "article:edit", "article:publish", "article:delete"],
  },
  { href: "/media", label: "मीडिया", anyOf: ["media:upload", "media:manage"] },
  { href: "/categories", label: "श्रेणियाँ", anyOf: ["category:manage"] },
  { href: "/tags", label: "टैग", anyOf: ["tag:manage"] },
  { href: "/users", label: "उपयोगकर्ता", anyOf: ["user:manage"] },
  { href: "/roles", label: "भूमिकाएँ", anyOf: ["role:manage"] },
];

export function visibleNavItems(permissions: Permission[]): NavItem[] {
  const granted = new Set(permissions);
  return navItems.filter(
    (item) => item.anyOf.length === 0 || item.anyOf.some((permission) => granted.has(permission))
  );
}
