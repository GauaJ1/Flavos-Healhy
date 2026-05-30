import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flavos.healthy',
  appName: 'Flavos Healthy',
  webDir: 'dist',
  server: {
    // Permite acesso ao Android durante desenvolvimento
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#111827',
      showSpinner: false,
    },
  },
};

export default config;
