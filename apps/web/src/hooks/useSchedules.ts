import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Schedule {
  id: string;
  petshop_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_concurrent: number;
  is_active: boolean;
}

interface UpsertScheduleInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
}

function normalizeTime(time: string): string {
  const trimmed = time.trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  throw new Error('Horário inválido. Use o formato HH:MM');
}

export function useSchedules(petshopId: string) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedules = async () => {
    if (!petshopId) {
      setSchedules([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('schedules')
        .select('*')
        .eq('petshop_id', petshopId)
        .order('day_of_week', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setSchedules((data ?? []) as Schedule[]);
    } catch {
      setError('Erro ao buscar horários de funcionamento');
    } finally {
      setLoading(false);
    }
  };

  const upsertSchedule = async (scheduleData: UpsertScheduleInput) => {
    if (!petshopId) {
      throw new Error('Pet shop não identificado');
    }

    if (scheduleData.day_of_week < 0 || scheduleData.day_of_week > 6) {
      throw new Error('Dia da semana inválido');
    }

    const normalizedStart = normalizeTime(scheduleData.start_time);
    const normalizedEnd = normalizeTime(scheduleData.end_time);

    if (timeToMinutes(normalizedEnd) <= timeToMinutes(normalizedStart)) {
      throw new Error('Horário final deve ser maior que o inicial');
    }

    try {
      setError('');

      const existingDaySchedule = schedules.find(
        (schedule) => schedule.day_of_week === scheduleData.day_of_week
      );
      const configSource = existingDaySchedule ?? schedules[0];

      const { error: upsertError } = await supabase.from('schedules').upsert(
        {
          petshop_id: petshopId,
          day_of_week: scheduleData.day_of_week,
          start_time: normalizedStart,
          end_time: normalizedEnd,
          slot_duration_minutes: configSource?.slot_duration_minutes ?? 60,
          max_concurrent: configSource?.max_concurrent ?? 1,
          is_active: scheduleData.is_active,
        },
        {
          onConflict: 'petshop_id,day_of_week',
        }
      );

      if (upsertError) {
        throw upsertError;
      }

      await fetchSchedules();
    } catch {
      setError('Erro ao salvar horário de funcionamento');
      throw new Error('Erro ao salvar horário de funcionamento');
    }
  };

  const toggleDay = async (scheduleId: string, isActive: boolean) => {
    try {
      setError('');

      const { error: updateError } = await supabase
        .from('schedules')
        .update({ is_active: isActive })
        .eq('id', scheduleId);

      if (updateError) {
        throw updateError;
      }

      await fetchSchedules();
    } catch {
      setError('Erro ao atualizar status do dia');
      throw new Error('Erro ao atualizar status do dia');
    }
  };

  const updateSlotConfig = async (
    targetPetshopId: string,
    duration: number,
    maxConcurrent: number
  ) => {
    if (!targetPetshopId) {
      throw new Error('Pet shop não identificado');
    }

    if (![30, 45, 60, 90].includes(duration)) {
      throw new Error('Duração de slot inválida');
    }

    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 5) {
      throw new Error('Capacidade máxima inválida');
    }

    try {
      setError('');

      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          slot_duration_minutes: duration,
          max_concurrent: maxConcurrent,
        })
        .eq('petshop_id', targetPetshopId);

      if (updateError) {
        throw updateError;
      }

      await fetchSchedules();
    } catch {
      setError('Erro ao salvar configuração de slots');
      throw new Error('Erro ao salvar configuração de slots');
    }
  };

  useEffect(() => {
    if (petshopId) {
      fetchSchedules();
      return;
    }

    setSchedules([]);
  }, [petshopId]);

  return {
    schedules,
    loading,
    error,
    upsertSchedule,
    toggleDay,
    updateSlotConfig,
    refetch: fetchSchedules,
  };
}
