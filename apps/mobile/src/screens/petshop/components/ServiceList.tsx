import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Service } from '@/hooks/usePetShopProfile';
import { ServiceCard } from './ServiceCard';

interface ServiceListProps {
  services: Service[];
  userPetSizes: string[];
}

type ServiceCategory = 'banho' | 'tosa' | 'combo' | 'addon';

const CATEGORY_ORDER: ServiceCategory[] = ['banho', 'tosa', 'combo', 'addon'];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  banho: 'Banho',
  tosa: 'Tosa',
  combo: 'Combos',
  addon: 'Adicionais',
};

function formatPriceBRL(value: number): string {
  const formatted = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(2).replace('.', ',');
  return `R$ ${formatted}`;
}

function getPriceDisplay(service: Service, userPetSizes: string[]): string {
  const prices = service.service_prices
    .map((price) => ({ ...price, price: Number(price.price) }))
    .filter((price) => Number.isFinite(price.price));

  if (prices.length === 0) {
    return 'Consultar';
  }

  const uniqueSizes = Array.from(new Set(userPetSizes));

  if (uniqueSizes.length === 0) {
    const lowestPrice = Math.min(...prices.map((price) => price.price));
    return `a partir de ${formatPriceBRL(lowestPrice)}`;
  }

  if (uniqueSizes.length === 1) {
    const matchingPrice = prices.find((price) => price.size === uniqueSizes[0]);
    return matchingPrice ? formatPriceBRL(matchingPrice.price) : 'Consultar';
  }

  const matchingPrices = uniqueSizes
    .map((size) => prices.find((price) => price.size === size)?.price)
    .filter((price): price is number => typeof price === 'number');

  if (matchingPrices.length === 0) {
    return 'Consultar';
  }

  const minPrice = Math.min(...matchingPrices);
  const maxPrice = Math.max(...matchingPrices);

  if (minPrice === maxPrice) {
    return formatPriceBRL(minPrice);
  }

  return `${formatPriceBRL(minPrice)} - ${formatPriceBRL(maxPrice)}`;
}

export const ServiceList: React.FC<ServiceListProps> = ({ services, userPetSizes }) => {
  const groupedServices: Record<ServiceCategory, Service[]> = {
    banho: [],
    tosa: [],
    combo: [],
    addon: [],
  };

  services.forEach((service) => {
    if (service.category === 'banho' || service.category === 'tosa' || service.category === 'combo' || service.category === 'addon') {
      groupedServices[service.category].push(service);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Serviços</Text>

      {services.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum serviço disponível no momento.</Text>
      ) : null}

      {CATEGORY_ORDER.map((category) => {
        const categoryServices = groupedServices[category];

        if (categoryServices.length === 0) {
          return null;
        }

        return (
          <View key={category} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category]}</Text>
            {categoryServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                priceDisplay={getPriceDisplay(service, userPetSizes)}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
