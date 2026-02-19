import React from 'react';
import { View, StyleSheet } from 'react-native';

export const PetShopCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Photo Skeleton */}
      <View style={[styles.skeleton, styles.photo]} />

      {/* Info Skeleton */}
      <View style={styles.info}>
        {/* Name Skeleton */}
        <View style={[styles.skeleton, styles.name]} />

        {/* Address Skeleton */}
        <View style={[styles.skeleton, styles.address]} />

        {/* Meta Row Skeleton */}
        <View style={styles.metaRow}>
          <View style={[styles.skeleton, styles.metaItem]} />
          <View style={[styles.skeleton, styles.metaItem]} />
        </View>

        {/* Price Skeleton */}
        <View style={[styles.skeleton, styles.price]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeleton: {
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: 200,
  },
  info: {
    padding: 12,
  },
  name: {
    height: 16,
    marginBottom: 8,
    borderRadius: 4,
  },
  address: {
    height: 12,
    marginBottom: 8,
    borderRadius: 4,
    width: '80%',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    height: 12,
    borderRadius: 4,
    flex: 1,
  },
  price: {
    height: 14,
    borderRadius: 4,
    width: '60%',
  },
});
