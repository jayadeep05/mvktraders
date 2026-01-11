import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { PortfolioProvider } from './src/context/PortfolioContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PortfolioProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </ThemeProvider>
        </PortfolioProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
