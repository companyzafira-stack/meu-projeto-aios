'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { Schedule } from '@/hooks/useSchedules';

interface WeeklyScheduleFormProps {
  schedules: Schedule[];
  onSave: (
    day_of_week: number,
    start_time: string,
    end_time: string,
    is_active: boolean
  ) => Promise<void>;
  loading: boolean;
}

interface DayDraft {
  is_active: boolean;
  start_time: string;
  end_time: string;
}

const DAY_ROWS = [
  { dayOfWeek: 1, shortLabel: 'Seg', label: 'Segunda' },
  { dayOfWeek: 2, shortLabel: 'Ter', label: 'Terça' },
  { dayOfWeek: 3, shortLabel: 'Qua', label: 'Quarta' },
  { dayOfWeek: 4, shortLabel: 'Qui', label: 'Quinta' },
  { dayOfWeek: 5, shortLabel: 'Sex', label: 'Sexta' },
  { dayOfWeek: 6, shortLabel: 'Sáb', label: 'Sábado' },
] as const;

function getDefaultDraft(schedule?: Schedule): DayDraft {
  return {
    is_active: schedule?.is_active ?? false,
    start_time: schedule?.start_time?.slice(0, 5) ?? '08:00',
    end_time: schedule?.end_time?.slice(0, 5) ?? '18:00',
  };
}

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function WeeklyScheduleForm({
  schedules,
  onSave,
  loading,
}: WeeklyScheduleFormProps) {
  const [drafts, setDrafts] = useState<Record<number, DayDraft>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [savingDay, setSavingDay] = useState<number | null>(null);

  useEffect(() => {
    const nextDrafts: Record<number, DayDraft> = {};

    for (const day of DAY_ROWS) {
      const schedule = schedules.find(
        (item) => item.day_of_week === day.dayOfWeek
      );
      nextDrafts[day.dayOfWeek] = getDefaultDraft(schedule);
    }

    setDrafts(nextDrafts);
  }, [schedules]);

  const handleFieldChange = (
    dayOfWeek: number,
    field: keyof DayDraft,
    value: string | boolean
  ) => {
    setDrafts((current) => ({
      ...current,
      [dayOfWeek]: {
        ...(current[dayOfWeek] ?? getDefaultDraft()),
        [field]: value,
      },
    }));

    setErrors((current) => {
      if (!current[dayOfWeek]) {
        return current;
      }

      const next = { ...current };
      delete next[dayOfWeek];
      return next;
    });
  };

  const handleSaveDay = async (dayOfWeek: number) => {
    const draft = drafts[dayOfWeek] ?? getDefaultDraft();

    if (
      draft.is_active &&
      timeToMinutes(draft.end_time) <= timeToMinutes(draft.start_time)
    ) {
      setErrors((current) => ({
        ...current,
        [dayOfWeek]: 'Horário final deve ser maior que o inicial',
      }));
      return;
    }

    setSavingDay(dayOfWeek);

    try {
      await onSave(
        dayOfWeek,
        draft.start_time,
        draft.end_time,
        draft.is_active
      );
      setErrors((current) => {
        if (!current[dayOfWeek]) {
          return current;
        }

        const next = { ...current };
        delete next[dayOfWeek];
        return next;
      });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [dayOfWeek]:
          error instanceof Error ? error.message : 'Erro ao salvar horário',
      }));
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Horário de Funcionamento
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure os horários de atendimento de segunda a sábado.
        </p>
      </div>

      <div className="space-y-3">
        {DAY_ROWS.map((day) => {
          const draft = drafts[day.dayOfWeek] ?? getDefaultDraft();
          const rowLoading = loading || savingDay === day.dayOfWeek;

          return (
            <div
              key={day.dayOfWeek}
              className="border rounded-lg p-3 bg-gray-50/60"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 min-w-[140px]">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(event) =>
                        handleFieldChange(
                          day.dayOfWeek,
                          'is_active',
                          event.target.checked
                        )
                      }
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <span className="w-10 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition" />
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4" />
                  </label>
                  <div>
                    <p className="font-semibold text-gray-900">{day.label}</p>
                    <p className="text-xs text-gray-500">{day.shortLabel}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 md:flex-1 md:justify-end">
                  <input
                    type="time"
                    value={draft.start_time}
                    onChange={(event) =>
                      handleFieldChange(
                        day.dayOfWeek,
                        'start_time',
                        event.target.value
                      )
                    }
                    disabled={!draft.is_active || loading}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="text-sm text-gray-600 hidden md:inline">às</span>
                  <input
                    type="time"
                    value={draft.end_time}
                    onChange={(event) =>
                      handleFieldChange(
                        day.dayOfWeek,
                        'end_time',
                        event.target.value
                      )
                    }
                    disabled={!draft.is_active || loading}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveDay(day.dayOfWeek)}
                    disabled={rowLoading}
                    aria-label={`Salvar horário de ${day.label}`}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    <Check size={18} />
                  </button>
                </div>
              </div>

              {errors[day.dayOfWeek] && (
                <p className="mt-2 text-sm text-red-600">{errors[day.dayOfWeek]}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
