# IPET-014 SPEC — Booking Status Management Dashboard (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. IPET-001 to IPET-013 are implemented. This spec covers IPET-014: pet shop dashboard page to manage all bookings with tabs, status actions, and real-time updates.

**Tech stack (web):** Next.js 14 (App Router), TypeScript strict, Tailwind CSS, react-hook-form, Supabase client at `@/lib/supabase`, Lucide React icons.

**Patterns to follow:** See `apps/web/src/app/(dashboard)/servicos/page.tsx` for dashboard page pattern (auth check, petshopId from session). See `apps/web/src/hooks/useServices.ts` for hook pattern.

**Existing page:** `apps/web/src/app/(dashboard)/agendamentos/page.tsx` exists as placeholder — **replace entirely**.

## Existing Database Schema (no migrations needed)

```sql
-- bookings (all columns already exist from previous migrations)
bookings: id, tutor_id, petshop_id, booking_date, start_time, end_time,
  status ('pending_payment','confirmed','in_progress','completed','cancelled','no_show'),
  total_amount, commission_amount, payment_id, payment_status, payment_method, paid_at,
  cancelled_by ('tutor','petshop','system'), cancelled_at,
  reminder_24h_sent, reminder_2h_sent, created_at, updated_at

-- booking_items
booking_items: id, booking_id, pet_id, service_id, price, duration_minutes

-- profiles: id, display_name, phone, avatar_url, push_token
-- pets: id, user_id, name, species, breed, size, photo_url
-- services: id, petshop_id, name, category, duration_minutes
```

## Status Machine

```
pending_payment → confirmed (via webhook)     → cancelled (system/tutor)
confirmed       → in_progress (pet shop)      → cancelled (pet shop)
in_progress     → completed (pet shop)        → cancelled (pet shop)
completed       → (terminal)
cancelled       → (terminal)
no_show         → (terminal, set by system)
```

Valid pet shop actions:
- `confirmed` → "Iniciar Atendimento" → `in_progress`
- `in_progress` → "Concluir" → `completed`
- Any non-terminal → "Cancelar" → `cancelled` (with reason)

## Files to Create

### 1. `apps/web/src/hooks/useBookings.ts`

**Purpose:** Fetch bookings for pet shop with real-time subscription.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BookingItem {
  id: string;
  pet_id: string;
  service_id: string;
  price: number;
  duration_minutes: number;
  pets: { name: string; species: string; size: string; photo_url: string | null };
  services: { name: string; category: string };
}

export interface Booking {
  id: string;
  tutor_id: string;
  petshop_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_amount: number;
  payment_method: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string; phone: string | null; avatar_url: string | null };
  booking_items: BookingItem[];
}

export function useBookings(petshopId: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    if (!petshopId) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id, tutor_id, petshop_id, booking_date, start_time, end_time,
          status, total_amount, payment_method, cancelled_by, cancelled_at,
          created_at, updated_at,
          profiles:tutor_id(display_name, phone, avatar_url),
          booking_items(
            id, pet_id, service_id, price, duration_minutes,
            pets:pet_id(name, species, size, photo_url),
            services:service_id(name, category)
          )
        `)
        .eq('petshop_id', petshopId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setBookings((data || []) as unknown as Booking[]);
    } catch (err) {
      setError('Erro ao carregar agendamentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [petshopId]);

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!petshopId) return;

    const channel = supabase
      .channel(`bookings-${petshopId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `petshop_id=eq.${petshopId}`,
      }, () => {
        // Refetch on any change (INSERT, UPDATE, DELETE)
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [petshopId, fetchBookings]);

  // Update booking status
  const updateStatus = async (bookingId: string, newStatus: string, reason?: string) => {
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'cancelled') {
      updateData.cancelled_by = 'petshop';
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .eq('petshop_id', petshopId);

    if (updateError) throw updateError;

    // Trigger notification via API
    await fetch('/api/bookings/status-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, newStatus, reason }),
    });
  };

  return { bookings, loading, error, refetch: fetchBookings, updateStatus };
}
```

### 2. `apps/web/src/app/api/bookings/status-change/route.ts`

**Purpose:** API route to send notifications when pet shop changes booking status.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { onBookingInProgress, onBookingCompleted, onBookingCancelled } from '@/lib/push/booking-events';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bookingId, newStatus, reason } = await request.json();

    if (!bookingId || !newStatus) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Send appropriate notification
    switch (newStatus) {
      case 'in_progress':
        await onBookingInProgress(bookingId);
        break;
      case 'completed':
        await onBookingCompleted(bookingId);
        break;
      case 'cancelled':
        await onBookingCancelled(bookingId, 'petshop');
        // TODO: trigger refund via MP API (IPET-022 or future story)
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Status change notification error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### 3. `apps/web/src/app/(dashboard)/agendamentos/components/BookingTabs.tsx`

**Purpose:** Tab navigation: Hoje | Próximos | Concluídos | Cancelados.

```
'use client';

Props:
  activeTab: 'today' | 'upcoming' | 'completed' | 'cancelled'
  onTabChange: (tab) => void
  counts: { today: number; upcoming: number; completed: number; cancelled: number }

Layout (Tailwind):
  - Container: flex gap-2 border-b border-gray-200 mb-6
  - Each tab button:
    - px-4 py-2 text-sm font-medium border-b-2 transition-colors
    - Active: border-[#FF6B6B] text-[#FF6B6B]
    - Inactive: border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300
    - Count badge: ml-2 text-xs bg-gray-100 rounded-full px-2 py-0.5
      Active badge: bg-red-50 text-[#FF6B6B]

  Tabs:
    { key: 'today', label: 'Hoje' }
    { key: 'upcoming', label: 'Próximos' }
    { key: 'completed', label: 'Concluídos' }
    { key: 'cancelled', label: 'Cancelados' }
```

### 4. `apps/web/src/app/(dashboard)/agendamentos/components/StatusBadge.tsx`

**Purpose:** Colored badge for booking status.

```
Props:
  status: string

Status config:
  confirmed:       { label: 'Confirmado',    bg: 'bg-blue-100',   text: 'text-blue-700' }
  in_progress:     { label: 'Em Atendimento', bg: 'bg-yellow-100', text: 'text-yellow-700' }
  completed:       { label: 'Concluído',     bg: 'bg-green-100',  text: 'text-green-700' }
  cancelled:       { label: 'Cancelado',     bg: 'bg-red-100',    text: 'text-red-700' }
  pending_payment: { label: 'Aguardando Pgto', bg: 'bg-gray-100', text: 'text-gray-700' }
  no_show:         { label: 'Não Compareceu', bg: 'bg-orange-100', text: 'text-orange-700' }

Layout: inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium {bg} {text}
```

### 5. `apps/web/src/app/(dashboard)/agendamentos/components/ActionButtons.tsx`

**Purpose:** Action buttons per booking status.

```
'use client';

Props:
  booking: Booking
  onAction: (bookingId: string, action: string, reason?: string) => Promise<void>
  loading: boolean

Implementation:
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  Valid actions based on status:
    'confirmed'   → "Iniciar Atendimento" button (green) + "Cancelar" (red outline)
    'in_progress' → "Concluir" button (green) + "Cancelar" (red outline)
    Other statuses → no action buttons

  "Iniciar Atendimento":
    - Icon: Play (lucide)
    - onClick: onAction(booking.id, 'in_progress')
    - bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm

  "Concluir":
    - Icon: CheckCircle (lucide)
    - onClick: onAction(booking.id, 'completed')
    - bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm
    - NOTE: IPET-015 will add photo upload requirement before completing.
      For now, just change status directly.

  "Cancelar":
    - Icon: XCircle (lucide)
    - onClick: setShowCancelModal(true)
    - border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm

  Cancel modal (inline, not separate file):
    - Overlay: fixed inset-0 bg-black/50 z-50 flex items-center justify-center
    - Modal: bg-white rounded-lg p-6 max-w-md w-full mx-4
    - Title: "Cancelar Agendamento"
    - Warning: "O tutor será reembolsado integralmente."
    - Textarea: "Motivo do cancelamento" (required, minLength 10)
    - Buttons: "Voltar" (outline) + "Confirmar Cancelamento" (bg-red-600)
    - On confirm: onAction(booking.id, 'cancelled', cancelReason)

  Show loading spinner on button when action in progress.
```

### 6. `apps/web/src/app/(dashboard)/agendamentos/components/BookingCard.tsx`

**Purpose:** Card showing booking info with expandable details.

```
'use client';

Props:
  booking: Booking
  onAction: (bookingId: string, action: string, reason?: string) => Promise<void>
  actionLoading: boolean

Implementation:
  const [expanded, setExpanded] = useState(false);

Layout (Tailwind):
  - Card: bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow
  - Main row (clickable to expand): p-4 cursor-pointer
    - Left section (flex-1):
      - Top row: tutor name (font-semibold) + StatusBadge
      - Pet & service info:
        For each booking_item:
          "{pet.name} ({pet.size}) — {service.name}"
        fontSize text-sm, color text-gray-600
      - Date/time: "📅 {DD/MM/YYYY} 🕐 {HH:MM} - {HH:MM}"
        text-sm text-gray-500
    - Right section:
      - Total: "R$ {total_amount}" text-lg font-bold text-[#FF6B6B]
      - Payment method icon (if paid): Pix/Card small label

  - Expanded section (if expanded): border-t border-gray-100 p-4 bg-gray-50
    - Grid 2 cols:
      - Tutor info: name, phone, avatar
      - Booking details: created_at, payment_status, payment_method
    - Full items list with prices:
      For each item: pet photo + name + service + "R$ {price}" + "{duration}min"
    - If cancelled: "Cancelado por: {cancelled_by}" + cancelled_at
    - Action buttons: <ActionButtons />

  - Chevron icon (ChevronDown/ChevronUp from lucide) on right side

Date formatting helpers:
  formatDate(dateStr): "24/02/2026"
  formatTime(timeStr): "08:00" (trim seconds)
```

### 7. `apps/web/src/app/(dashboard)/agendamentos/components/DateFilter.tsx`

**Purpose:** Date picker filter for bookings.

```
'use client';

Props:
  selectedDate: string | null  // "YYYY-MM-DD" or null (all dates)
  onDateChange: (date: string | null) => void

Layout:
  - Container: flex items-center gap-3
  - Label: "Filtrar por data:" text-sm text-gray-600
  - Input type="date": border rounded-lg px-3 py-1.5 text-sm
  - Clear button (if date selected): "✕" small button to reset → onDateChange(null)
```

### 8. `apps/web/src/app/(dashboard)/agendamentos/components/BookingCounters.tsx`

**Purpose:** Header counters showing today's stats.

```
Props:
  todayCount: number
  inProgressCount: number
  confirmedCount: number

Layout:
  - Container: flex gap-4 mb-6
  - Counter card (3 cards): bg-white rounded-lg border p-4 flex-1 text-center
    Card 1: "{todayCount}" label "Agendamentos hoje" — icon Calendar (lucide), text-blue-600
    Card 2: "{inProgressCount}" label "Em andamento" — icon Clock (lucide), text-yellow-600
    Card 3: "{confirmedCount}" label "Confirmados" — icon CheckCircle (lucide), text-green-600
  - Number: text-2xl font-bold
  - Label: text-sm text-gray-500
```

## Files to Modify

### 9. `apps/web/src/app/(dashboard)/agendamentos/page.tsx`

**Replace entirely** with:

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBookings } from '@/hooks/useBookings';
import { BookingTabs } from './components/BookingTabs';
import { BookingCard } from './components/BookingCard';
import { BookingCounters } from './components/BookingCounters';
import { DateFilter } from './components/DateFilter';
import { Calendar } from 'lucide-react';

// Auth: same pattern as servicos/page.tsx
//   useEffect → supabase.auth.getSession() → redirect if no session
//   petshopId = session.user.id

// State:
//   activeTab: 'today' | 'upcoming' | 'completed' | 'cancelled'
//   dateFilter: string | null
//   actionLoading: string | null (bookingId being acted on)

// Derived data (useMemo):
//   const today = new Date().toISOString().split('T')[0];
//
//   todayBookings = bookings.filter(b =>
//     b.booking_date === today && !['cancelled','no_show'].includes(b.status)
//   ).sort by start_time ASC
//
//   upcomingBookings = bookings.filter(b =>
//     b.booking_date > today && ['confirmed','pending_payment'].includes(b.status)
//   ).sort by booking_date ASC, start_time ASC
//
//   completedBookings = bookings.filter(b => b.status === 'completed')
//     If dateFilter: also filter by booking_date
//
//   cancelledBookings = bookings.filter(b => ['cancelled','no_show'].includes(b.status))
//     If dateFilter: also filter by booking_date
//
//   currentBookings = switch(activeTab):
//     'today' → todayBookings
//     'upcoming' → upcomingBookings
//     'completed' → completedBookings
//     'cancelled' → cancelledBookings
//
//   counts = { today: todayBookings.length, upcoming: upcomingBookings.length, ... }
//   inProgressCount = todayBookings.filter(b => b.status === 'in_progress').length
//   confirmedCount = todayBookings.filter(b => b.status === 'confirmed').length

// handleAction:
//   async (bookingId, action, reason?) => {
//     setActionLoading(bookingId);
//     try {
//       await updateStatus(bookingId, action, reason);
//     } catch (err) {
//       alert('Erro ao atualizar status');
//     } finally {
//       setActionLoading(null);
//     }
//   }

// Layout:
//   <div className="max-w-5xl mx-auto">
//     <div className="flex justify-between items-center mb-6">
//       <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//         <Calendar className="w-6 h-6" /> Agendamentos
//       </h1>
//     </div>
//
//     <BookingCounters todayCount={...} inProgressCount={...} confirmedCount={...} />
//
//     <BookingTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
//
//     {/* Date filter for completed/cancelled tabs */}
//     {(activeTab === 'completed' || activeTab === 'cancelled') && (
//       <DateFilter selectedDate={dateFilter} onDateChange={setDateFilter} />
//     )}
//
//     {loading ? (
//       <div className="text-center py-12">
//         <div className="animate-spin ...">Loading</div>
//       </div>
//     ) : currentBookings.length === 0 ? (
//       <div className="text-center py-12 text-gray-500">
//         Nenhum agendamento {activeTab === 'today' ? 'para hoje' : 'encontrado'}.
//       </div>
//     ) : (
//       <div className="space-y-3">
//         {currentBookings.map(booking => (
//           <BookingCard
//             key={booking.id}
//             booking={booking}
//             onAction={handleAction}
//             actionLoading={actionLoading === booking.id}
//           />
//         ))}
//       </div>
//     )}
//   </div>
```

## Implementation Order

1. **Hook:** `useBookings.ts` (fetch + realtime + updateStatus)
2. **API route:** `status-change/route.ts` (notifications on action)
3. **Components:** `StatusBadge` → `BookingCounters` → `DateFilter` → `ActionButtons` → `BookingCard` → `BookingTabs`
4. **Page:** Replace `agendamentos/page.tsx`

## Validation Rules

| Field | Rule |
|-------|------|
| Status transitions | Only valid: confirmed→in_progress, in_progress→completed, any→cancelled |
| Cancel reason | Required, min 10 characters |
| Cancel by petshop | Always results in full refund (future IPET-022) |
| Realtime filter | `petshop_id=eq.{id}` — only own bookings |
| Date format | Display DD/MM/YYYY, store YYYY-MM-DD |
| Time format | Display HH:MM, trim seconds |

## Testing Checklist

After implementation, verify:
- [ ] Tab "Hoje" mostra agendamentos do dia atual ordenados por horário
- [ ] Tab "Próximos" mostra agendamentos futuros confirmados
- [ ] Tab "Concluídos" mostra histórico de completados
- [ ] Tab "Cancelados" mostra cancelados e no-show
- [ ] Contadores no header corretos (hoje, em andamento, confirmados)
- [ ] "Iniciar Atendimento" muda status para in_progress
- [ ] "Concluir" muda status para completed
- [ ] "Cancelar" abre modal com campo de motivo obrigatório
- [ ] Cancelar envia push notification ao tutor
- [ ] Iniciar envia push notification ao tutor
- [ ] Concluir envia push notification ao tutor
- [ ] Novo booking aparece em tempo real (sem refresh da página)
- [ ] Status change reflete em tempo real nas tabs
- [ ] Card expande ao clicar mostrando detalhes completos
- [ ] Filtro por data funciona nas tabs Concluídos e Cancelados
- [ ] Limpar filtro mostra todos os bookings da tab
- [ ] StatusBadge mostra cor correta para cada status
- [ ] Transições inválidas não mostram botões (ex: completed → nenhum botão)
- [ ] Loading spinner no botão durante ação
- [ ] TypeScript compila: `cd apps/web && npx tsc --noEmit`

## Git Commit

```bash
git add apps/web/src/hooks/useBookings.ts apps/web/src/app/api/bookings/ apps/web/src/app/\(dashboard\)/agendamentos/
git commit -m "feat: implement booking management dashboard IPET-014

- Booking list with tabs: Hoje, Próximos, Concluídos, Cancelados
- Status actions: Iniciar Atendimento, Concluir, Cancelar (with reason)
- Supabase Realtime for instant booking updates
- Push notifications on status change (in_progress, completed, cancelled)
- Expandable booking cards with full details
- Date filter for historical tabs
- Header counters (today, in progress, confirmed)
- Status machine validation (confirmed→in_progress→completed)"
```

## Important Notes

- **NO migrations needed** — all tables and columns already exist
- **Realtime subscription** uses `petshop_id=eq.{id}` filter — efficient, only own bookings
- **Optimistic updates** not implemented for simplicity — Realtime refetch handles it
- **Cancel = full refund** — actual MP refund logic will be in IPET-022, for now just status change + notification
- **"Concluir" without photo** — IPET-015 will add photo upload requirement before completing. For now, direct status change.
- **Status change API** is a simple POST without auth validation — in production, add session check. For MVP, acceptable since dashboard is already auth-gated.
- Follow same auth pattern as `servicos/page.tsx` (session check + redirect)
- Use Lucide icons: Calendar, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Play
