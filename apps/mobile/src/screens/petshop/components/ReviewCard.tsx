import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { Review } from '@/hooks/usePetShopProfile';

interface ReviewCardProps {
  review: Review;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'T';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const authorName = review.profiles.display_name || 'Tutor';
  const responseDate = review.response_date ? formatDate(review.response_date) : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {review.profiles.avatar_url ? (
          <Image source={{ uri: review.profiles.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>{getInitials(authorName)}</Text>
          </View>
        )}

        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.dateText}>{formatDate(review.created_at)}</Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = index < review.rating;
          return (
            <Text
              key={`${review.id}-star-${index + 1}`}
              style={[styles.star, filled ? styles.starFilled : styles.starEmpty]}
            >
              {filled ? '★' : '☆'}
            </Text>
          );
        })}
      </View>

      {review.comment ? (
        <Text style={styles.commentText}>{review.comment}</Text>
      ) : null}

      {review.petshop_response ? (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Resposta do pet shop:</Text>
          <Text style={styles.responseText}>{review.petshop_response}</Text>
          {responseDate ? (
            <Text style={styles.responseDate}>Respondido em {responseDate}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ddd',
  },
  avatarPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#ddd',
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    lineHeight: 20,
  },
  responseContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginLeft: 20,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  responseText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  responseDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
