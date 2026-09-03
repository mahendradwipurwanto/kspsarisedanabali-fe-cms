import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, FileText, Newspaper, Image, Package, MapPin, Settings2,
  ShieldCheck, UserCog, PanelTop, PanelBottom, Search, Landmark, Building2,
} from 'lucide-react'

export interface NavItem { label: string; href: string; icon: LucideIcon; group: string; perms: string[]; exact?: boolean }

/**
 * Console navigation, grouped the way the koperasi thinks about the work:
 * what is on the website, how the website is framed, who came in through it,
 * and who may change it. Filtered by permission at render, so each role sees
 * only what it can use.
 */
export const NAV: NavItem[] = [
  { label: 'Ringkasan', href: '/', icon: LayoutDashboard, group: 'Ikhtisar', perms: [], exact: true },
  { label: 'Calon Nasabah', href: '/leads', icon: Users, group: 'Ikhtisar', perms: ['leads:read:all', 'leads:read:branch'] },

  { label: 'Halaman', href: '/halaman', icon: FileText, group: 'Konten', perms: ['pages:read'] },
  { label: 'Berita', href: '/berita', icon: Newspaper, group: 'Konten', perms: ['posts:read'] },
  { label: 'Media', href: '/media', icon: Image, group: 'Konten', perms: ['media:read'] },
  { label: 'Produk', href: '/produk', icon: Package, group: 'Konten', perms: ['products:read'] },
  { label: 'Kantor', href: '/kantor', icon: MapPin, group: 'Konten', perms: ['branches:read'] },

  { label: 'Identitas', href: '/pengaturan', icon: Landmark, group: 'Website', perms: ['settings:manage'], exact: true },
  { label: 'Header & Menu', href: '/pengaturan/header', icon: PanelTop, group: 'Website', perms: ['settings:manage', 'menus:manage'] },
  { label: 'Footer', href: '/pengaturan/footer', icon: PanelBottom, group: 'Website', perms: ['settings:manage', 'menus:manage'] },
  { label: 'SEO & Sosial', href: '/pengaturan/seo', icon: Search, group: 'Website', perms: ['settings:manage'] },
  { label: 'Profil & Legalitas', href: '/pengaturan/profil', icon: Building2, group: 'Website', perms: ['settings:manage'] },

  { label: 'Pengguna', href: '/pengguna', icon: UserCog, group: 'Sistem', perms: ['users:read'] },
  { label: 'Peran & Hak Akses', href: '/peran', icon: ShieldCheck, group: 'Sistem', perms: ['roles:read', 'roles:manage'] },
]

export const NAV_GROUPS = ['Ikhtisar', 'Konten', 'Website', 'Sistem'] as const

export const settingsIcon = Settings2
