import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { useUserPets } from '../hooks/useUserPets';
import type { Pet } from '../hooks/usePets';

// Auth Screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';

// Main Screens (placeholder)
import { HomeScreen } from '../screens/main/HomeScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

// Pet Screens
import { AddPetScreen } from '../screens/pets/AddPetScreen';
import { MyPetsScreen } from '../screens/pets/MyPetsScreen';
import { PetDetailScreen } from '../screens/pets/PetDetailScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
};

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  MyPets: undefined;
  AddPet: { petId?: string; editingPet?: Pet };
  PetDetail: { petId: string };
};

export type OnboardingStackParamList = {
  AddPet: { petId?: string; editingPet?: Pet };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
  );
};

const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Voltar',
      }}
    >
      <OnboardingStack.Screen
        name="AddPet"
        component={AddPetScreen}
        options={{ headerTitle: 'Cadastrar seu primeiro Pet' }}
      />
    </OnboardingStack.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Voltar',
      }}
    >
      <MainStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerTitle: 'IPET' }}
      />
      <MainStack.Screen
        name="MyPets"
        component={MyPetsScreen}
        options={{ headerTitle: 'Meus Pets' }}
      />
      <MainStack.Screen
        name="AddPet"
        component={AddPetScreen}
        options={{ headerTitle: 'Adicionar Pet' }}
      />
      <MainStack.Screen
        name="PetDetail"
        component={PetDetailScreen}
        options={{ headerTitle: 'Detalhes do Pet' }}
      />
      <MainStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: 'Meu Perfil' }}
      />
    </MainStack.Navigator>
  );
};

export const RootNavigator = () => {
  const { session, loading: authLoading } = useAuth();
  const { hasPets, loading: petsLoading } = useUserPets();

  const loading = authLoading || petsLoading;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? <AuthNavigator /> : !hasPets ? <OnboardingNavigator /> : <MainNavigator />}
    </NavigationContainer>
  );
};
