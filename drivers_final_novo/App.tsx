
import React, { useState, useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import RidesTab from './components/RidesTab';
import Onboarding from './components/Onboarding';
import FuelTab from './components/FuelTab';
import FinancialTab from './components/FinancialTab';
import MaintenanceTab from './components/MaintenanceTab';
import ExpensesTab from './components/ExpensesTab';
import SettingsTab from './components/SettingsTab';
import RelatoriosTab from './components/RelatoriosTab';
import { useFinanceStore } from './store/useFinanceStore';
import { useFuelStore } from './store/useFuelStore';
import { TabType } from './types';
import { Loader2, Menu, X, ChevronRight, User, Wallet } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { App as CapacitorApp } from '@capacitor/app';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { Device } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import { Preferences } from '@capacitor/preferences';

import { formatCurrency, formatKm } from './utils/formatters';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('rides');
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  
  const store = useFinanceStore();
  const fuelStore = useFuelStore();

  const { 
    isSetupComplete, activeShift, currentOdo, dayStartOdo, user,
    rides, fuelEntries, expenseEntries, maintenancePlans, lastShiftSummary, isLoading,
    completeSetup, startShift, endShift, addRide, updateRideStage, addFuel, addExpense, deleteExpense,
    addMaintenancePlan, deleteMaintenancePlan, updateMaintenancePlan, performMaintenance, confirmPayment,
    addFixedCost, deleteFixedCost,
    updateProfile, updateVehicle, updateFinancialConfig, resetApp, calcularMetaHoje,
    addTransportApp, addStation, selectApp, incrementOdo, clearSummary, confirmSurplusReservation,
    updatePreferences, preferences, getDailyReports, syncOdometer
  } = store;

  const dailyReports = getDailyReports();

  // Verificação periódica de Reset Diário
  useEffect(() => {
    // Verifica ao montar
    store.checkDailyReset();
    
    // E a cada 5 minutos
    const interval = setInterval(() => {
      store.checkDailyReset();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [store]);

  // Monitoramento de Alertas de Manutenção
  useEffect(() => {
    if (maintenancePlans && maintenancePlans.length > 0) {
      maintenancePlans.forEach(plan => {
        const nextMaintenanceAt = plan.lastDoneOdo + plan.intervalKm;
        const kmRemaining = nextMaintenanceAt - currentOdo;
        
        // Se estiver dentro da margem de alerta definida pelo usuário (alarmBeforeKm)
        if (kmRemaining > 0 && kmRemaining <= plan.alarmBeforeKm) {
          LocalNotifications.schedule({
            notifications: [{
              id: Math.abs(plan.id.split('-')[0].split('').reduce((a:any,b:any)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)),
              title: "Manutenção Próxima!",
              body: `Faltam ${formatKm(kmRemaining)}km para: ${plan.item}`,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'beep.wav'
            }]
          }).catch(e => console.error("Maintenance notification error:", e));
        }
      });
    }
  }, [currentOdo, maintenancePlans]);

  useEffect(() => {
    
    const requestAllPermissions = async () => {
      const info = await Device.getInfo();
      if (info.platform === 'web') return;

      try {
        // 1. Notificações (Android 13+)
        const notificationPerm = await LocalNotifications.checkPermissions();
        if (notificationPerm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        await new Promise(r => setTimeout(r, 800));

        // 2. Localização (Foreground)
        let locPerm = await Geolocation.checkPermissions();
        if (locPerm.location !== 'granted') {
          locPerm = await Geolocation.requestPermissions({
            permissions: ['location', 'coarseLocation']
          });
        }
        await new Promise(r => setTimeout(r, 800));

        // 3. Localização (Background - Android 10+)
        // No Android 11+, o sistema exige que o usuário escolha "Permitir o tempo todo" manualmente nas configurações
        if (locPerm.location === 'granted') {
          const { value: bgAsked } = await Preferences.get({ key: 'bg_location_asked' });
          if (!bgAsked) {
            // Tenta disparar o diálogo nativo (funciona em algumas versões/marcas)
            await Geolocation.requestPermissions({
              permissions: ['location']
            }).catch(() => {});
            
            // Se ainda não for "granted" para background, orientamos o usuário
            // O Capacitor Geolocation não retorna explicitamente se é "always", 
            // mas podemos assumir que se o usuário não marcou, precisamos avisar.
            await Preferences.set({ key: 'bg_location_asked', value: 'true' });
          }
        }
        await new Promise(r => setTimeout(r, 800));

        // 4. Overlay (Sobrepor a outros apps) - Essencial para o ícone flutuante
        if (info.platform === 'android') {
          const { value: overlayAsked } = await Preferences.get({ key: 'overlay_asked_v2' });
          if (!overlayAsked) {
            await NativeSettings.open({
              option: AndroidSettings.ActionManageOverlayPermission,
            }).catch(() => {});
            await Preferences.set({ key: 'overlay_asked_v2', value: 'true' });
          }
        }
        await new Promise(r => setTimeout(r, 800));

        // 5. Otimização de Bateria (Ignorar) - Essencial para GPS não morrer com tela apagada
        if (info.platform === 'android') {
          const { value: batteryAsked } = await Preferences.get({ key: 'battery_asked_v2' });
          if (!batteryAsked) {
            // Abre os detalhes do app para o usuário desativar a economia de bateria manualmente
            // ou usar a ação específica se disponível
            await NativeSettings.open({
              option: AndroidSettings.ApplicationDetails,
            }).catch(() => {});
            await Preferences.set({ key: 'battery_asked_v2', value: 'true' });
          }
        }

        // 6. Keep Awake
        await KeepAwake.keepAwake().catch(() => {});

      } catch (e) {
        console.log('Erro ao solicitar permissões:', e);
      }
    };

    requestAllPermissions();

    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        if (activeTab !== 'rides') {
          setActiveTab('rides');
        } else if (menuOpen) {
          setMenuOpen(false);
        } else {
          CapacitorApp.exitApp();
        }
      }
    });
    const stateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      const info = await Device.getInfo();
      if (info.platform !== 'web') {
        if (!isActive && activeShift) {
          // Notificação persistente
          LocalNotifications.schedule({
            notifications: [{
              id: 999,
              title: "Drivers Friend em Segundo Plano",
              body: "Toque para voltar e acompanhar seu expediente",
              ongoing: true,
              autoCancel: false
            }]
          }).catch(err => console.log("Notification schedule failed:", err));
  
          // Tentar Picture-in-Picture para o "ícone flutuante"
          if (videoRef.current && (document as any).pictureInPictureEnabled) {
            try {
              await videoRef.current.play();
              await videoRef.current.requestPictureInPicture();
            } catch (err) {
              console.log("PiP não suportado ou bloqueado:", err);
            }
          }
        } else {
          LocalNotifications.cancel({ notifications: [{ id: 999 }] }).catch(() => {});
          if ((document as any).pictureInPictureElement) {
            (document as any).exitPictureInPicture().catch(() => {});
          }
        }
      }
    });

    return () => { 
      backListener.then(l => l.remove()); 
      stateListener.then(l => l.remove());
    };
  }, [activeTab, menuOpen, activeShift]);

  useEffect(() => {
    if (isSetupComplete) {
      KeepAwake.keepAwake().catch(() => {});
      // Start Foreground Service on Android
      Device.getInfo().then(info => {
        if (info.platform === 'android') {
          ForegroundService.start({
            id: 1001, 
            title: 'Drivers Friend', 
            body: 'GPS KM Uber 24h - Monitorando Movimento', 
            ongoing: true,        // ✅ GPS IMORTAL
            importance: 4         // ✅ Prioridade máxima
          }).catch(err => console.error("Foreground Service Error:", err));
        }
      });
    } else {
      // Stop Foreground Service
      Device.getInfo().then(info => {
        if (info.platform === 'android') {
          ForegroundService.stop({ id: 1001 }).catch(err => console.error("Foreground Service Stop Error:", err));
        }
      });
    }
  }, [isSetupComplete]);

  useEffect(() => {
    let watchId: any;

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371.0088;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    };

    const handleGpsUpdate = (pos: any) => {
      if (!pos || !pos.coords) return;
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      if (accuracy > 50) return; 
      
      if (lastCoordsRef.current) {
        const distance = getDistance(lastCoordsRef.current.lat, lastCoordsRef.current.lng, lat, lng);
        if (distance > 0.01) { 
          incrementOdo(distance); 
          lastCoordsRef.current = { lat, lng }; 
        }
      } else {
        lastCoordsRef.current = { lat, lng };
      }
    };

    if (isSetupComplete) {
      watchId = Geolocation.watchPosition({ 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }, (pos) => handleGpsUpdate(pos));
    } else { 
      lastCoordsRef.current = null; 
    }

    return () => { 
      if (watchId) watchId.then((id: any) => Geolocation.clearWatch({ id })).catch(() => {}); 
    };
  }, [activeShift, incrementOdo, isSetupComplete]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <Loader2 className="animate-spin text-[#3B82F6]" size={48} strokeWidth={3} />
    </div>
  );

  if (!isSetupComplete) return <Onboarding onComplete={completeSetup} />;

  const fontSizeClass = preferences.fontSize === 'small' ? 'text-xs' : preferences.fontSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div 
      className={`h-full w-full flex flex-col font-sans relative overflow-hidden ${fontSizeClass}`}
      style={{ zoom: preferences.zoomLevel / 100 }}
    >
      {/* Header Fixo - ORDEM ABSOLUTA: Fica no topo da Safe Area */}
      <header className="p-4 flex items-center justify-between border-b border-[#334155]/30 bg-[#0F172A] z-40 flex-shrink-0" 
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 12px)' }}>
        <button onClick={() => setMenuOpen(true)} className="p-1.5 bg-[#1E293B] rounded-lg text-[#3B82F6] active:scale-90 transition-all">
          <Menu size={18} />
        </button>
        <div className="flex-1 text-center px-4">
           <p className="text-[8px] font-black text-[#3B82F6] italic tracking-tighter leading-none uppercase">Drivers Friend</p>
           <h2 className="text-xs font-black text-[#F1F5F9] italic leading-tight">{user?.name || 'Motorista'}</h2>
        </div>
         <div className="text-right">
            <p className="text-[7px] font-bold text-[#64748B] italic leading-none uppercase">Km do Dia</p>
            <p className="text-xs font-black text-[#F1F5F9]">{formatKm(currentOdo - (dayStartOdo ?? currentOdo))}</p>
         </div>
      </header>

      {/* Conteúdo Central Rolável */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-container bg-[#0F172A] p-4">
        {renderContent()}
      </main>
      
      {/* Navigation Fixo */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Video para PiP (Atalho Flutuante) - Data URI para garantir carregamento instantâneo */}
      <video 
        ref={videoRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none', zIndex: -1 }}
        playsInline
        muted
        loop
        src="data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAG21kYXQAAAGUAbm9uZS9hdmMxAAABAG1vb3YAAABsbXZoZAAAAADUn66p1J+uqcAAAH0AAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABidHJhawAAAFx0a2hkAAAAAdSfrqnUn66pAAAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAGhtZGlhAAAAIG1kaGQAAAAA1J+uqdSfrqnAAAB9AAAEABh1dW5pAAAAKWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABfG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAXNzdGJsAAAAb3N0c2QAAAAAAAAAAQAAAF9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAQAIAAgAAAAAAABhdmNDf0AArv+EAAAAbXN0dHMAAAAAAAAAAQAAAAEAAAB9AAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABxzdHN6AAAAAAAAAAEAAAABAAAAAQAAABRzdGNvAAAAAAAAAAEAAAAwAAAAYXVkcmEAAAAUAAAAAAA="
      />

      {/* Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[6000] flex">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMenuOpen(false)}></div>
           <div className="relative w-64 bg-[#0F172A] border-r border-[#334155] h-full shadow-2xl p-6 flex flex-col animate-slide-left"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}>
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-black italic text-[#3B82F6] tracking-tighter">OPÇÕES</h2>
                 <button onClick={() => setMenuOpen(false)} className="bg-[#1E293B] p-1.5 rounded-full text-[#64748B]"><X size={16}/></button>
              </div>
              <button onClick={() => { setActiveTab('settings'); setMenuOpen(false); }} className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-xl flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-3 text-[#F1F5F9]"><User size={16}/><span className="font-black italic text-[10px]">AJUSTES GERAIS</span></div>
                 <ChevronRight size={14} className="text-[#64748B]"/>
              </button>
           </div>
        </div>
      )}

      {/* Resumo Final de Turno (Carteira Financeira) */}
      {lastShiftSummary && (
        <div className="fixed inset-0 z-[7000] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
           <div className="bg-[#1E293B] border-2 border-[#10B981] w-full max-w-xs rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up my-auto">
              <div className="text-center">
                 <div className="w-12 h-12 bg-[#10B981]/10 rounded-full flex items-center justify-center text-[#10B981] mx-auto mb-2"><Wallet size={24}/></div>
                 <h2 className="text-lg font-black text-[#F1F5F9] italic tracking-tighter uppercase">Carteira Financeira</h2>
                 <p className="text-[8px] font-bold text-[#64748B] uppercase">Resumo do Expediente</p>
              </div>
              
              <div className="space-y-3">
                 <div className="bg-[#0F172A] p-4 rounded-2xl border border-[#334155] space-y-3 shadow-inner">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-[#64748B] uppercase italic">Ganhos Brutos</span>
                       <span className="text-[14px] font-black text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.brutoTotal)}</span>
                    </div>

                    <div className="pt-2 border-t border-[#334155]/50 space-y-1.5">
                       <p className="text-[7px] font-black text-[#3B82F6] uppercase italic mb-1">Valores a Reservar:</p>
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Meta Salarial</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.salary)}</span></div>
                       
                       {lastShiftSummary.reserves?.fixedCostsDetail?.map((cost, idx) => (
                         <div key={idx} className="flex justify-between text-[7px] font-medium text-[#64748B] uppercase pl-2">
                           <span>{cost.name}</span>
                           <span className="text-[#F1F5F9]">R$ {formatCurrency(cost.value)}</span>
                         </div>
                       ))}
                       
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Gastos</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.expenses)}</span></div>
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Combustível (KM)</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.fuel)}</span></div>
                       
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Manutenção</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.maintenance)}</span></div>
                       {lastShiftSummary.reserves?.maintenanceDetail?.map((m, idx) => (
                         <div key={idx} className="flex justify-between text-[7px] font-medium text-[#64748B] uppercase pl-2">
                           <span>{m.name}</span>
                           <span className="text-[#F1F5F9]">R$ {formatCurrency(m.value)}</span>
                         </div>
                       ))}
                       
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Depreciação</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.depreciation)}</span></div>
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Taxa App</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.appFees)}</span></div>
                       <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Taxa Cartão</span><span className="text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves?.cardFees)}</span></div>
                    </div>

                    <div className="pt-2 border-t border-[#334155]/50 flex justify-between items-center">
                       <span className="text-[9px] font-black text-amber-500 uppercase italic">Total Reservas</span>
                       <span className="text-[12px] font-black text-amber-500">R$ {formatCurrency(lastShiftSummary.totalReservar)}</span>
                    </div>

                    {lastShiftSummary.paymentMethods && (
                      <div className="pt-2 border-t border-[#334155]/50 space-y-1.5">
                         <p className="text-[7px] font-black text-[#10B981] uppercase italic mb-1">Recebimentos (Formas de Pagamento):</p>
                         <div className="grid grid-cols-2 gap-2">
                           <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Dinheiro</span><span className="text-[#10B981]">R$ {formatCurrency(lastShiftSummary.paymentMethods.cash)}</span></div>
                           <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Pix</span><span className="text-[#10B981]">R$ {formatCurrency(lastShiftSummary.paymentMethods.pix)}</span></div>
                           <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Débito</span><span className="text-[#3B82F6]">R$ {formatCurrency(lastShiftSummary.paymentMethods.debit)}</span></div>
                           <div className="flex justify-between text-[8px] font-bold text-[#64748B] uppercase"><span>Crédito</span><span className="text-[#3B82F6]">R$ {formatCurrency(lastShiftSummary.paymentMethods.credit)}</span></div>
                         </div>
                      </div>
                    )}

                    {lastShiftSummary.totalDeficitToAmortize > 0 && (
                      <div className="pt-1 flex justify-between items-center">
                        <span className="text-[8px] font-black text-rose-500 uppercase italic">Déficit Amortizado</span>
                        <span className="text-[10px] font-black text-rose-500">R$ {formatCurrency(lastShiftSummary.totalDeficitToAmortize)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#334155] flex justify-between items-center">
                       <span className="text-[10px] font-black text-[#10B981] uppercase italic">Sobra Líquida (Lucro Real)</span>
                       <span className="text-[16px] font-black text-[#10B981] italic">R$ {formatCurrency(lastShiftSummary.liquidoMao)}</span>
                    </div>
                 </div>

                 {lastShiftSummary.surplusSuggestion > 0 && (
                    <div className="bg-[#0F172A] p-4 rounded-2xl border border-amber-500/50 space-y-2">
                      <p className="text-[8px] font-black text-amber-500 uppercase italic">Sugestão de Reserva Extra:</p>
                      <p className="text-[10px] text-[#F1F5F9] leading-tight">Você superou a meta! Sugerimos reservar 10,00% do excedente (R$ {formatCurrency(lastShiftSummary.surplusSuggestion)}) para reduzir sua meta de amanhã.</p>
                      <div className="flex gap-2 pt-1">
                        <button 
                          onClick={() => confirmSurplusReservation(lastShiftSummary.surplusSuggestion)}
                          className="flex-1 bg-amber-500 text-[#0F172A] py-2 rounded-lg font-black italic text-[9px] uppercase"
                        >
                          Reservar R$ {formatCurrency(lastShiftSummary.surplusSuggestion)}
                        </button>
                        <button 
                          onClick={clearSummary}
                          className="flex-1 bg-[#1E293B] text-[#64748B] py-2 rounded-lg font-black italic text-[9px] uppercase"
                        >
                          Agora não
                        </button>
                      </div>
                    </div>
                  )}
              </div>

              {!lastShiftSummary.surplusSuggestion && (
                <button onClick={clearSummary} className="w-full bg-[#10B981] text-white py-4 rounded-xl font-black italic text-base shadow-xl active:scale-95 transition-all">OK, CONFERIDO ✓</button>
              )}
           </div>
        </div>
      )}
    </div>
  );

  function renderContent() {
    switch (activeTab) {
      case 'rides': return <RidesTab state={store as any} rides={rides} maintenancePlans={maintenancePlans} fuelEntries={fuelEntries} expenseEntries={expenseEntries} onStartShift={startShift} onEndShift={endShift} onAddRide={addRide} onUpdateRideStage={updateRideStage} onAddTransportApp={addTransportApp} onSelectApp={selectApp} calcularMetaHoje={calcularMetaHoje} />;
      case 'fuel': return <FuelTab entries={fuelEntries} onAdd={addFuel} onAddStation={addStation} onUpdateVehicle={updateVehicle} state={store as any} tankLevel={fuelStore.tanqueAtual} />;
      case 'expenses': return <ExpensesTab entries={expenseEntries} onAdd={addExpense} onDelete={deleteExpense} onConfirmPayment={confirmPayment} />;
      case 'maintenance': return <MaintenanceTab plans={maintenancePlans} onAdd={addMaintenancePlan} onDelete={deleteMaintenancePlan} onPerform={performMaintenance} onUpdate={updateMaintenancePlan} state={store as any} />;
      case 'financial': return <FinancialTab state={store as any} />;
      case 'reports': return <RelatoriosTab reports={dailyReports || []} />;
      case 'settings': return <SettingsTab state={store as any} updateProfile={updateProfile} updateVehicle={updateVehicle} updateFinancialConfig={updateFinancialConfig} updatePreferences={updatePreferences} addFixedCost={addFixedCost} deleteFixedCost={deleteFixedCost} resetApp={resetApp} setActiveTab={setActiveTab} syncOdometer={syncOdometer} />;
      default: return null;
    }
  }
};

export default App;
