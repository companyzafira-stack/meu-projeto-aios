'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useServices } from '@/hooks/useServices';
import { useMultiPetDiscount } from '@/hooks/useMultiPetDiscount';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

export default function ServicosPage() {
  const router = useRouter();
  const [petshopId, setPetshopId] = useState<string>('');
  const { services, loading, deleteService, toggleService } = useServices(petshopId);
  const { discounts } = useMultiPetDiscount(petshopId);

  // Get current user and fetch petshop
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // For now, use a placeholder - TODO: Get actual petshop_id from user profile
      setPetshopId(session.user.id);
    };

    getUser();
  }, [router]);

  const handleToggle = async (serviceId: string, isActive: boolean) => {
    try {
      await toggleService(serviceId, !isActive);
    } catch (error) {
      console.error('Erro ao desativar serviço:', error);
    }
  };

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (confirm(`Deseja deletar "${serviceName}"?`)) {
      try {
        await deleteService(serviceId);
      } catch (error) {
        alert(
          error instanceof Error ? error.message : 'Erro ao deletar serviço'
        );
      }
    }
  };

  const categoryLabel = {
    banho: '🛁 Banho',
    tosa: '✂️ Tosa',
    combo: '🎁 Combo',
    addon: '➕ Add-on',
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-600">Gerencie seu catálogo de serviços</p>
        </div>
        <Link
          href="/servicos/novo"
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          <Plus size={20} />
          Novo Serviço
        </Link>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">Carregando serviços...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">Nenhum serviço cadastrado ainda.</p>
            <Link
              href="/servicos/novo"
              className="text-red-500 hover:text-red-600 font-semibold"
            >
              Criar primeiro serviço
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Duração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Preços
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {service.name}
                        </p>
                        {service.description && (
                          <p className="text-sm text-gray-600">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {categoryLabel[service.category]}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {service.duration_minutes} min
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {['P', 'M', 'G', 'GG'].map((size) => {
                          const price = service.service_prices.find(
                            (p) => p.size === size
                          );
                          return (
                            <span
                              key={size}
                              className="text-xs bg-gray-100 px-2 py-1 rounded"
                            >
                              {size}: {price ? `R$ ${(price.price / 100).toFixed(2)}` : '-'}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleToggle(service.id, service.is_active)
                        }
                        className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                          service.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {service.is_active ? (
                          <>
                            <Eye size={16} /> Ativo
                          </>
                        ) : (
                          <>
                            <EyeOff size={16} /> Inativo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/servicos/${service.id}`}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-pet Discounts Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Desconto Multi-pet</h2>
        <p className="text-gray-600 mb-4">
          Configure descontos automáticos quando o tutor agendar múltiplos pets
        </p>
        {discounts.length === 0 ? (
          <p className="text-gray-600">Nenhum desconto configurado.</p>
        ) : (
          <div className="space-y-2">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <span className="font-semibold">
                  {discount.min_pets}+ pets: {discount.discount_percent}% desconto
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
