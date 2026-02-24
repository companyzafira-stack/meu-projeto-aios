import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScheduleBlock {
  id: string;
  petshop_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

interface CreateScheduleBlockInput {
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason?: string | null;
}

function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTime(time: string | null): string | null {
  if (time === null) {
    return null;
  }

  const trimmed = time.trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  throw new Error('Horário inválido. Use o formato HH:MM');
}

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function useScheduleBlocks(petshopId: string) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBlocks = async () => {
    if (!petshopId) {
      setBlocks([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const today = getTodayLocalDate();

      const { data, error: fetchError } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('petshop_id', petshopId)
        .gte('block_date', today)
        .order('block_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setBlocks((data ?? []) as ScheduleBlock[]);
    } catch {
      setError('Erro ao buscar bloqueios de agenda');
    } finally {
      setLoading(false);
    }
  };

  const createBlock = async (blockData: CreateScheduleBlockInput) => {
    if (!petshopId) {
      throw new Error('Pet shop não identificado');
    }

    const today = getTodayLocalDate();

    if (!blockData.block_date || blockData.block_date < today) {
      throw new Error('A data do bloqueio deve ser hoje ou futura');
    }

    const normalizedStart = normalizeTime(blockData.start_time);
    const normalizedEnd = normalizeTime(blockData.end_time);

    const isFullDayBlock = normalizedStart === null && normalizedEnd === null;

    if (!isFullDayBlock && (normalizedStart === null || normalizedEnd === null)) {
      throw new Error('Informe início e fim do bloqueio ou bloqueie o dia inteiro');
    }

    if (normalizedStart && normalizedEnd) {
      if (timeToMinutes(normalizedEnd) <= timeToMinutes(normalizedStart)) {
        throw new Error('Horário final deve ser maior que o inicial');
      }
    }

    try {
      setError('');

      const { error: insertError } = await supabase.from('schedule_blocks').insert({
        petshop_id: petshopId,
        block_date: blockData.block_date,
        start_time: normalizedStart,
        end_time: normalizedEnd,
        reason: blockData.reason?.trim() ? blockData.reason.trim() : null,
      });

      if (insertError) {
        throw insertError;
      }

      await fetchBlocks();
    } catch {
      setError('Erro ao criar bloqueio de agenda');
      throw new Error('Erro ao criar bloqueio de agenda');
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      setError('');

      const { error: deleteError } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', blockId);

      if (deleteError) {
        throw deleteError;
      }

      await fetchBlocks();
    } catch {
      setError('Erro ao deletar bloqueio de agenda');
      throw new Error('Erro ao deletar bloqueio de agenda');
    }
  };

  useEffect(() => {
    if (petshopId) {
      fetchBlocks();
      return;
    }

    setBlocks([]);
  }, [petshopId]);

  return {
    blocks,
    loading,
    error,
    createBlock,
    deleteBlock,
    refetch: fetchBlocks,
  };
}
