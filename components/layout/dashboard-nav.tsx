"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden lg:block">
        <div className="space-y-2">
          {dashboardNavItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-[1.35rem] border px-4 py-3 transition-colors",
                  active
                    ? "border-emerald-300/20 bg-emerald-400/10 text-white"
                    : "border-transparent bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-inherit/80">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="lg:hidden">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto pb-2">
          {dashboardNavItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors",
                  active
                    ? "border-emerald-300/20 bg-emerald-400/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-400",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
