import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';

type AuthStackParamList = {
  VerifyEmail: { email: string };
  Login: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

export const VerifyEmailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email } = route.params;
  const [loading, setLoading] = React.useState(false);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      Alert.alert('Sucesso', 'Email de confirmação reenviado!');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao reenviar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Verifique seu Email</Text>
        <Text style={styles.subtitle}>
          Enviamos um link de confirmação para {email}
        </Text>

        <View style={styles.instructionsBox}>
          <Text style={styles.instructions}>
            1. Abra o email que recebeu{'\n'}
            2. Clique no link de confirmação{'\n'}
            3. Volte para este app
          </Text>
        </View>

        {/* Resend Email Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResendEmail}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Reenviando...' : 'Reenviar Email'}
          </Text>
        </TouchableOpacity>

        {/* Go to Login */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Ir para Login</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Não viu o email? Verifique sua pasta de spam
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  instructionsBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  instructions: {
    fontSize: 14,
    color: '#333',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
