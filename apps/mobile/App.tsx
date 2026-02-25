import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  usePushNotifications();

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
        <StatusBar barStyle="dark-content" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
