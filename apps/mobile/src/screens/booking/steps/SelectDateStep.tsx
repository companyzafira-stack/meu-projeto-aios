import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBooking } from '../context/BookingContext';
import { useAvailableDates } from '../hooks/useAvailableDates';

export const SelectDateStep: React.FC = () => {
  const { state, dispatch } = useBooking();
  const { dates, isLoading } = useAvailableDates(state.petshopId);

  const selectedDateInfo = dates.find((date) => date.date === state.selectedDate) ?? null;
  const canContinue = Boolean(state.selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Escolha a data</Text>
      </View>

      <FlatList
        data={dates}
        keyExtractor={(item) => item.date}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateListContent}
        ItemSeparatorComponent={() => <View style={styles.dateItemSeparator} />}
        renderItem={({ item }) => {
          const selected = state.selectedDate === item.date;
          const disabled = !item.hasSlots;

          return (
            <TouchableOpacity
              style={[
                styles.dateItem,
                selected
                  ? styles.dateItemSelected
                  : disabled
                    ? styles.dateItemUnavailable
                    : styles.dateItemAvailable,
              ]}
              onPress={() => {
                if (!item.hasSlots) {
                  return;
                }
                dispatch({ type: 'SET_DATE', date: item.date });
              }}
              disabled={disabled}
              activeOpacity={0.85}
            >
              <Text style={[styles.dayLabel, selected ? styles.dateTextSelected : styles.dayLabelDefault]}>
                {item.dayLabel}
              </Text>
              <Text style={[styles.dayNumber, selected ? styles.dateTextSelected : styles.dayNumberDefault]}>
                {item.dayNumber}
              </Text>
              <Text style={[styles.monthLabel, selected ? styles.dateTextSelected : styles.monthLabelDefault]}>
                {item.monthLabel}
              </Text>
              {item.isToday ? (
                <View style={[styles.todayDot, selected ? styles.todayDotSelected : styles.todayDotDefault]} />
              ) : (
                <View style={styles.todayDotSpacer} />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B6B" />
        </View>
      ) : null}

      {selectedDateInfo ? (
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationText}>
            📅 {selectedDateInfo.dayLabel}, {selectedDateInfo.dayNumber} de {selectedDateInfo.monthLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
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
  dateListContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  dateItemSeparator: {
    width: 8,
  },
  dateItem: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 104,
  },
  dateItemSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  dateItemAvailable: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  dateItemUnavailable: {
    backgroundColor: '#f0f0f0',
    borderColor: '#f0f0f0',
    opacity: 0.5,
  },
  dayLabel: {
    fontSize: 12,
  },
  dayLabelDefault: {
    color: '#666',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  dayNumberDefault: {
    color: '#333',
  },
  monthLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  monthLabelDefault: {
    color: '#999',
  },
  dateTextSelected: {
    color: '#fff',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  todayDotSelected: {
    backgroundColor: '#fff',
  },
  todayDotDefault: {
    backgroundColor: '#FF6B6B',
  },
  todayDotSpacer: {
    height: 14,
  },
  loadingContainer: {
    paddingTop: 12,
    alignItems: 'center',
  },
  confirmationContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  confirmationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
