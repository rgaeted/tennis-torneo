import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Admin</p>
        {[
          { href: "/admin", label: "📊 Dashboard" },
          { href: "/admin/torneo", label: "🏆 Torneos" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            {label}
          </Link>
        ))}
        <div className="mt-auto">
          <Link href="/" className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800 block">
            ← Ver sitio
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
