import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface BookButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const BookButton: React.FC<BookButtonProps> = ({ onPress, disabled = false }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled ? styles.buttonDisabled : null]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Agendar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
