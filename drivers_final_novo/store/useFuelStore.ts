
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FuelEntry } from '../types';
import { useFinanceStore } from './useFinanceStore';
import { capacitorStorage } from '../services/storageService';

console.log('useFuelStore module loading...');

const STORAGE_KEY = 'drivers-friend-fuel-storage-v1';

interface FuelState {
  historico: FuelEntry[];
  medioKmL: number;
  tanqueAtual: number;
  precoAtual: number;
  tipoAtual: 'Gasolina' | 'Etanol';
  setManualConfig: (kmL: number, price: number, tipo: 'Gasolina' | 'Etanol') => void;
  setInitialConsumption: (kmL: number, price: number) => void;
  onAbastece: (f: FuelEntry) => void;
  consumirKm: (km: number) => void;
  reservaDia: (kmDia: number) => number;
}

export const useFuelStore = create<FuelState>()(
  persist(
    (set, get) => ({
      historico: [],
      medioKmL: 10,
      tanqueAtual: 0,
      precoAtual: 5.80,
      tipoAtual: 'Gasolina',
      
      setManualConfig: (kmL, price, tipo) => {
        const validKmL = Math.max(5, kmL);
        const state = get();
        
        // Evita loop infinito se os valores já forem os mesmos
        if (state.medioKmL === validKmL && state.precoAtual === price && state.tipoAtual === tipo) {
          return;
        }

        set({ 
          medioKmL: validKmL, 
          precoAtual: price,
          tipoAtual: tipo
        });
        
        // Sincroniza com o financeStore apenas se necessário
        const financeStore = useFinanceStore.getState();
        const v = financeStore.vehicle;
        const currentPrice = tipo === 'Gasolina' ? v?.lastPricePerLiter : v?.lastPriceEth;
        const currentKmL = tipo === 'Gasolina' ? v?.estimatedKmLGas : v?.estimatedKmlEth;

        if (currentPrice !== price || currentKmL !== validKmL || v?.fuelType !== tipo) {
          const updates: any = { fuelType: tipo };
          if (tipo === 'Gasolina') {
            updates.lastPricePerLiter = price;
            updates.estimatedKmLGas = validKmL;
            updates.estimatedKmL = validKmL;
          } else {
            updates.lastPriceEth = price;
            updates.estimatedKmlEth = validKmL;
            updates.estimatedKmL = validKmL;
          }
          financeStore.updateVehicle(updates);
        }
      },

      setInitialConsumption: (kmL, price) => set({ medioKmL: Math.max(5, kmL), precoAtual: price }),

      onAbastece: (f: FuelEntry) => {
        const financeStore = useFinanceStore.getState();
        const tankCapacity = financeStore.vehicle?.tankCapacity || 47;
        
        // 1. Sincroniza o odômetro (pode consumir combustível se o odômetro subiu)
        // Isso é feito ANTES de calcular o novo volume para garantir que o consumo
        // anterior seja processado.
        financeStore.syncOdometer(f.odometer);

        set((state) => {
          // O volume atual já deve ter sido reduzido pelo syncOdometer -> consumirKm
          const volumeBase = state.tanqueAtual;
          const novoVolume = f.isFullTank ? tankCapacity : Math.max(0, Math.min(tankCapacity, volumeBase + f.liters));
          
          let novoMedio = state.medioKmL;
          if (f.isFullTank) {
            // Busca a última âncora (último tanque cheio do mesmo tipo de combustível)
            const lastFullIndex = state.historico.findIndex(x => x.isFullTank && x.fuelType === f.fuelType);
            
            if (lastFullIndex !== -1) {
              const lastFull = state.historico[lastFullIndex];
              const dist = f.odometer - lastFull.odometer;
              
              if (dist > 0) {
                // Soma todos os litros abastecidos DESDE a última âncora até o abastecimento ATUAL
                // Como o histórico está em ordem decrescente (novos no topo), pegamos os itens antes do lastFullIndex
                const intermediateEntries = state.historico.slice(0, lastFullIndex);
                const totalLiters = intermediateEntries.reduce((sum, entry) => sum + entry.liters, 0) + f.liters;
                
                const rendimentoReal = dist / totalLiters;
                
                // Blindagem: Rendimento deve estar entre 5 e 30 km/L para evitar outliers absurdos
                if (rendimentoReal >= 5 && rendimentoReal <= 30) {
                  novoMedio = rendimentoReal;
                  // Atualiza automaticamente o consumo médio do veículo para o tipo específico no FinanceStore
                  setTimeout(() => {
                    const updates: any = { estimatedKmL: novoMedio };
                    if (f.fuelType === 'Gasolina') updates.estimatedKmLGas = novoMedio;
                    if (f.fuelType === 'Etanol') updates.estimatedKmlEth = novoMedio;
                    useFinanceStore.getState().updateVehicle(updates);
                  }, 0);
                }
              }
            }
          }

          return {
            historico: [f, ...state.historico],
            medioKmL: novoMedio,
            precoAtual: f.pricePerLiter,
            tanqueAtual: novoVolume,
            tipoAtual: f.fuelType
          };
        });
      },

      consumirKm: (km: number) => {
        const financeStore = useFinanceStore.getState();
        const tankCapacity = financeStore.vehicle?.tankCapacity || 47;
        
        set((state) => {
          const kmL = Math.max(5, state.medioKmL || 10);
          const litrosConsumidos = km / kmL;
          return {
            tanqueAtual: Math.max(0, Math.min(tankCapacity, state.tanqueAtual - litrosConsumidos))
          };
        });
      },

      reservaDia: (kmDia: number) => {
        const kmL = Math.max(5, get().medioKmL || 10);
        return (kmDia / kmL) * get().precoAtual;
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);
