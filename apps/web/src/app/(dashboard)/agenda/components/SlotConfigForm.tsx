'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface SlotConfigFormProps {
  currentDuration: number;
  currentMaxConcurrent: number;
  onSave: (duration: number, maxConcurrent: number) => Promise<void>;
  loading: boolean;
}

interface SlotConfigFormData {
  duration: number;
  maxConcurrent: number;
}

const DURATION_OPTIONS = [30, 45, 60, 90] as const;

export function SlotConfigForm({
  currentDuration,
  currentMaxConcurrent,
  onSave,
  loading,
}: SlotConfigFormProps) {
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SlotConfigFormData>({
    defaultValues: {
      duration: currentDuration,
      maxConcurrent: currentMaxConcurrent,
    },
  });

  useEffect(() => {
    setValue('duration', currentDuration);
    setValue('maxConcurrent', currentMaxConcurrent);
  }, [currentDuration, currentMaxConcurrent, setValue]);

  const handleSave = async (data: SlotConfigFormData) => {
    setSubmitError('');

    try {
      await onSave(data.duration, data.maxConcurrent);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Erro ao salvar configuração'
      );
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Configuração de Slots</h2>
        <p className="text-sm text-gray-600 mt-1">
          Ajuste a duração dos horários e a capacidade simultânea.
        </p>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Duração do slot</p>
          <div className="grid grid-cols-2 gap-3">
            {DURATION_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  value={option}
                  {...register('duration', {
                    valueAsNumber: true,
                    validate: (value) =>
                      DURATION_OPTIONS.includes(value as (typeof DURATION_OPTIONS)[number]) ||
                      'Selecione uma duração válida',
                  })}
                  disabled={loading}
                  className="text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-800">{option} minutos</span>
              </label>
            ))}
          </div>
          {errors.duration && (
            <p className="text-sm text-red-600 mt-2">{errors.duration.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capacidade simultânea (pets)
          </label>
          <input
            type="number"
            min={1}
            max={5}
            {...register('maxConcurrent', {
              valueAsNumber: true,
              required: 'Informe a capacidade máxima',
              min: { value: 1, message: 'Mínimo de 1 pet por horário' },
              max: { value: 5, message: 'Máximo de 5 pets por horário' },
              validate: (value) =>
                Number.isInteger(value) || 'Use um número inteiro',
            })}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
          />
          <p className="text-sm text-gray-600 mt-2">
            Quantos pets podem ser atendidos no mesmo horário?
          </p>
          {errors.maxConcurrent && (
            <p className="text-sm text-red-600 mt-2">
              {errors.maxConcurrent.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Salvar Configuração
        </button>

        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}
      </form>
    </section>
  );
}
