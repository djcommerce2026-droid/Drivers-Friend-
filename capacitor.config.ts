
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.driversfriend.app',
  appName: 'Drivers Friend',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    buildHeight: 1,
    backgroundColor: "#ffffff" 
  },
  plugins: {
    AndroidForegroundService: {
      notificationTitle: "Driver's Friend Ativo",
      notificationText: "Monitorando quilometragem em tempo real",
      notificationImportance: "HIGH"
    },
    LocalNotifications: {
      iconColor: "#3B82F6",
      sound: "beep.wav"
    }
  }
};

export default config;
