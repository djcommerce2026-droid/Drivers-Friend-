import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { Geolocation } from '@capacitor/geolocation';

let watchId: string | null = null;

// INICIAR (chame onde quiser)
export const iniciarKM = async () => {
  await ForegroundService.start({
    id: 1001, 
    title: 'Drivers Friend', 
    text: 'GPS KM Uber 24h', 
    ongoing: true 
  });
  
  watchId = await Geolocation.watchPosition({enableHighAccuracy: true}, (pos) => {
    // SEU CÓDIGO KM AQUI
    if (pos && pos.coords) {
      console.log('GPS:', pos.coords.latitude, pos.coords.longitude);
    }
  });
};

// PARAR  
export const pararKM = async () => {
  if (watchId) {
    await Geolocation.clearWatch({ id: watchId });
    watchId = null;
  }
  await ForegroundService.stop({ id: 1001 });
};
