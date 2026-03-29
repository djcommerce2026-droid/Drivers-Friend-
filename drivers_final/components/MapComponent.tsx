
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

// Corrigir ícone padrão do Leaflet que costuma quebrar em builds modernos
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente para centralizar o mapa quando a posição mudar e invalidar o tamanho
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      map.setView(center, map.getZoom());
      // Forçar o Leaflet a recalcular o tamanho do container (evita mapa cinza/cortado)
      const timer = setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 250);
      return () => clearTimeout(timer);
    } catch (e) {
      console.error("Leaflet ChangeView error", e);
    }
  }, [center, map]);
  return null;
};

const MapComponent: React.FC = () => {
  const [coords, setCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    let watchId: any;
    const startWatch = async () => {
      // Tenta pegar a posição inicial rapidamente
      try {
        const current = await Geolocation.getCurrentPosition();
        if (current && current.coords) {
          setCoords([current.coords.latitude, current.coords.longitude]);
        }
      } catch (e) {
        console.error("Initial position error", e);
      }

      try {
        watchId = await Geolocation.watchPosition({ 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 30000 
        }, (pos, err) => {
          if (err) {
            console.error("Watch position error", err);
            return;
          }
          if (pos && pos.coords) {
            setCoords([pos.coords.latitude, pos.coords.longitude]);
          }
        });
      } catch (e) {
        console.error("Start watch error", e);
      }
    };
    startWatch();
    return () => {
      if (watchId) Geolocation.clearWatch({ id: watchId });
    };
  }, []);

  return (
    <div className="w-full h-48 bg-[#0F172A] rounded-2xl border border-[#334155] relative overflow-hidden shadow-inner">
      {coords ? (
        <MapContainer 
          center={coords} 
          zoom={16} 
          scrollWheelZoom={false} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={coords} />
          <ChangeView center={coords} />
        </MapContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-[#64748B] uppercase italic tracking-widest">Localizando...</p>
        </div>
      )}
      
      {/* Overlay de informações */}
      <div className="absolute bottom-2 right-2 z-[1000] bg-[#0F172A]/80 backdrop-blur-md px-2 py-1 rounded-lg border border-[#334155] pointer-events-none">
        <p className="text-[7px] font-black text-[#F1F5F9] uppercase italic">GPS Ativo • Alta Precisão</p>
      </div>
    </div>
  );
};

export default MapComponent;
