import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { RootNavigator } from './src/navigation/RootNavigator';

const queryClient = new QueryClient();

function AppContent() {
  usePushNotifications();

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <StatusBar barStyle="dark-content" />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
