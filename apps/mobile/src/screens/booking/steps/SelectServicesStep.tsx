import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useBooking } from '../context/BookingContext';

interface ServicePriceRow {
  size: string;
  price: number | string;
}

interface PetShopServiceRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  is_addon: boolean;
  service_prices: ServicePriceRow[] | null;
}

function parsePrice(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPriceBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function getServicePriceForPet(service: PetShopServiceRow, petSize: string): number | null {
  const priceRow = service.service_prices?.find((price) => price.size === petSize);
  if (!priceRow) {
    return null;
  }

  return parsePrice(priceRow.price);
}

interface ServiceOptionCardProps {
  service: PetShopServiceRow;
  price: number | null;
  selected: boolean;
  mode: 'radio' | 'checkbox';
  onPress: () => void;
}

const ServiceOptionCard: React.FC<ServiceOptionCardProps> = ({
  service,
  price,
  selected,
  mode,
  onPress,
}) => {
  const isUnavailable = price === null;

  return (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        selected ? styles.serviceCardSelected : styles.serviceCardUnselected,
        isUnavailable ? styles.serviceCardDisabled : null,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isUnavailable}
    >
      <View
        style={[
          mode === 'radio' ? styles.radioCircle : styles.checkboxCircle,
          selected ? styles.selectorSelected : styles.selectorUnselected,
        ]}
      >
        {selected ? <Text style={styles.selectorCheck}>✓</Text> : null}
      </View>

      <View style={styles.serviceCardContent}>
        <View style={styles.serviceCardHeader}>
          <View style={styles.serviceCardLeft}>
            <Text style={styles.serviceName}>{service.name}</Text>
            {service.description ? (
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {service.description}
              </Text>
            ) : null}
            <Text style={styles.serviceDuration}>⏱ {service.duration_minutes} min</Text>
          </View>
          <View style={styles.serviceCardRight}>
            <Text
              style={[
                styles.servicePrice,
                isUnavailable ? styles.unavailablePrice : null,
              ]}
            >
              {isUnavailable ? 'Indisponível' : formatPriceBRL(price)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const SelectServicesStep: React.FC = () => {
  const { state, dispatch } = useBooking();

  const { data, isLoading, error } = useQuery<PetShopServiceRow[], Error>({
    queryKey: ['petshop-services', state.petshopId],
    queryFn: async () => {
      const { data: serviceRows, error: serviceError } = await supabase
        .from('services')
        .select(
          'id, name, description, category, duration_minutes, is_addon, service_prices(size, price)'
        )
        .eq('petshop_id', state.petshopId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (serviceError) {
        throw serviceError;
      }

      return (serviceRows ?? []) as PetShopServiceRow[];
    },
    enabled: Boolean(state.petshopId),
    staleTime: 5 * 60 * 1000,
  });

  const services = data ?? [];
  const mainServices = services.filter((service) => !service.is_addon);
  const addonServices = services.filter((service) => service.is_addon);

  const hasMainServiceForEveryPet =
    state.selectedPets.length > 0 &&
    state.selectedPets.every((pet) =>
      state.selectedServices.some((service) => service.petId === pet.id)
    );

  const canContinue = hasMainServiceForEveryPet;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Escolha os serviços</Text>
          <Text style={styles.subtitle}>
            Selecione um serviço principal para cada pet e adicionais opcionais.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.infoText}>{error.message}</Text>
          </View>
        ) : state.selectedPets.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.infoText}>Selecione pelo menos um pet para continuar.</Text>
          </View>
        ) : (
          state.selectedPets.map((pet) => {
            const selectedMainService = state.selectedServices.find(
              (service) => service.petId === pet.id
            );
            const selectedAddonIds = new Set(
              state.selectedAddons
                .filter((addon) => addon.petId === pet.id)
                .map((addon) => addon.serviceId)
            );

            return (
              <View key={pet.id} style={styles.petSection}>
                <View style={styles.petHeaderCard}>
                  {pet.photo_url ? (
                    <Image source={{ uri: pet.photo_url }} style={styles.petHeaderPhoto} />
                  ) : (
                    <View style={[styles.petHeaderPhoto, styles.petHeaderPlaceholder]}>
                      <Text style={styles.petHeaderPlaceholderText}>🐾</Text>
                    </View>
                  )}
                  <View style={styles.petHeaderInfo}>
                    <Text style={styles.petHeaderName}>{pet.name}</Text>
                    <View style={styles.sizeBadge}>
                      <Text style={styles.sizeBadgeText}>Porte {pet.size}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Serviço principal:</Text>

                {mainServices.length === 0 ? (
                  <Text style={styles.noServicesText}>
                    Nenhum serviço principal disponível.
                  </Text>
                ) : (
                  mainServices.map((service) => {
                    const price = getServicePriceForPet(service, pet.size);
                    const isSelected = selectedMainService?.serviceId === service.id;

                    return (
                      <ServiceOptionCard
                        key={`${pet.id}-${service.id}`}
                        service={service}
                        price={price}
                        selected={isSelected}
                        mode="radio"
                        onPress={() => {
                          if (price === null) {
                            return;
                          }

                          dispatch({
                            type: 'SET_SERVICE',
                            petId: pet.id,
                            service: {
                              serviceId: service.id,
                              serviceName: service.name,
                              category: service.category,
                              price,
                              duration_minutes: service.duration_minutes,
                            },
                          });
                        }}
                      />
                    );
                  })
                )}

                {addonServices.length > 0 ? (
                  <>
                    <View style={styles.separator} />
                    <Text style={styles.sectionLabel}>Adicionais (opcional):</Text>
                    {addonServices.map((service) => {
                      const price = getServicePriceForPet(service, pet.size);
                      const isSelected = selectedAddonIds.has(service.id);

                      return (
                        <ServiceOptionCard
                          key={`${pet.id}-addon-${service.id}`}
                          service={service}
                          price={price}
                          selected={isSelected}
                          mode="checkbox"
                          onPress={() => {
                            if (price === null) {
                              return;
                            }

                            dispatch({
                              type: 'TOGGLE_ADDON',
                              petId: pet.id,
                              addon: {
                                serviceId: service.id,
                                serviceName: service.name,
                                price,
                                duration_minutes: service.duration_minutes,
                              },
                            });
                          }}
                        />
                      );
                    })}
                  </>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!canContinue && state.selectedPets.length > 0 ? (
          <Text style={styles.validationText}>Selecione um serviço para cada pet</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          disabled={!canContinue}
          onPress={() => dispatch({ type: 'NEXT_STEP' })}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    lineHeight: 20,
  },
  centerContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  petSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  petHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  petHeaderPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
  },
  petHeaderPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petHeaderPlaceholderText: {
    fontSize: 20,
  },
  petHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  petHeaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  sizeBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sizeBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  noServicesText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  serviceCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  serviceCardUnselected: {
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  serviceCardDisabled: {
    opacity: 0.55,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectorSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  selectorUnselected: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  selectorCheck: {
    fontSize: 10,
    lineHeight: 11,
    color: '#fff',
    fontWeight: '700',
  },
  serviceCardContent: {
    flex: 1,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceCardLeft: {
    flex: 1,
    paddingRight: 8,
  },
  serviceCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 90,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    lineHeight: 16,
  },
  serviceDuration: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
    textAlign: 'right',
  },
  unavailablePrice: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginTop: 6,
    marginBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  validationText: {
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 8,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
