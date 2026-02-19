import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { PetShop } from '@/hooks/usePetShops';

interface PetShopCardProps {
  petshop: PetShop;
  onPress: () => void;
}

export const PetShopCard: React.FC<PetShopCardProps> = ({ petshop, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Cover Photo */}
      <View style={styles.photoContainer}>
        {petshop.cover_photo ? (
          <Image
            source={{ uri: petshop.cover_photo }}
            style={styles.photo}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>🐾</Text>
          </View>
        )}

        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>
            {petshop.avg_rating.toFixed(1)} ★
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>
          {petshop.name}
        </Text>

        {/* Address */}
        <Text style={styles.address} numberOfLines={1}>
          {petshop.address}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          {/* Distance */}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>📍 {petshop.distance_km.toFixed(1)} km</Text>
          </View>

          {/* Reviews */}
          {petshop.review_count > 0 && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>({petshop.review_count})</Text>
            </View>
          )}
        </View>

        {/* Price */}
        <Text style={styles.price}>
          a partir de R$ {petshop.min_price.toFixed(0)}
        </Text>
      </View>
    </TouchableOpacity>
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
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 60,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
