'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface BlockSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    block_date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string;
  }) => Promise<void>;
  loading: boolean;
}

interface BlockSlotFormData {
  block_date: string;
  full_day: boolean;
  start_time: string;
  end_time: string;
  reason: string;
}

function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function BlockSlotModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: BlockSlotModalProps) {
  const today = getTodayLocalDate();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<BlockSlotFormData>({
    defaultValues: {
      block_date: today,
      full_day: false,
      start_time: '08:00',
      end_time: '09:00',
      reason: '',
    },
  });

  const isFullDay = watch('full_day');

  useEffect(() => {
    if (!isOpen) {
      setSubmitError('');
      return;
    }

    setSubmitError('');
    reset({
      block_date: getTodayLocalDate(),
      full_day: false,
      start_time: '08:00',
      end_time: '09:00',
      reason: '',
    });
  }, [isOpen, reset]);

  const handleFormSubmit = async (data: BlockSlotFormData) => {
    clearErrors();
    setSubmitError('');

    const currentToday = getTodayLocalDate();

    if (!data.block_date) {
      setError('block_date', { message: 'Data é obrigatória' });
      return;
    }

    if (data.block_date < currentToday) {
      setError('block_date', {
        message: 'A data deve ser hoje ou futura',
      });
      return;
    }

    if (!data.full_day) {
      if (!data.start_time) {
        setError('start_time', { message: 'Informe o horário inicial' });
        return;
      }

      if (!data.end_time) {
        setError('end_time', { message: 'Informe o horário final' });
        return;
      }

      if (timeToMinutes(data.end_time) <= timeToMinutes(data.start_time)) {
        setError('end_time', {
          message: 'Horário final deve ser maior que o inicial',
        });
        return;
      }
    }

    try {
      await onSubmit({
        block_date: data.block_date,
        start_time: data.full_day ? null : data.start_time,
        end_time: data.full_day ? null : data.end_time,
        reason: data.reason.trim(),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Erro ao criar bloqueio'
      );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-slot-modal-title"
      >
        <div className="mb-4">
          <h2 id="block-slot-modal-title" className="text-xl font-bold text-gray-900">
            Bloquear Horário
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Bloqueie um horário específico ou o dia inteiro.
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              min={today}
              {...register('block_date', {
                required: 'Data é obrigatória',
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {errors.block_date && (
              <p className="text-sm text-red-600 mt-1">
                {errors.block_date.message}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              {...register('full_day')}
              className="rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            Bloquear dia inteiro
          </label>

          {!isFullDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início
                </label>
                <input
                  type="time"
                  {...register('start_time')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {errors.start_time && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.start_time.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim
                </label>
                <input
                  type="time"
                  {...register('end_time')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {errors.end_time && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.end_time.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo (opcional)
            </label>
            <textarea
              rows={3}
              {...register('reason')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Ex: Manutenção, feriado, equipe reduzida"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Bloquear
            </button>
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
