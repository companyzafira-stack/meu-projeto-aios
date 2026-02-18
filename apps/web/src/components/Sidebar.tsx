'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Scissors,
  Calendar,
  Clipboard,
  DollarSign,
  Star,
  User,
  Menu,
  X,
} from 'lucide-react';

const menuItems = [
  { label: 'Início', href: '/dashboard/inicio', icon: Home },
  { label: 'Serviços', href: '/dashboard/servicos', icon: Scissors },
  { label: 'Agenda', href: '/dashboard/agenda', icon: Calendar },
  { label: 'Agendamentos', href: '/dashboard/agendamentos', icon: Clipboard },
  { label: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign },
  { label: 'Avaliações', href: '/dashboard/avaliacoes', icon: Star },
  { label: 'Perfil', href: '/dashboard/perfil', icon: User },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2 px-3 py-4">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
              isActive
                ? 'bg-red-100 text-red-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b md:hidden">
          <Sidebar onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
