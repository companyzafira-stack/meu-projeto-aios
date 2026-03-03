# IPET-008 SPEC — Schedule Management (Codex Execution)

## Context
You are working on IPET, a pet services marketplace (Next.js 14 App Router + Supabase). IPET-001 to IPET-007 are already implemented. This spec covers IPET-008: Schedule Management for the pet shop dashboard.

**Tech stack:** Next.js 14 (App Router), TypeScript strict, Tailwind CSS, react-hook-form, Supabase (client at `@/lib/supabase`), Lucide React icons.

**Pattern to follow:** See `apps/web/src/hooks/useServices.ts` for hook pattern (useState + useEffect + Supabase CRUD). See `apps/web/src/app/(dashboard)/servicos/page.tsx` for page pattern.

## Existing Database Schema (already migrated)

```sql
-- schedules table
CREATE TABLE public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL, -- 0=Dom, 1=Seg...6=Sab
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 60,
  max_concurrent INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(petshop_id, day_of_week)
);

-- schedule_blocks table
CREATE TABLE public.schedule_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME,    -- NULL = block entire day
  end_time TIME,      -- NULL = block entire day
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bookings table (relevant columns)
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending_payment','confirmed','in_progress','completed','cancelled','no_show')) DEFAULT 'pending_payment',
  -- ... other columns
);
```

## Files to Create

### 1. `apps/web/src/hooks/useSchedules.ts`

**Purpose:** CRUD for `schedules` table (weekly schedule config).

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Schedule {
  id: string;
  petshop_id: string;
  day_of_week: number; // 0-6
  start_time: string;  // "HH:MM:SS"
  end_time: string;
  slot_duration_minutes: number;
  max_concurrent: number;
  is_active: boolean;
}

export function useSchedules(petshopId: string) {
  // State: schedules[], loading, error
  // fetchSchedules(): SELECT * FROM schedules WHERE petshop_id = X ORDER BY day_of_week ASC
  // upsertSchedule(data): UPSERT on (petshop_id, day_of_week)
  //   - Use supabase .upsert() with onConflict: 'petshop_id,day_of_week'
  // toggleDay(scheduleId, isActive): UPDATE is_active
  // updateSlotConfig(petshopId, duration, maxConcurrent):
  //   - UPDATE all schedules for this petshop SET slot_duration_minutes, max_concurrent
  // useEffect: fetch when petshopId changes
  // Return: { schedules, loading, error, upsertSchedule, toggleDay, updateSlotConfig, refetch }
}
```

**Key behavior:**
- `upsertSchedule` receives `{ day_of_week, start_time, end_time, is_active }` and upserts
- `updateSlotConfig` updates ALL schedule rows for the petshop (duration + concurrent are petshop-wide)
- Times stored as `"HH:MM:00"` format (PostgreSQL TIME type)

### 2. `apps/web/src/hooks/useScheduleBlocks.ts`

**Purpose:** CRUD for `schedule_blocks` table.

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScheduleBlock {
  id: string;
  petshop_id: string;
  block_date: string;   // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export function useScheduleBlocks(petshopId: string) {
  // State: blocks[], loading, error
  // fetchBlocks(): SELECT * FROM schedule_blocks WHERE petshop_id = X AND block_date >= today ORDER BY block_date ASC
  // createBlock(data): INSERT { petshop_id, block_date, start_time, end_time, reason }
  //   - Validate: block_date must be >= today
  //   - If start_time is null, end_time must also be null (full day block)
  // deleteBlock(blockId): DELETE by id
  // useEffect: fetch when petshopId changes
  // Return: { blocks, loading, error, createBlock, deleteBlock, refetch }
}
```

### 3. `apps/web/src/app/(dashboard)/agenda/lib/slotGenerator.ts`

**Purpose:** Pure function to generate time slots for calendar visualization. NO database calls.

```typescript
import { Schedule } from '@/hooks/useSchedules';
import { ScheduleBlock } from '@/hooks/useScheduleBlocks';

export interface TimeSlot {
  time: string;       // "HH:MM"
  endTime: string;    // "HH:MM"
  status: 'available' | 'booked' | 'blocked';
  bookingCount: number;
  maxConcurrent: number;
  blockReason?: string;
}

interface Booking {
  start_time: string;
  end_time: string;
  status: string;
}

/**
 * Generate slots for a specific date.
 *
 * @param date - "YYYY-MM-DD"
 * @param schedule - Schedule for that day_of_week (or null if inactive/no schedule)
 * @param blocks - ScheduleBlock[] for that date
 * @param bookings - Booking[] for that date (only active: confirmed, in_progress, pending_payment)
 * @returns TimeSlot[]
 *
 * Logic:
 * 1. If no schedule or schedule.is_active === false → return []
 * 2. Generate slots from start_time to end_time with slot_duration_minutes intervals
 * 3. For each slot:
 *    a. Check if any block overlaps → status = 'blocked', set blockReason
 *    b. Count bookings that overlap this slot time range
 *    c. If bookingCount >= max_concurrent → status = 'booked'
 *    d. Otherwise → status = 'available'
 *
 * Overlap check: slot overlaps if slot.start < block.end AND slot.end > block.start
 * For full-day blocks (start_time/end_time null): always overlaps
 */
export function generateSlotsForDate(
  date: string,
  schedule: Schedule | null,
  blocks: ScheduleBlock[],
  bookings: Booking[]
): TimeSlot[] {
  // Implementation here
}

/**
 * Helper: get day_of_week (0=Sun, 1=Mon...6=Sat) from date string
 */
export function getDayOfWeek(date: string): number {
  return new Date(date + 'T12:00:00').getDay();
}

/**
 * Helper: generate array of dates for a week starting from a given Monday
 */
export function getWeekDates(mondayDate: string): string[] {
  // Returns ["2026-02-23", "2026-02-24", ... "2026-02-28", "2026-03-01"] (Mon-Sat, 6 days)
  // Pet shops typically work Mon-Sat. Sunday excluded by default.
}

/**
 * Helper: add minutes to time string
 * addMinutes("08:00", 60) → "09:00"
 */
export function addMinutes(time: string, minutes: number): string {
  // Implementation
}

/**
 * Helper: compare time strings
 * timeIsBefore("08:00", "09:00") → true
 */
export function timeIsBefore(a: string, b: string): boolean {
  // Implementation
}
```

### 4. `apps/web/src/app/(dashboard)/agenda/components/WeeklyScheduleForm.tsx`

**Purpose:** Form to configure opening hours for each day (Mon-Sat).

```
Props:
  schedules: Schedule[]
  onSave: (day_of_week: number, start_time: string, end_time: string, is_active: boolean) => Promise<void>
  loading: boolean

UI Layout:
  - Title: "Horário de Funcionamento"
  - 6 rows (Seg to Sáb), each row:
    - Toggle switch (is_active) with day label: "Segunda", "Terça", etc.
    - Start time input (type="time") — disabled if inactive
    - "às" text
    - End time input (type="time") — disabled if inactive
    - Save button (per row) — icon only, checkmark
  - Default times if empty: 08:00 - 18:00

Day mapping:
  1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
  (0=Domingo excluded - pet shops don't work Sunday in MVP)

Validation:
  - end_time must be > start_time
  - Show inline error if invalid

Styling: bg-white rounded-lg shadow p-6
Use react-hook-form for individual row forms OR simple useState per row.
```

### 5. `apps/web/src/app/(dashboard)/agenda/components/SlotConfigForm.tsx`

**Purpose:** Configure slot duration and max concurrent bookings (petshop-wide).

```
Props:
  currentDuration: number (default 60)
  currentMaxConcurrent: number (default 1)
  onSave: (duration: number, maxConcurrent: number) => Promise<void>
  loading: boolean

UI Layout:
  - Title: "Configuração de Slots"
  - Duration: radio group with options [30, 45, 60, 90] minutes
  - Max concurrent: number input, min=1, max=5
  - Info text: "Quantos pets podem ser atendidos no mesmo horário?"
  - Save button: "Salvar Configuração"

Styling: bg-white rounded-lg shadow p-6
```

### 6. `apps/web/src/app/(dashboard)/agenda/components/BlockSlotModal.tsx`

**Purpose:** Modal to create a new schedule block.

```
Props:
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { block_date: string, start_time: string | null, end_time: string | null, reason: string }) => Promise<void>
  loading: boolean

UI Layout:
  - Overlay + centered modal (fixed inset-0, bg-black/50, z-50)
  - Title: "Bloquear Horário"
  - Date input (type="date", min=today)
  - Checkbox: "Bloquear dia inteiro" — when checked, hide time inputs
  - Start time input (type="time") — shown if not full day
  - End time input (type="time") — shown if not full day
  - Reason textarea (optional)
  - Buttons: "Cancelar" (outline) + "Bloquear" (red bg)

Validation:
  - Date is required and >= today
  - If not full day: start_time and end_time required, end > start

When "Bloquear dia inteiro" is checked: send start_time=null, end_time=null
```

### 7. `apps/web/src/app/(dashboard)/agenda/components/WeekCalendar.tsx`

**Purpose:** Visual week calendar showing slots with color-coded status.

```
Props:
  schedules: Schedule[]
  blocks: ScheduleBlock[]
  bookings: { booking_date: string, start_time: string, end_time: string, status: string }[]
  weekStart: string  // Monday date "YYYY-MM-DD"

UI Layout:
  - Navigation: "<" [Semana de DD/MM] ">" buttons to change week
  - Grid: columns = Mon-Sat (6 cols), rows = time slots
  - Column headers: "Seg 24/02", "Ter 25/02", etc.
  - Each cell = SlotCell component
  - If no schedule for a day: show "Fechado" in gray

Uses slotGenerator.ts:
  For each day in the week:
  1. Find schedule for that day_of_week
  2. Filter blocks for that date
  3. Filter bookings for that date (only active statuses)
  4. Call generateSlotsForDate() → get TimeSlot[]
  5. Render SlotCell for each slot

Color coding (Tailwind classes):
  - available: bg-green-100 text-green-700 border-green-200
  - booked: bg-blue-100 text-blue-700 border-blue-200
  - blocked: bg-red-100 text-red-700 border-red-200

Styling: bg-white rounded-lg shadow overflow-x-auto
```

### 8. `apps/web/src/app/(dashboard)/agenda/components/SlotCell.tsx`

**Purpose:** Single slot cell in the calendar.

```
Props:
  slot: TimeSlot

UI:
  - Small rectangle (min-h-8)
  - Show time: "08:00"
  - Status indicator:
    - available: "Livre" or "{remaining}/{max}" if partially booked
    - booked: "Lotado"
    - blocked: "Bloqueado" + reason tooltip on hover
  - Color: see WeekCalendar color coding above

Styling: text-xs px-2 py-1 rounded border
```

### 9. `apps/web/src/app/(dashboard)/agenda/page.tsx`

**Purpose:** Main page combining all components. Route: `/dashboard/agenda`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSchedules } from '@/hooks/useSchedules';
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks';
import { WeeklyScheduleForm } from './components/WeeklyScheduleForm';
import { SlotConfigForm } from './components/SlotConfigForm';
import { BlockSlotModal } from './components/BlockSlotModal';
import { WeekCalendar } from './components/WeekCalendar';
import { Calendar, Plus, Settings } from 'lucide-react';

// Page layout:
// 1. Header: "Agenda" title + "Bloquear Horário" button
// 2. Two sections side by side on desktop (grid-cols-1 md:grid-cols-2):
//    Left: WeeklyScheduleForm
//    Right: SlotConfigForm
// 3. Below: Active blocks list (with delete button per block)
// 4. Below: WeekCalendar (full width)

// Auth pattern (same as servicos/page.tsx):
// - useEffect to get session, redirect to /login if no session
// - setPetshopId(session.user.id)

// Week navigation state:
// - weekStart: string (Monday date), initialized to current week's Monday
// - Helper to get current Monday:
//   const today = new Date();
//   const dayOfWeek = today.getDay(); // 0=Sun
//   const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
//   const monday = new Date(today); monday.setDate(today.getDate() + diff);

// Fetch bookings for calendar:
// - When weekStart changes, fetch bookings from Supabase:
//   SELECT booking_date, start_time, end_time, status FROM bookings
//   WHERE petshop_id = X AND booking_date BETWEEN monday AND saturday
//   AND status IN ('pending_payment', 'confirmed', 'in_progress')

// Block modal:
// - State: isBlockModalOpen
// - On submit: call createBlock from useScheduleBlocks
// - Close modal on success

// Active blocks list:
// - Show blocks from useScheduleBlocks (already filtered >= today)
// - Each block: date, time range (or "Dia inteiro"), reason, delete button
// - Format date as DD/MM/YYYY
```

### 10. `supabase/migrations/20260219_002_add_get_available_slots_function.sql`

**Purpose:** RPC function for mobile app to query available slots (used later by IPET-010 booking).

```sql
-- Function: get_available_slots
-- Called by mobile app to get available booking slots for a pet shop on a specific date
-- Returns only truly available slots (respecting schedule, blocks, and existing bookings)

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_petshop_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_start TIME,
  slot_end TIME,
  available_spots INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_slot_start TIME;
  v_slot_end TIME;
  v_booking_count INT;
  v_is_blocked BOOLEAN;
BEGIN
  -- 1. Get schedule for this day of week
  SELECT * INTO v_schedule
  FROM public.schedules
  WHERE petshop_id = p_petshop_id
    AND day_of_week = EXTRACT(DOW FROM p_date)::INT
    AND is_active = TRUE;

  -- If no schedule or inactive, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Generate slots
  v_slot_start := v_schedule.start_time;

  WHILE v_slot_start + (v_schedule.slot_duration_minutes || ' minutes')::INTERVAL <= v_schedule.end_time LOOP
    v_slot_end := v_slot_start + (v_schedule.slot_duration_minutes || ' minutes')::INTERVAL;

    -- 3. Check if blocked
    SELECT EXISTS(
      SELECT 1 FROM public.schedule_blocks
      WHERE petshop_id = p_petshop_id
        AND block_date = p_date
        AND (
          (start_time IS NULL) -- full day block
          OR (start_time < v_slot_end AND end_time > v_slot_start) -- partial overlap
        )
    ) INTO v_is_blocked;

    IF NOT v_is_blocked THEN
      -- 4. Count existing bookings in this slot
      SELECT COUNT(*) INTO v_booking_count
      FROM public.bookings
      WHERE petshop_id = p_petshop_id
        AND booking_date = p_date
        AND start_time < v_slot_end
        AND end_time > v_slot_start
        AND status IN ('pending_payment', 'confirmed', 'in_progress');

      -- 5. Only return if has available spots
      IF v_booking_count < v_schedule.max_concurrent THEN
        slot_start := v_slot_start;
        slot_end := v_slot_end;
        available_spots := v_schedule.max_concurrent - v_booking_count;
        RETURN NEXT;
      END IF;
    END IF;

    v_slot_start := v_slot_end;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (mobile app)
GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE) TO authenticated;
```

## Implementation Order

1. **Hooks first:** `useSchedules.ts` → `useScheduleBlocks.ts`
2. **Slot logic:** `slotGenerator.ts` (pure functions, testable)
3. **Components:** `SlotConfigForm` → `WeeklyScheduleForm` → `BlockSlotModal` → `SlotCell` → `WeekCalendar`
4. **Page:** `agenda/page.tsx` (assembles everything)
5. **Migration:** SQL file for `get_available_slots` RPC

## Validation Rules

| Field | Rule |
|-------|------|
| start_time | Required, valid TIME format |
| end_time | Required, must be > start_time |
| slot_duration_minutes | Must be 30, 45, 60, or 90 |
| max_concurrent | 1-5, integer |
| block_date | Required, >= today |
| block start/end | Both null (full day) OR both filled |

## Testing Checklist

After implementation, verify:
- [ ] Horários seg-sab salvam corretamente no Supabase
- [ ] Toggle ativar/desativar dia funciona
- [ ] Slot config (duração + capacidade) atualiza todos os dias
- [ ] Bloquear horário específico aparece na lista
- [ ] Bloquear dia inteiro funciona (start_time/end_time = null)
- [ ] Deletar bloco funciona
- [ ] Calendário mostra slots com cores corretas (verde/azul/vermelho)
- [ ] Navegação de semana funciona (</>)
- [ ] Dia sem schedule mostra "Fechado"
- [ ] TypeScript compila sem erros: `npx tsc --noEmit`

## Git Commit

After all files pass validation:
```bash
git add apps/web/src/hooks/useSchedules.ts apps/web/src/hooks/useScheduleBlocks.ts apps/web/src/app/\(dashboard\)/agenda/ supabase/migrations/20260219_002_add_get_available_slots_function.sql
git commit -m "feat: implement schedule management IPET-008

- Weekly schedule form (Mon-Sat) with time config
- Slot configuration (duration: 30/45/60/90, concurrent: 1-5)
- Block slots (specific time or full day)
- Week calendar with color-coded slots (available/booked/blocked)
- RPC function get_available_slots for mobile app
- Hooks: useSchedules, useScheduleBlocks"
```

## Important Notes

- Follow EXACT same patterns as existing hooks (`useServices.ts`) and pages (`servicos/page.tsx`)
- Import supabase from `@/lib/supabase` (NOT from `@supabase/supabase-js`)
- Use `'use client'` directive on all page/component files
- Use Lucide React for icons (Calendar, Plus, Settings, Trash2, ChevronLeft, ChevronRight)
- Tailwind for all styling, no CSS files
- Navigation already configured in Sidebar: `/dashboard/agenda` route exists
- Dates in Brazilian format for display: DD/MM/YYYY
- Times in 24h format: HH:MM
