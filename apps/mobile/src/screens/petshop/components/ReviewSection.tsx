import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Review } from '@/hooks/usePetShopProfile';
import { ReviewCard } from './ReviewCard';

interface ReviewSectionProps {
  reviews: Review[];
  reviewCount: number;
  onSeeAll: () => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  reviews,
  reviewCount,
  onSeeAll,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Avaliações</Text>
        <TouchableOpacity
          onPress={onSeeAll}
          disabled={reviewCount === 0}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.seeAllText,
              reviewCount === 0 ? styles.seeAllDisabledText : null,
            ]}
          >
            Ver todas ({reviewCount})
          </Text>
        </TouchableOpacity>
      </View>

      {reviews.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma avaliação ainda</Text>
      ) : (
        <View style={styles.reviewList}>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  seeAllDisabledText: {
    color: '#999',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  reviewList: {
    marginTop: 8,
  },
});
