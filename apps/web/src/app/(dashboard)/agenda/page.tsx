'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSchedules } from '@/hooks/useSchedules';
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks';
import { WeeklyScheduleForm } from './components/WeeklyScheduleForm';
import { SlotConfigForm } from './components/SlotConfigForm';
import { BlockSlotModal } from './components/BlockSlotModal';
import { WeekCalendar } from './components/WeekCalendar';
import { getWeekDates } from './lib/slotGenerator';

interface CalendarBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const ACTIVE_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'in_progress',
] as const;

function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMondayDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return formatDateToIso(monday);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateToIso(date);
}

function formatDateBr(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}/${month}/${year}`;
}

function formatTime(time: string | null): string {
  if (!time) {
    return '';
  }

  return time.slice(0, 5);
}

function formatBlockTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) {
    return 'Dia inteiro';
  }

  return `${formatTime(startTime)} às ${formatTime(endTime)}`;
}

export default function AgendaPage() {
  const router = useRouter();
  const [petshopId, setPetshopId] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<string>(() => getCurrentMondayDate());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const {
    schedules,
    loading: schedulesLoading,
    error: schedulesError,
    upsertSchedule,
    updateSlotConfig,
  } = useSchedules(petshopId);

  const {
    blocks,
    loading: blocksLoading,
    error: blocksError,
    createBlock,
    deleteBlock,
  } = useScheduleBlocks(petshopId);

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      setAuthLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        setAuthLoading(false);
        router.push('/login');
        return;
      }

      setPetshopId(session.user.id);
      setAuthLoading(false);
    };

    getUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!petshopId) {
      setBookings([]);
      return;
    }

    let isMounted = true;

    const fetchBookings = async () => {
      setBookingsLoading(true);
      setBookingsError('');

      try {
        const weekDates = getWeekDates(weekStart);
        const weekEnd = weekDates[weekDates.length - 1] ?? weekStart;

        const { data, error } = await supabase
          .from('bookings')
          .select('booking_date, start_time, end_time, status')
          .eq('petshop_id', petshopId)
          .gte('booking_date', weekStart)
          .lte('booking_date', weekEnd)
          .in('status', [...ACTIVE_BOOKING_STATUSES])
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setBookings((data ?? []) as CalendarBooking[]);
      } catch {
        if (!isMounted) {
          return;
        }

        setBookingsError('Erro ao buscar agendamentos da semana');
      } finally {
        if (isMounted) {
          setBookingsLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      isMounted = false;
    };
  }, [petshopId, weekStart]);

  const slotConfigSource = schedules[0];
  const slotConfig = {
    duration: slotConfigSource?.slot_duration_minutes ?? 60,
    maxConcurrent: slotConfigSource?.max_concurrent ?? 1,
  };

  const isPageLoading = authLoading;
  const formsLoading = isPageLoading || schedulesLoading || blocksLoading;
  const calendarLoading = isPageLoading || schedulesLoading || blocksLoading || bookingsLoading;

  const handleSaveSchedule = async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isActive: boolean
  ) => {
    await upsertSchedule({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_active: isActive,
    });
  };

  const handleSaveSlotConfig = async (duration: number, maxConcurrent: number) => {
    if (!petshopId) {
      throw new Error('Pet shop não identificado');
    }

    await updateSlotConfig(petshopId, duration, maxConcurrent);
  };

  const handleCreateBlock = async (data: {
    block_date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string;
  }) => {
    await createBlock(data);
    setIsBlockModalOpen(false);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Deseja remover este bloqueio?')) {
      return;
    }

    try {
      await deleteBlock(blockId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao remover bloqueio');
    }
  };

  const handlePreviousWeek = () => {
    setWeekStart((current) => addDays(current, -7));
  };

  const handleNextWeek = () => {
    setWeekStart((current) => addDays(current, 7));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-700 mb-1">
            <Calendar size={20} />
            <span className="text-sm font-medium">Gestão de Agenda</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">
            Configure horários, bloqueios e visualize a ocupação semanal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsBlockModalOpen(true)}
          disabled={!petshopId || isPageLoading}
          className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Bloquear Horário
        </button>
      </div>

      {(schedulesError || blocksError || bookingsError) && (
        <div className="space-y-2">
          {schedulesError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {schedulesError}
            </div>
          )}
          {blocksError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {blocksError}
            </div>
          )}
          {bookingsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {bookingsError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar size={16} />
            <span className="text-sm font-semibold">Horários semanais</span>
          </div>
          <WeeklyScheduleForm
            schedules={schedules}
            onSave={handleSaveSchedule}
            loading={formsLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-700">
            <Settings size={16} />
            <span className="text-sm font-semibold">Capacidade de atendimento</span>
          </div>
          <SlotConfigForm
            currentDuration={slotConfig.duration}
            currentMaxConcurrent={slotConfig.maxConcurrent}
            onSave={handleSaveSlotConfig}
            loading={formsLoading}
          />
        </div>
      </div>

      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bloqueios Ativos</h2>
            <p className="text-sm text-gray-600">
              Bloqueios a partir de hoje ({formatDateBr(formatDateToIso(new Date()))})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsBlockModalOpen(true)}
            disabled={!petshopId || isPageLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Novo Bloqueio
          </button>
        </div>

        {blocksLoading && !blocks.length ? (
          <p className="text-gray-600">Carregando bloqueios...</p>
        ) : blocks.length === 0 ? (
          <p className="text-gray-600">Nenhum bloqueio cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatDateBr(block.block_date)} •{' '}
                    {formatBlockTimeRange(block.start_time, block.end_time)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {block.reason?.trim() || 'Sem motivo informado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 transition"
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <WeekCalendar
        schedules={schedules}
        blocks={blocks}
        bookings={bookings}
        weekStart={weekStart}
        loading={calendarLoading}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
      />

      <BlockSlotModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSubmit={handleCreateBlock}
        loading={blocksLoading}
      />
    </div>
  );
}
