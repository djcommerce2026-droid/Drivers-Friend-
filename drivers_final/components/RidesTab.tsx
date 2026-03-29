
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, ChevronRight, Gauge, User, 
  ToggleLeft, ToggleRight, Plus, Smartphone,
  ChevronDown, ChevronUp, Zap, Edit2
} from 'lucide-react';
import { AppState, Ride, TransportApp, MaintenancePlan, FuelEntry, ExpenseEntry } from '../types';
import { useFinanceStore } from '../store/useFinanceStore';
import MapComponent from './MapComponent';
import NetProfitProgressBar from './NetProfitProgressBar';
import { formatCurrency, formatKm, formatOdometer, formatPercent } from '../utils/formatters';

interface RidesTabProps {
  state: AppState;
  rides: Ride[];
  maintenancePlans: MaintenancePlan[];
  fuelEntries: FuelEntry[];
  expenseEntries: ExpenseEntry[];
  onStartShift: (odo: number, appId: string) => void;
  onEndShift: (odo: number, endTime?: string) => void;
  onAddRide: (ride: any) => void;
  onAddTransportApp: (app: TransportApp) => void;
  onSelectApp: (appId: string) => void;
  onUpdateRideStage: (stage: any) => void;
}

const RidesTab: React.FC<RidesTabProps> = ({ 
  state, rides, onStartShift, onEndShift, onAddRide, onUpdateRideStage, onAddTransportApp, onSelectApp
}) => {
  const applySurplus = useFinanceStore(s => s.applySurplusAmortization);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [isAddingApp, setIsAddingApp] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editPayment, setEditPayment] = useState<'cash' | 'debit' | 'credit' | 'pix'>('cash');
  
  const [shiftOdo, setShiftOdo] = useState('');
  const [rideValue, setRideValue] = useState('');
  const [rideOdo, setRideOdo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit' | 'pix'>('cash');
  const [newAppName, setNewAppName] = useState('');
  const [newAppFee, setNewAppFee] = useState('');
  const [newAppFixed, setNewAppFixed] = useState(false);
  const [newAppFixedVal, setNewAppFixedVal] = useState('');

  const activeApp = state.transportApps.find(a => a.id === state.selectedAppId);

  useEffect(() => {
    if (state.rideStage === 'boarding' && activeApp?.isFixedPrice) {
      setRideValue(activeApp.fixedPriceValue ? formatCurrency(activeApp.fixedPriceValue) : '');
    }
  }, [state.rideStage, activeApp]);

  const todayRides = useMemo(() => {
    const todayStr = new Date().toDateString();
    return rides.filter(r => new Date(r.timestamp).toDateString() === todayStr);
  }, [rides]);

  const dashStats = useMemo(() => {
    const totalGross = todayRides.reduce((s, r) => s + (r.valueGross || 0), 0);
    const pocketAccumulated = todayRides.reduce((s, r) => s + (r.valuePocket || 0), 0);
    const totalReserves = totalGross - pocketAccumulated;
    
    const financeStore = useFinanceStore.getState();
    const metaDiaria = financeStore.getMetaDiariaReal();
    
    return { 
      totalGross, 
      totalReserves, 
      pocketAccumulated, 
      metaTotal: metaDiaria,
      faltamParaZerar: Math.max(0, metaDiaria - pocketAccumulated),
      isFuelDeficit: financeStore.reservasAtuais.combustivel < 0, 
      isSubDeficit: financeStore.reservasAtuais.subsistenceReserve < 0 
    };
  }, [todayRides]);

  const handleEditRide = (ride: Ride) => {
    setEditingRide(ride);
    setEditValue(ride.valueGross.toFixed(2).replace('.', ','));
    setEditPayment(ride.paymentMethod);
  };

  const saveRideEdit = () => {
    if (editingRide) {
      const newValue = parseFloat(editValue.replace(',', '.'));
      if (!isNaN(newValue)) {
        useFinanceStore.getState().updateRide(editingRide.id, {
          valueGross: newValue,
          paymentMethod: editPayment
        });
        setEditingRide(null);
      }
    }
  };

  const surplusAppliedToday = (state as any).surplusAppliedToday;
  const surplusSuggestion = useMemo(() => {
     if (surplusAppliedToday) return null;
     // Se houver qualquer valor no pocket, a meta fixa já foi batida
     if (dashStats.pocketAccumulated >= dashStats.metaTotal && dashStats.metaTotal > 0) {
        const excedente = dashStats.pocketAccumulated - dashStats.metaTotal;
        const reserva = excedente * 0.1;
        const config = state.financialConfig;
        if (!config || !state.user) return null;
        const remainingDays = Math.max(1, config.diasUteisMes - (new Date().getDate() % config.diasUteisMes));
        const metaMensalRestanteAtual = (state.user.salaryExpectation + state.user.fixedCosts) - (config.surplusAmortization || 0);
        return { amount: reserva, newGoal: Math.max(0, (metaMensalRestanteAtual - reserva) / remainingDays) };
     }
     return null;
  }, [dashStats, state.financialConfig, state.user, surplusAppliedToday]);

  return (
    <div className="flex flex-col gap-[16px] animate-slide-up pb-8">
      {/* Mapa em Tempo Real (Opcional) */}
      {state.preferences.showMap && <MapComponent />}

      {(dashStats.isFuelDeficit || dashStats.isSubDeficit) && (
        <div className="bg-rose-500/10 border-2 border-rose-500 p-4 rounded-3xl animate-pulse flex items-center gap-3">
          <div className="bg-rose-500 text-white p-2 rounded-xl"><Zap size={20} className="rotate-180"/></div>
          <div>
            <h3 className="text-[12px] font-black text-rose-500 italic uppercase leading-none">Alerta de Déficit de Operação</h3>
            <p className="text-[9px] font-bold text-rose-500/80 mt-1 uppercase">Sua reserva de combustível foi consumida por gastos manuais. Próximas corridas serão sequestradas para reposição.</p>
          </div>
        </div>
      )}

      {/* HUD Superior (Máx 25% altura implícito por conteúdo) */}
      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-3xl shadow-lg space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-2xl flex items-center justify-center text-[#3B82F6]"><User size={20}/></div>
            <div>
              <p className="text-[9px] font-bold text-[#64748B] italic uppercase">Expediente</p>
              <p className="text-[14px] font-black text-[#F1F5F9] italic tracking-tighter">STATUS OPERACIONAL</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-[#64748B] flex items-center justify-end gap-1 uppercase"><Gauge size={12}/> ODO KM</p>
            <p className="text-xl font-black text-[#F1F5F9]">{formatOdometer(state.currentOdo)}</p>
          </div>
        </div>
      </div>

      <NetProfitProgressBar />

      {/* KM Breakdown per App */}
      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-3xl shadow-lg space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black text-[#64748B] italic uppercase tracking-widest">Km por Aplicativo</h3>
          <p className="text-[9px] font-bold text-[#3B82F6] italic uppercase">Total: {formatKm(state.currentOdo - (state.dayStartOdo ?? state.currentOdo))} km</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const groupedKm: Record<string, number> = {};
            Object.entries(state.kmPerApp || {}).forEach(([appId, km]) => {
              const app = state.transportApps.find(a => a.id === appId);
              const name = (appId === 'particular' ? 'Particular' : (app?.name || 'Outro')).trim();
              if (km > 0) {
                groupedKm[name] = (groupedKm[name] || 0) + km;
              }
            });
            const entries = Object.entries(groupedKm);
            if (entries.length === 0) {
              return (
                <div className="col-span-2 text-center py-2">
                  <p className="text-[9px] font-bold text-[#64748B] uppercase italic">Aguardando movimento...</p>
                </div>
              );
            }
            return entries.map(([name, km]) => (
              <div key={name} className="bg-[#0F172A] p-3 rounded-2xl border border-[#334155] flex flex-col">
                <span className="text-[8px] font-black text-[#64748B] uppercase italic">{name}</span>
                <span className="text-[14px] font-black text-[#F1F5F9] italic">{formatKm(km)} km</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {surplusSuggestion && (
         <div className="bg-[#10B981]/10 border-2 border-[#10B981]/30 p-4 rounded-3xl space-y-3 relative overflow-hidden group">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-[#10B981] rounded-2xl flex items-center justify-center text-white shadow-lg"><Zap size={20} fill="white"/></div>
               <div>
                  <h4 className="text-[13px] font-black text-[#F1F5F9] italic uppercase">Meta Batida!</h4>
                  <p className="text-[10px] font-bold text-[#10B981] italic uppercase">Amortização sugerida</p>
               </div>
            </div>
            <button onClick={() => applySurplus(surplusSuggestion.amount)} className="w-full bg-[#10B981] text-white py-3.5 rounded-2xl font-black italic text-[11px] uppercase shadow-lg active:scale-95 transition-all">RESERVAR R$ {formatCurrency(surplusSuggestion.amount)} ✓</button>
         </div>
      )}

      {/* Botão de Ação Principal (Padronizado) */}
      {!state.activeShift ? (
        <button onClick={() => setShowShiftModal(true)} className="w-full btn-action bg-[#3B82F6] text-white flex flex-col items-center justify-center gap-1 shadow-xl">
          <Play size={20} fill="white" />
          <span className="text-[12px] tracking-widest">Iniciar Expediente</span>
        </button>
      ) : (
        <div className="flex flex-col gap-[16px]">
          <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-2xl flex items-center justify-between shadow-md">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[#64748B] italic uppercase">Plataforma Ativa</span>
              <span className="text-[14px] font-black text-[#F1F5F9]">{activeApp?.name || '---'}</span>
            </div>
            <button onClick={() => setShowShiftModal(true)} className="bg-[#3B82F6]/10 text-[#3B82F6] px-3 py-1.5 rounded-xl text-[10px] font-black italic border border-[#3B82F6]/20 uppercase">Trocar App</button>
          </div>

          <div className="flex flex-col gap-[16px]">
            {state.rideStage === 'idle' && (
              <button onClick={() => onUpdateRideStage('accepted')} className="w-full btn-action bg-[#1E293B] border-2 border-[#3B82F6] text-[#3B82F6] flex items-center justify-center gap-3 shadow-xl">NOVA CORRIDA <ChevronRight size={20}/></button>
            )}
            {state.rideStage === 'accepted' && (
              <button onClick={() => onUpdateRideStage('boarding')} className="w-full btn-action bg-white text-[#0F172A] shadow-xl">EMBARCAR PASSAGEIRO</button>
            )}
            {state.rideStage === 'boarding' && (
              <button onClick={() => setShowFinishModal(true)} className="w-full btn-action bg-[#3B82F6] text-white flex items-center justify-center shadow-xl">FINALIZAR CORRIDA</button>
            )}
            
            {state.rideStage !== 'idle' && (
              <button 
                onClick={() => onUpdateRideStage('idle')} 
                className="w-full py-2 text-rose-500 text-[10px] font-black italic uppercase tracking-wider hover:bg-rose-500/5 rounded-xl transition-colors"
              >
                Cancelar corrida
              </button>
            )}

            <button onClick={() => setShowEndShiftModal(true)} className="w-full py-3 bg-transparent border border-rose-500/30 text-rose-500 rounded-2xl text-[10px] font-black italic uppercase tracking-wider">Parar Expediente</button>
          </div>
        </div>
      )}

      {/* Histórico Hoje */}
      <div className="flex flex-col gap-[12px]">
        <h3 className="text-[10px] font-black italic tracking-widest text-[#64748B] border-l-4 border-[#3B82F6] pl-3 uppercase">Histórico Hoje</h3>
        {todayRides.length === 0 ? (
          <div className="py-12 text-center opacity-20">
            <Smartphone size={24} className="mx-auto mb-2"/>
            <p className="text-[10px] font-black uppercase">Nenhum registro</p>
          </div>
        ) : (
          todayRides.map(ride => {
            const startDate = new Date(ride.startTime);
            const endDate = new Date(ride.endTime);
            const isExpanded = expandedRideId === ride.id;
            const showEndDate = startDate.toDateString() !== endDate.toDateString();
            const isCompact = state.preferences.cardLayout === 'compact';

            return (
              <div key={ride.id} className={`bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${isCompact ? 'p-1' : ''}`}>
                <div 
                  className={`${isCompact ? 'p-2' : 'p-4'} cursor-pointer active:bg-[#0F172A]/50`} 
                  onClick={() => setExpandedRideId(isExpanded ? null : ride.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[#3B82F6] font-black uppercase italic ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>{startDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
                        <span className={`font-black text-[#F1F5F9] italic ${isCompact ? 'text-[9px]' : 'text-[11px]'}`}>{startDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                        <ChevronRight size={isCompact ? 8 : 10} className="text-[#64748B]" />
                        <span className={`font-black text-[#F1F5F9] italic ${isCompact ? 'text-[9px]' : 'text-[11px]'}`}>{endDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                        {showEndDate && (
                          <span className={`font-black text-rose-500 uppercase italic ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>({endDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-[#64748B] uppercase tracking-widest ${isCompact ? 'text-[6px]' : 'text-[8px]'}`}>{ride.appName}</p>
                        <span className={`px-1.5 py-0.5 rounded-md bg-[#0F172A] border border-[#334155] font-black uppercase italic text-[#64748B] ${isCompact ? 'text-[5px]' : 'text-[7px]'}`}>
                          {ride.paymentMethod === 'cash' ? 'Dinheiro' : ride.paymentMethod === 'pix' ? 'Pix' : ride.paymentMethod === 'debit' ? 'Débito' : 'Crédito'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditRide(ride); }}
                          className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg hover:bg-[#3B82F6]/20 transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                        <div>
                          <p className={`font-black text-[#F1F5F9] italic leading-none ${isCompact ? 'text-[12px]' : 'text-[14px]'}`}>R$ {formatCurrency(ride.valueGross || 0)}</p>
                          <p className={`font-bold text-[#10B981] mt-1 ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>Líq: R$ {formatCurrency(ride.valuePocket || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#334155]/50 space-y-4 animate-slide-up">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/30">
                          <p className="text-[6px] font-bold text-[#64748B] uppercase mb-1">Km até embarque</p>
                          <p className="text-[10px] font-black text-[#F1F5F9] italic">{formatKm(ride.telemetry.kmDisplacement || 0)} km</p>
                        </div>
                        <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/30">
                          <p className="text-[6px] font-bold text-[#64748B] uppercase mb-1">Km com passageiro</p>
                          <p className="text-[10px] font-black text-[#F1F5F9] italic">{formatKm(ride.telemetry.kmProductive || 0)} km</p>
                        </div>
                        <div className="bg-[#3B82F6]/10 p-2 rounded-xl border border-[#3B82F6]/30">
                          <p className="text-[6px] font-bold text-[#3B82F6] uppercase mb-1">Km Total Corrida</p>
                          <p className="text-[10px] font-black text-[#3B82F6] italic">{formatKm((ride.telemetry.kmDisplacement || 0) + (ride.telemetry.kmProductive || 0))} km</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-[#64748B] uppercase italic tracking-widest px-1">Detalhamento de Descontos</p>
                        <div className="bg-[#0F172A] rounded-2xl p-3 border border-[#334155]/30 space-y-2">
                          <div className="flex justify-between items-center text-[10px] pb-1 border-b border-[#334155]/20">
                            <span className="text-[#64748B] font-bold uppercase">Forma de Pagamento</span>
                            <span className="text-[#F1F5F9] font-black italic uppercase">
                              {ride.paymentMethod === 'cash' ? 'Dinheiro' : ride.paymentMethod === 'pix' ? 'Pix' : ride.paymentMethod === 'debit' ? 'Débito' : 'Crédito'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] pb-1 border-b border-[#334155]/20">
                            <span className="text-[#F1F5F9] font-black uppercase">Valor Bruto</span>
                            <span className="text-[#F1F5F9] font-black italic">R$ {formatCurrency(ride.valueGross)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#64748B] font-bold uppercase">Taxa do App ({formatPercent(ride.feePercent)})</span>
                            <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.feeValue || 0)}</span>
                          </div>
                          {ride.cardFeeValue > 0 && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-[#64748B] font-bold uppercase">Taxa Cartão ({ride.paymentMethod === 'debit' ? 'Débito' : 'Crédito'} - {formatPercent((ride.cardFeeValue / ride.valueGross) * 100)})</span>
                              <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.cardFeeValue || 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#64748B] font-bold uppercase">Combustível (Estimado)</span>
                            <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.reservesApplied.fuel || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#64748B] font-bold uppercase">Manutenção</span>
                            <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.reservesApplied.maintenance || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[#64748B] font-bold uppercase">Meta Diária (Salário/Gastos)</span>
                            <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.reservesApplied.salaryFixed || 0)}</span>
                          </div>
                          {(ride.reservesApplied.dailyExpense || 0) > 0 && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-[#64748B] font-bold uppercase">Gastos Variáveis</span>
                              <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.reservesApplied.dailyExpense!)}</span>
                            </div>
                          )}
                          {(ride.reservesApplied.surplusReserve || 0) > 0 && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-[#64748B] font-bold uppercase">Reserva de Sobra (10,00%)</span>
                              <span className="text-rose-500 font-black italic">- R$ {formatCurrency(ride.reservesApplied.surplusReserve!)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-[#334155]/50 text-[11px]">
                            <span className="text-[#10B981] font-black uppercase italic">Líquido Pocket Livre</span>
                            <span className="text-[#10B981] font-black italic">R$ {formatCurrency(ride.valuePocket || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-2">
                    {isExpanded ? <ChevronUp size={14} className="text-[#3B82F6]"/> : <ChevronDown size={14} className="text-[#64748B]"/>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Edição de Corrida */}
      {editingRide && (
        <div className="fixed inset-0 bg-black/95 z-[9000] p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-[360px] p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center">
            <h2 className="text-[14px] font-black text-[#F1F5F9] italic uppercase tracking-widest">EDITAR CORRIDA</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-[#64748B] uppercase italic mb-1 block">VALOR BRUTO</label>
                <div className="flex items-center justify-center gap-3 bg-[#0F172A] p-4 rounded-2xl border border-[#334155]">
                    <span className="text-2xl font-black text-[#64748B] italic">R$</span>
                    <input type="text" inputMode="decimal" className="bg-transparent w-32 text-center outline-none text-4xl font-black text-[#3B82F6]" value={editValue} onChange={e => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={e => {
                      const val = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(val)) setEditValue(val.toFixed(2).replace('.', ','));
                    }} />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[9px] font-black text-[#64748B] uppercase italic">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setEditPayment('cash')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${editPayment === 'cash' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Dinheiro</button>
                  <button onClick={() => setEditPayment('pix')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${editPayment === 'pix' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Pix</button>
                  <button onClick={() => setEditPayment('debit')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${editPayment === 'debit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Débito</button>
                  <button onClick={() => setEditPayment('credit')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${editPayment === 'credit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Crédito</button>
                </div>
              </div>
            </div>

            <button onClick={saveRideEdit} className="w-full btn-action bg-[#3B82F6] text-white shadow-xl">SALVAR ALTERAÇÕES ✓</button>
            <button onClick={() => setEditingRide(null)} className="text-[#64748B] font-bold text-[11px] mt-4 uppercase">Cancelar</button>
          </div>
        </div>
      )}

      {/* Modais com Z-Index Reforçado */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/95 z-[9000] p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-[360px] p-8 rounded-[2.5rem] space-y-6 shadow-2xl animate-slide-up">
            {!isAddingApp ? (
              <>
                <h2 className="text-[14px] font-black text-[#F1F5F9] italic text-center uppercase tracking-widest">CONFIGURAR EXPEDIENTE</h2>
                <div className="space-y-6">
                  <div className="text-center bg-[#0F172A] p-4 rounded-3xl border border-[#334155]">
                    <label className="text-[9px] font-bold text-[#64748B] italic block mb-1 uppercase">ODÔMETRO INICIAL</label>
                    <input className="w-full bg-transparent text-center text-4xl font-black text-[#3B82F6] outline-none" type="text" inputMode="numeric" placeholder={formatOdometer(state.currentOdo)} value={shiftOdo} onChange={e => setShiftOdo(e.target.value.replace(/\D/g, '').slice(0,6))} onBlur={e => setShiftOdo(e.target.value.padStart(6, '0'))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      {state.transportApps.map(a => (
                        <button key={a.id} onClick={() => onSelectApp(a.id)} className={`p-3 rounded-2xl border font-black italic text-[11px] transition-all ${state.selectedAppId === a.id ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-lg' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>{a.name}</button>
                      ))}
                      <button onClick={() => setIsAddingApp(true)} className="p-3 rounded-2xl border border-dashed border-[#3B82F6] text-[#3B82F6] font-black italic text-[11px] flex items-center justify-center gap-2 uppercase"><Plus size={14}/> NOVO APP</button>
                  </div>
                  <button onClick={() => { const odo = shiftOdo === '' ? state.currentOdo : parseInt(shiftOdo); if(!isNaN(odo) && state.selectedAppId) { onStartShift(odo, state.selectedAppId); setShowShiftModal(false); } }} disabled={!state.selectedAppId} className="w-full btn-action bg-[#3B82F6] text-white shadow-xl disabled:opacity-30">ABRIR EXPEDIENTE ✓</button>
                  <button onClick={() => setShowShiftModal(false)} className="w-full text-[#64748B] font-bold text-[10px] uppercase text-center">Cancelar</button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                  <h2 className="text-[14px] font-black text-[#F1F5F9] italic text-center uppercase tracking-widest">CADASTRAR APP</h2>
                  <div className="space-y-3">
                    <input className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-2xl font-bold text-[#F1F5F9] outline-none text-[13px]" placeholder="Nome do App (Ex: Uber)" value={newAppName} onChange={e => setNewAppName(e.target.value)} />
                    <input className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-2xl font-bold text-[#F1F5F9] outline-none text-[13px]" type="text" inputMode="decimal" placeholder="Taxa do App (%)" value={newAppFee} onChange={e => setNewAppFee(e.target.value.replace(/[^0-9.,%]/g, ''))} onBlur={() => {
                      const num = parseFloat(newAppFee.replace('%', '').replace(',', '.'));
                      if (!isNaN(num)) setNewAppFee(formatPercent(num));
                    }} />
                    
                    <div className="bg-[#0F172A] border border-[#334155] p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-[#F1F5F9] italic uppercase">Valor Fixo?</span>
                        <span className="text-[8px] font-bold text-[#64748B] uppercase">Sempre o mesmo valor bruto</span>
                      </div>
                      <button onClick={() => setNewAppFixed(!newAppFixed)} className={`p-1 rounded-lg transition-all ${newAppFixed ? 'text-[#3B82F6]' : 'text-[#64748B]'}`}>
                        {newAppFixed ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>

                    {newAppFixed && (
                      <div className="animate-slide-up">
                        <input className="w-full bg-[#0F172A] border-2 border-[#3B82F6]/30 p-4 rounded-2xl font-black text-[#3B82F6] outline-none text-[13px]" type="text" inputMode="decimal" placeholder="Valor da Corrida (R$)" value={newAppFixedVal} onChange={e => setNewAppFixedVal(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={e => {
                          const val = parseFloat(e.target.value.replace(',', '.'));
                          if (!isNaN(val)) setNewAppFixedVal(val.toFixed(2).replace('.', ','));
                        }} />
                      </div>
                    )}
                  </div>
                  <button onClick={() => { if(newAppName && newAppFee) { const app = { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36), name: newAppName.trim(), feePercent: parseFloat(newAppFee.replace('%', '').replace(',','.')), isFixedPrice: newAppFixed, fixedPriceValue: parseFloat(newAppFixedVal.replace(',','.')) || 0 }; onAddTransportApp(app); onSelectApp(app.id); setIsAddingApp(false); setNewAppName(''); setNewAppFee(''); setNewAppFixed(false); setNewAppFixedVal(''); } }} className="w-full btn-action bg-[#3B82F6] text-white shadow-xl">SALVAR APP ✓</button>
                  <button onClick={() => setIsAddingApp(false)} className="w-full text-[#64748B] font-bold text-[10px] uppercase text-center">Voltar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showFinishModal && (
        <div className="fixed inset-0 bg-black/95 z-[9000] p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-[360px] p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center">
            <h2 className="text-[14px] font-black text-[#F1F5F9] italic uppercase tracking-widest">FINALIZAR CORRIDA</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-[#64748B] uppercase italic mb-1 block">GANHO BRUTO</label>
                <div className="flex items-center justify-center gap-3 bg-[#0F172A] p-4 rounded-2xl border border-[#334155]">
                    <span className="text-2xl font-black text-[#64748B] italic">R$</span>
                    <input type="text" inputMode="decimal" className="bg-transparent w-32 text-center outline-none text-4xl font-black text-[#3B82F6]" placeholder="0,00" autoFocus value={rideValue} onChange={e => setRideValue(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={e => {
                      const val = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(val)) setRideValue(val.toFixed(2).replace('.', ','));
                    }} />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-[#64748B] uppercase italic mb-1 block">ODÔMETRO ATUAL (KM)</label>
                <div className="flex items-center justify-center gap-3 bg-[#0F172A] p-4 rounded-2xl border border-[#334155]">
                    <Gauge size={20} className="text-[#64748B]"/>
                    <input type="text" inputMode="numeric" className="bg-transparent w-32 text-center outline-none text-4xl font-black text-amber-500" placeholder={formatOdometer(state.currentOdo)} value={rideOdo} onChange={e => setRideOdo(e.target.value.replace(/\D/g, '').slice(0,6))} onBlur={e => setRideOdo(e.target.value.padStart(6, '0'))} />
                </div>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <label className="text-[9px] font-black text-[#64748B] uppercase italic">Forma de Pagamento</label>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setPaymentMethod('cash')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'cash' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Dinheiro</button>
                <button onClick={() => setPaymentMethod('pix')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'pix' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Pix</button>
                <button onClick={() => setPaymentMethod('debit')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'debit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Débito</button>
                <button onClick={() => setPaymentMethod('credit')} className={`py-3 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'credit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Crédito</button>
              </div>
            </div>

            <button onClick={() => { 
              const gross = parseFloat(rideValue.replace(',','.')); 
              const odo = rideOdo === '' ? state.currentOdo : parseInt(rideOdo);
              
              if(!isNaN(gross) && state.activeShift && activeApp) { 
                const startOdo = state.rideAcceptedOdo || state.lastRideEndOdo || state.currentOdo;
                const boardingOdo = state.rideBoardingOdo || startOdo;
                const kmEmpty = Math.max(0, startOdo - (state.lastRideEndOdo || state.currentOdo));
                const kmDisplacement = Math.max(0, boardingOdo - startOdo);
                const kmProductive = Math.max(0, odo - boardingOdo);
                const kmTotal = kmEmpty + kmDisplacement + kmProductive;

                const cardFeePercent = paymentMethod === 'debit' ? state.financialConfig?.cardFeeDebit : (paymentMethod === 'credit' ? state.financialConfig?.cardFeeCredit : 0);
                const cardFeeValue = gross * ((cardFeePercent || 0) / 100);
                const appFeeValue = gross * (activeApp.feePercent / 100);

                onAddRide({ 
                  id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36), 
                  timestamp: new Date().toISOString(), 
                  startTime: state.rideAcceptedTime || new Date().toISOString(),
                  endTime: new Date().toISOString(),
                  appName: activeApp.name, 
                  appId: activeApp.id, 
                  valueGross: gross, 
                  feePercent: activeApp.feePercent, 
                  feeValue: appFeeValue, 
                  valueNet: gross - appFeeValue, 
                  valuePocket: 0,
                  valueOperational: 0,
                  reservesApplied: {
                    salaryFixed: 0,
                    fuel: 0,
                    maintenance: 0,
                    amortization: 0,
                  },
                  telemetry: {
                    kmEmpty,
                    kmDisplacement,
                    kmProductive,
                    kmTotal
                  },
                  snapshot: {
                    fuelPrice: state.vehicle?.lastPricePerLiter || 5.80,
                    avgConsumption: state.vehicle?.estimatedKmL || 10,
                    fuelRate: 0,
                    maintRate: 0,
                  },
                  paymentMethod, 
                  cardFeeValue,
                  shiftId: state.activeShift.id
                }, odo); 
                setShowFinishModal(false); 
                setRideValue(''); 
                setRideOdo('');
                setPaymentMethod('cash'); 
              } 
            }} className="w-full btn-action bg-[#3B82F6] text-white shadow-xl">CONFIRMAR GANHO ✓</button>
            <button onClick={() => setShowFinishModal(false)} className="text-[#64748B] font-bold text-[11px] mt-4 uppercase">Voltar</button>
          </div>
        </div>
      )}

      {showEndShiftModal && (
        <div className="fixed inset-0 bg-black/95 z-[9000] p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-[360px] p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center animate-slide-up">
            <h2 className="text-[14px] font-black text-[#F1F5F9] italic uppercase tracking-widest">PARAR EXPEDIENTE</h2>
            <div className="space-y-6">
                <div className="bg-[#0F172A] p-6 rounded-3xl border border-[#334155]">
                    <label className="text-[9px] font-bold text-[#64748B] italic block mb-1 uppercase">ODÔMETRO FINAL</label>
                    <input className="w-full bg-transparent text-center text-4xl font-black text-rose-500 outline-none" type="text" inputMode="numeric" placeholder={formatOdometer(state.currentOdo)} value={shiftOdo} onChange={e => setShiftOdo(e.target.value.replace(/\D/g, '').slice(0,6))} onBlur={e => setShiftOdo(e.target.value.padStart(6, '0'))} />
                </div>
              <button onClick={() => { 
                const odo = shiftOdo === '' ? state.currentOdo : parseInt(shiftOdo); 
                if(!isNaN(odo)) { 
                  onEndShift(odo, new Date().toISOString()); 
                  setShowEndShiftModal(false); 
                } 
              }} className="w-full btn-action bg-rose-500 text-white shadow-xl">PARAR EXPEDIENTE ✓</button>
              <button onClick={() => setShowEndShiftModal(false)} className="w-full text-[#64748B] font-bold text-[11px] uppercase">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RidesTab;
