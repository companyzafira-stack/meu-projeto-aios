import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Service } from '@/hooks/usePetShopProfile';

interface ServiceCardProps {
  service: Service;
  priceDisplay: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, priceDisplay }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.leftColumn}>
          <Text style={styles.name}>{service.name}</Text>
          {service.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {service.description}
            </Text>
          ) : null}
          <Text style={styles.duration}>⏱ {service.duration_minutes} min</Text>
        </View>

        <View style={styles.rightColumn}>
          <Text style={styles.price}>{priceDisplay}</Text>
          {service.is_addon ? <Text style={styles.addonBadge}>Add-on</Text> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    lineHeight: 16,
  },
  duration: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rightColumn: {
    alignItems: 'flex-end',
    minWidth: 84,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
    textAlign: 'right',
  },
  addonBadge: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});
