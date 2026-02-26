'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  Bot,
  BarChart3,
  FileText,
  Settings,
  Activity,
  Zap,
  Shield,
} from 'lucide-react'

const navItems = [
  { href: '/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/signals', label: 'Signals', icon: Zap },
  { href: '/orders', label: 'Orders', icon: BarChart3 },
  { href: '/audit', label: 'Audit Log', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-[#1a1f2e] border-r border-[#2d3748] flex flex-col min-h-screen">
      <div className="p-6 border-b border-[#2d3748]">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-white font-bold text-lg">Sovrana</h1>
            <p className="text-gray-500 text-xs">Agent Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#2d3748]">
        <p className="text-xs text-gray-600">v1.0.0</p>
      </div>
    </aside>
  )
}
