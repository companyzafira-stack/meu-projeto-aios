'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useServices } from '@/hooks/useServices';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface FormData {
  name: string;
  description: string;
  category: 'banho' | 'tosa' | 'combo' | 'addon';
  duration_minutes: number;
  is_addon: boolean;
  priceP: string;
  priceM: string;
  priceG: string;
  priceGG: string;
}

export default function NovoServicoPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      is_addon: false,
      category: 'banho',
      duration_minutes: 30,
    },
  });

  const [petshopId, setPetshopId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createService } = useServices(petshopId);

  const category = watch('category');

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // TODO: Get actual petshop_id from profile
      setPetshopId(session.user.id);
    };

    getUser();
  }, [router]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');

    try {
      // Validate at least one price is filled
      const prices = [
        { size: 'P' as const, price: data.priceP },
        { size: 'M' as const, price: data.priceM },
        { size: 'G' as const, price: data.priceG },
        { size: 'GG' as const, price: data.priceGG },
      ].filter((p) => p.price && parseFloat(p.price) > 0);

      if (prices.length === 0) {
        setError('Preencha o preço para pelo menos um porte');
        setLoading(false);
        return;
      }

      // Create service
      await createService(
        {
          name: data.name,
          description: data.description || null,
          category: data.category,
          duration_minutes: data.duration_minutes,
          is_addon: data.is_addon,
          is_active: true,
        },
        prices.map((p) => ({
          size: p.size,
          price: parseFloat(p.price),
        }))
      );

      router.push('/dashboard/servicos');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao criar serviço'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <Link
        href="/dashboard/servicos"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={20} />
        Voltar
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Novo Serviço</h1>
        <p className="text-gray-600">Configure um novo serviço para seu pet shop</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Serviço *
          </label>
          <input
            type="text"
            {...register('name', { required: 'Nome é obrigatório' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: Banho Completo"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            {...register('description')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Descrição do serviço (opcional)"
            rows={3}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria *
          </label>
          <select
            {...register('category')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="banho">🛁 Banho</option>
            <option value="tosa">✂️ Tosa</option>
            <option value="combo">🎁 Combo (Banho + Tosa)</option>
            <option value="addon">➕ Add-on</option>
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duração (minutos) *
          </label>
          <input
            type="number"
            {...register('duration_minutes', {
              required: 'Duração é obrigatória',
              min: { value: 1, message: 'Duração deve ser maior que 0' },
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: 30"
          />
          {errors.duration_minutes && (
            <p className="text-red-500 text-sm mt-1">
              {errors.duration_minutes.message}
            </p>
          )}
        </div>

        {/* Is Add-on */}
        {category === 'addon' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('is_addon')}
              className="rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              É um serviço adicional (add-on)
            </label>
          </div>
        )}

        {/* Prices */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preços por Porte
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Preencha o preço para pelo menos um porte
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porte P
              </label>
              <input
                type="number"
                step="0.01"
                {...register('priceP')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porte M
              </label>
              <input
                type="number"
                step="0.01"
                {...register('priceM')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porte G
              </label>
              <input
                type="number"
                step="0.01"
                {...register('priceG')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porte GG
              </label>
              <input
                type="number"
                step="0.01"
                {...register('priceGG')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="R$ 0,00"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 border-t pt-6">
          <Link
            href="/dashboard/servicos"
            className="flex-1 text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
          >
            {loading ? 'Salvando...' : 'Criar Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
}
