
import React, { useState } from 'react';
import { Wrench, Plus, Trash2, Sparkles } from 'lucide-react';
import { MaintenancePlan, AppState } from '../types';
import { VEICULOS_DATA } from '../data/veiculos';
import { formatCurrency, formatKm, formatPercent } from '../utils/formatters';

interface MaintenanceTabProps {
  plans: MaintenancePlan[];
  onAdd: (plan: MaintenancePlan) => void;
  onDelete: (id: string) => void;
  onPerform: (id: string) => void;
  onUpdate: (id: string, updates: Partial<MaintenancePlan>) => void;
  state: AppState;
  reservasAtuais?: any;
}

const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ plans, onDelete, onAdd, onPerform, onUpdate, state }) => {
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState({ item: '', interval: '', value: '', alarm: '', lastDone: '' });

  const reservadoHoje = state.reservasAtuais?.manutencao || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.item || !data.interval || !data.value) return;
    onAdd({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
      item: data.item,
      intervalKm: parseInt(data.interval),
      lastDoneOdo: parseFloat(data.lastDone || state.currentOdo.toString()),
      estimatedValue: parseFloat(data.value.replace(',', '.')),
      alarmBeforeKm: parseInt(data.alarm || '1000')
    });
    setShowForm(false);
    setData({ item: '', interval: '', value: '', alarm: '', lastDone: '' });
  };

  const handleAutoFill = () => {
    if (!state.vehicle) return;
    
    const b = state.vehicle.brand.toLowerCase();
    const m = state.vehicle.model.toLowerCase();
    const modelData = VEICULOS_DATA[b]?.[m];
    
    let itemsToProcess = [];

    if (modelData) {
      // Tenta encontrar o ano correspondente ou pega o primeiro disponível
      const years = Object.keys(modelData);
      const vehicleYear = state.vehicle.year;
      
      let yearKey = years[0];
      if (vehicleYear) {
        const foundYear = years.find(y => {
          const [start, end] = y.split('/').map(v => parseInt(v));
          return vehicleYear >= start && (!end || vehicleYear <= end);
        });
        if (foundYear) yearKey = foundYear;
      }

      const yearData = modelData[yearKey]; 
      const engines = Object.keys(yearData);
      
      // Tenta match parcial no motor (ex: "1.0" match "1.0 Firefly")
      let engineKey = engines[0];
      if (state.vehicle.engine) {
        const foundEngine = engines.find(e => e.toLowerCase().includes(state.vehicle.engine!.toLowerCase()) || state.vehicle.engine!.toLowerCase().includes(e.toLowerCase()));
        if (foundEngine) engineKey = foundEngine;
      }
      
      const engineData = yearData[engineKey];
      
      if (engineData?.items) {
        itemsToProcess = engineData.items;
      }
    } 
    
    // Se não encontrou no banco estático, tenta o preset salvo no veículo
    if (itemsToProcess.length === 0 && state.vehicle.maintenancePreset) {
      itemsToProcess = state.vehicle.maintenancePreset;
    }

    if (itemsToProcess.length > 0) {
      itemsToProcess.forEach((item: any) => {
        // Match mais flexível para evitar duplicatas quase idênticas
        const isDuplicate = plans.some(p => 
          p.item.toLowerCase().includes(item.item.toLowerCase()) || 
          item.item.toLowerCase().includes(p.item.toLowerCase())
        );

        if (!isDuplicate) {
          onAdd({
            id: crypto.randomUUID(),
            item: item.item,
            intervalKm: item.intervalKm,
            lastDoneOdo: state.currentOdo,
            estimatedValue: item.estimatedValue,
            alarmBeforeKm: item.alarmBeforeKm || 1000
          });
        }
      });
    }
  };

  const totalPool = (state.reservasAtuais?.manutencao || 0) + (state.saldosAcumulados?.manutencao || 0);
  
  const plansWithNeeds = plans.map(p => {
    const kmRodado = Math.max(0, state.currentOdo - p.lastDoneOdo);
    const need = kmRodado * (p.estimatedValue / p.intervalKm);
    return { ...p, need, kmRodado };
  });

  const totalNeed = plansWithNeeds.reduce((acc, p) => acc + p.need, 0);

  return (
    <div className="space-y-4 animate-slide-up pb-8 px-1">
      <header className="flex justify-between items-center border-b border-[#334155] pb-3 px-1">
        <h1 className="text-xl font-black italic text-[#3B82F6] tracking-tighter uppercase">Manutenção</h1>
        <div className="flex gap-2">
          <button onClick={handleAutoFill} className="bg-[#1E293B] border border-[#3B82F6]/30 text-[#3B82F6] px-2 py-1.5 rounded-xl active:scale-90 transition-all flex items-center gap-2">
            <Sparkles size={14} />
            <span className="text-[9px] font-black italic uppercase">Sugestões</span>
          </button>
          <button onClick={() => setShowForm(true)} className="bg-[#3B82F6] text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all">
            <Plus size={18} />
          </button>
        </div>
      </header>

      <div className="bg-[#10B981]/10 py-2 px-4 rounded-2xl border border-[#10B981]/20 flex justify-between items-center mx-1 shadow-sm">
         <p className="text-[9px] font-black text-[#10B981] italic uppercase leading-none">Reservado expediente atual</p>
         <span className="text-[12px] font-black text-[#10B981] leading-none">R$ {formatCurrency(reservadoHoje)}</span>
      </div>

      <div className="space-y-3 px-1">
        {plans.length === 0 ? (
          <div className="py-12 text-center opacity-20">
             <Wrench size={32} className="mx-auto mb-2 text-[#64748B]"/>
             <p className="text-[10px] font-black italic uppercase">Sem planos cadastrados</p>
          </div>
        ) : (
          plansWithNeeds.map(plan => {
            const progress = Math.min(100, plan.intervalKm > 0 ? (plan.kmRodado / plan.intervalKm) * 100 : 0);
            const kmRestante = plan.intervalKm - plan.kmRodado;
            const rate = plan.intervalKm > 0 ? (plan.estimatedValue / plan.intervalKm) : 0;
            const totalRate = plansWithNeeds.reduce((acc, p) => acc + (p.intervalKm > 0 ? (p.estimatedValue / p.intervalKm) : 0), 0);
            
            let actualReserved = 0;
            if (totalNeed > 0) {
              actualReserved = (plan.need / totalNeed) * totalPool;
            } else if (totalRate > 0) {
              // Se KM rodado é zero, distribui proporcionalmente ao custo/km teórico (igual ao FinancialTab)
              actualReserved = (rate / totalRate) * totalPool;
            }
            
            const moneyProgress = Math.min(100, plan.estimatedValue > 0 ? (actualReserved / plan.estimatedValue) * 100 : 0);

            return (
              <div key={plan.id} className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="text-[12px] font-black text-[#F1F5F9] italic uppercase leading-none">{plan.item}</h4>
                        <p className="text-[9px] font-bold text-[#64748B] mt-1.5 uppercase tracking-wide">Intervalo: {formatKm(plan.intervalKm)} km • R$ {formatCurrency(plan.estimatedValue)}</p>
                            <div className="flex items-center gap-1">
                               <span className="text-[7px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md uppercase italic">Alerta:</span>
                               <input 
                                 type="number" 
                                 className="bg-transparent text-[7px] font-black text-rose-500 w-12 border-b border-rose-500/50 outline-none"
                                 value={plan.alarmBeforeKm}
                                 onChange={(e) => onUpdate(plan.id, { alarmBeforeKm: parseInt(e.target.value) || 0 })}
                               />
                               <span className="text-[7px] font-black text-rose-500 italic">km</span>
                            </div>
                     </div>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            onPerform(plan.id);
                          }}
                          className="bg-[#10B981] text-white px-3 py-1.5 rounded-xl text-[10px] font-black italic uppercase shadow-lg active:scale-90 transition-all flex items-center gap-1.5"
                        >
                          <Wrench size={12} />
                          Realizar
                        </button>
                        <button onClick={() => onDelete(plan.id)} className="text-slate-600 p-1 active:text-rose-500"><Trash2 size={16} /></button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {/* Barra de KM */}
                    <div className="space-y-1.5">
                       <div className="flex justify-between text-[8px] font-black italic uppercase tracking-wider">
                          <span className="text-[#64748B]">Km rodado: {formatKm(plan.kmRodado)}</span>
                          <span className={kmRestante <= plan.alarmBeforeKm ? 'text-rose-500 animate-pulse' : (progress > 90 ? 'text-rose-500' : 'text-[#3B82F6]')}>
                             {kmRestante <= plan.alarmBeforeKm ? `ALERTA: -${formatKm(kmRestante)}km` : formatPercent(progress)}
                          </span>
                       </div>
                       <div className="h-2 bg-[#0F172A] rounded-full overflow-hidden border border-[#334155]/30">
                          <div className={`h-full transition-all duration-500 ${progress > 90 ? 'bg-rose-500' : 'bg-[#3B82F6]'}`} style={{ width: `${progress}%` }} />
                       </div>
                    </div>

                    {/* Barra de Dinheiro */}
                    <div className="space-y-1.5">
                       <div className="flex justify-between text-[8px] font-black italic uppercase tracking-wider">
                          <span className="text-[#64748B]">Reservado: R$ {formatCurrency(actualReserved)}</span>
                          <span className={moneyProgress > 90 ? 'text-rose-500' : 'text-[#10B981]'}>{formatPercent(moneyProgress)}</span>
                       </div>
                       <div className="h-2 bg-[#0F172A] rounded-full overflow-hidden border border-[#334155]/30">
                          <div className={`h-full transition-all duration-500 ${moneyProgress > 90 ? 'bg-rose-500' : 'bg-[#10B981]'}`} style={{ width: `${moneyProgress}%` }} />
                       </div>
                    </div>
                  </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#0F172A]/95 z-[3000] p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-xs p-6 rounded-3xl space-y-4 shadow-2xl animate-slide-up">
            <h2 className="text-lg font-black text-[#F1F5F9] italic text-center uppercase tracking-widest">Nova manutenção</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
               <div className="space-y-1">
                  <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Item/Serviço</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[13px]" placeholder="Ex: Óleo e Filtro" value={data.item} onChange={e => setData({...data, item: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Km intervalo</label>
                      <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[13px]" type="text" inputMode="numeric" placeholder="Km" value={data.interval} onChange={e => setData({...data, interval: e.target.value.replace(/\D/g, '')})} onBlur={e => {
                        const val = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(val)) setData({...data, interval: val.toFixed(1).replace('.', ',')});
                      }} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-bold text-rose-500 italic px-1 uppercase">Alerta antes (Km)</label>
                      <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-rose-500 outline-none text-[13px]" type="text" inputMode="numeric" placeholder="1000" value={data.alarm} onChange={e => setData({...data, alarm: e.target.value.replace(/\D/g, '')})} onBlur={e => {
                        const val = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(val)) setData({...data, alarm: val.toFixed(1).replace('.', ',')});
                      }} />
                   </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-bold text-[#10B981] italic px-1 uppercase">Custo aprox. R$</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#10B981] outline-none text-[13px]" type="text" inputMode="decimal" placeholder="0,00" value={data.value} onChange={e => setData({...data, value: e.target.value.replace(/[^0-9.,]/g, '')})} onBlur={e => {
                    const val = parseFloat(e.target.value.replace(',', '.'));
                    if (!isNaN(val)) setData({...data, value: val.toFixed(2).replace('.', ',')});
                  }} />
               </div>
               <div className="pt-2 space-y-2">
                 <button type="submit" className="w-full bg-[#3B82F6] text-white py-3.5 rounded-2xl font-black italic shadow-xl text-[12px] uppercase tracking-wider">Cadastrar plano ✓</button>
                 <button type="button" onClick={() => setShowForm(false)} className="w-full text-[#64748B] font-bold text-[9px] text-center uppercase">Cancelar</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTab;
