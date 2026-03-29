import React, { useState, useCallback } from 'react';
import { Plus, Droplets, MapPin, CheckCircle, Settings2, Save, Edit2 } from 'lucide-react';
import { FuelEntry, AppState, Station } from '../types';
import FuelCalculator from './FuelCalculator';
import { useFuelStore } from '../store/useFuelStore';
import { formatCurrency, formatKm, formatOdometer } from '../utils/formatters';

interface FuelTabProps {
  entries: FuelEntry[];
  onAdd: (entry: FuelEntry) => void;
  onAddStation: (name: string) => Station;
  onUpdateVehicle: (updates: any) => void;
  state: AppState;
  tankLevel: number;
}

const FuelTab: React.FC<FuelTabProps> = ({ entries, onAdd, onAddStation, onUpdateVehicle, state, tankLevel }) => {
  const fuelStore = useFuelStore();
  const [showForm, setShowForm] = useState(false);
  const [manualInputs, setManualInputs] = useState({
    price: fuelStore.precoAtual ? fuelStore.precoAtual.toFixed(2).replace('.', ',') : '',
    kmL: fuelStore.medioKmL ? fuelStore.medioKmL.toFixed(1).replace('.', ',') : '',
    fuelType: fuelStore.tipoAtual
  });
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);

  const [data, setData] = useState({ 
    totalValue: '', 
    price: '', 
    liters: '', 
    odo: '', 
    stationName: '', 
    fuelType: 'Gasolina' as 'Gasolina' | 'Etanol' | 'Diesel', 
    isFullTank: false,
    paymentMethod: 'cash' as 'cash' | 'debit' | 'pix'
  });

  const handleSaveManual = () => {
    const p = parseFloat(manualInputs.price.replace(',', '.'));
    const k = parseFloat(manualInputs.kmL.replace(',', '.'));
    if (!isNaN(p) && !isNaN(k)) {
      fuelStore.setManualConfig(k, p, manualInputs.fuelType);
      setShowManualConfig(false);
    }
  };

  const handleTotalValueChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.,]/g, '');
    setData(prev => {
      const numVal = parseFloat(cleanVal.replace(',', '.'));
      const numPrc = parseFloat(prev.price.replace(',', '.'));
      const liters = (!isNaN(numVal) && !isNaN(numPrc) && numPrc > 0) 
        ? (numVal / numPrc).toFixed(2).replace('.', ',') 
        : '';
      return { ...prev, totalValue: cleanVal, liters };
    });
  };

  const handlePriceChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.,]/g, '');
    setData(prev => {
      const numPrc = parseFloat(cleanVal.replace(',', '.'));
      const numVal = parseFloat(prev.totalValue.replace(',', '.'));
      const liters = (!isNaN(numVal) && !isNaN(numPrc) && numPrc > 0) 
        ? (numVal / numPrc).toFixed(2).replace('.', ',') 
        : '';
      return { ...prev, price: cleanVal, liters };
    });
  };

  const getSuggestedPrice = useCallback((fuel: 'Gasolina' | 'Etanol' | 'Diesel', stationName: string) => {
    if (!stationName) {
      const globalPrice = fuel === 'Gasolina' ? state.vehicle?.lastPricePerLiter : state.vehicle?.lastPriceEth;
      return globalPrice && globalPrice > 0 ? globalPrice.toFixed(2) : '';
    }

    const stationEntries = entries.filter(e => e.stationName.toUpperCase() === stationName.toUpperCase());
    const lastOfThisFuelAtStation = stationEntries.find(e => e.fuelType === fuel);
    
    if (lastOfThisFuelAtStation) {
      return lastOfThisFuelAtStation.pricePerLiter.toFixed(2);
    }

    const globalSaved = fuel === 'Gasolina' ? state.vehicle?.lastPricePerLiter : state.vehicle?.lastPriceEth;
    if (globalSaved && globalSaved > 0) {
      return globalSaved.toFixed(2);
    }

    return ''; 
  }, [entries, state.vehicle]);

  const handleOpenForm = () => {
    const suggestedPrice = getSuggestedPrice(data.fuelType, data.stationName);
    setData(prev => ({
      ...prev,
      price: suggestedPrice || prev.price,
      odo: prev.odo || formatOdometer(state.currentOdo)
    }));
    setShowForm(true);
  };

  const tankPercent = Math.min(100, Math.max(0, (tankLevel / (state.vehicle?.tankCapacity || 47)) * 100));
  const saldoARepor = (state.reservasAtuais?.combustivel || 0) + (state.saldosAcumulados?.combustivel || 0);

  const handleSave = () => {
    const valNum = parseFloat(data.totalValue.replace(',', '.'));
    const priceNum = parseFloat(data.price.replace(',', '.'));
    const odoNum = parseInt(data.odo);
    
    if (isNaN(valNum) || isNaN(priceNum) || isNaN(odoNum) || !data.stationName) return;
    
    const litersNum = !isNaN(parseFloat(data.liters.replace(',', '.'))) 
      ? parseFloat(data.liters.replace(',', '.'))
      : (valNum / priceNum);

    if (editingEntry) {
      useFinanceStore.getState().updateFuelEntry(editingEntry.id, {
        liters: litersNum,
        pricePerLiter: priceNum,
        totalValue: valNum,
        odometer: odoNum,
        stationName: data.stationName.toUpperCase(),
        fuelType: data.fuelType,
        isFullTank: data.isFullTank,
        paymentMethod: data.paymentMethod
      });
      setEditingEntry(null);
    } else {
      const station = state.stations.find(s => s.name === data.stationName.toUpperCase()) || onAddStation(data.stationName.toUpperCase());

      onAdd({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        liters: litersNum,
        pricePerLiter: priceNum,
        totalValue: valNum,
        odometer: odoNum,
        stationId: station.id,
        stationName: station.name,
        fuelType: data.fuelType,
        isFullTank: data.isFullTank,
        paymentMethod: data.paymentMethod
      });
    }

    if (data.fuelType === 'Gasolina') {
      onUpdateVehicle({ lastPricePerLiter: priceNum });
    } else {
      onUpdateVehicle({ lastPriceEth: priceNum });
    }

    setShowForm(false);
    setData({ totalValue: '', price: '', liters: '', odo: '', stationName: '', fuelType: 'Gasolina', isFullTank: false, paymentMethod: 'cash' });
  };

  const valueInputRef = React.useRef<HTMLInputElement>(null);

  const handleStationClick = (s: Station) => {
    const lastEntryAtThisStation = entries.find(e => e.stationId === s.id);
    const initialFuel = lastEntryAtThisStation ? lastEntryAtThisStation.fuelType : data.fuelType;
    const suggestedPrice = getSuggestedPrice(initialFuel, s.name);
    
    setData(prev => ({ 
      ...prev, 
      stationName: s.name,
      fuelType: initialFuel,
      price: suggestedPrice,
      totalValue: ''
    }));
    setShowForm(true);
    
    // Focus input after modal opens
    setTimeout(() => {
      valueInputRef.current?.focus();
    }, 100);
  };

  const getStationLastPrice = (stationId: string) => {
    const last = entries.find(e => e.stationId === stationId);
    return last ? last.pricePerLiter : null;
  };

  const handleFuelTypeChange = (type: 'Gasolina' | 'Etanol' | 'Diesel') => {
    if (data.fuelType !== type) {
      const suggestedPrice = getSuggestedPrice(type as any, data.stationName);
      setData(prev => ({ ...prev, fuelType: type, price: suggestedPrice }));
    }
  };

  const handleEditEntry = (entry: FuelEntry) => {
    setEditingEntry(entry);
    setData({
      totalValue: entry.totalValue.toFixed(2).replace('.', ','),
      price: entry.pricePerLiter.toFixed(2).replace('.', ','),
      liters: entry.liters.toFixed(2).replace('.', ','),
      odo: entry.odometer.toString().padStart(6, '0'),
      stationName: entry.stationName,
      fuelType: entry.fuelType,
      isFullTank: entry.isFullTank,
      paymentMethod: entry.paymentMethod || 'cash'
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
    setData({ totalValue: '', price: '', liters: '', odo: '', stationName: '', fuelType: 'Gasolina', isFullTank: false, paymentMethod: 'cash' });
  };

  return (
    <div className="space-y-4 animate-slide-up pb-8 px-1">
      <header className="flex justify-between items-center border-b border-[#334155] pb-2 px-1">
        <h1 className="text-xl font-black italic text-[#3B82F6] tracking-tighter">Combustível</h1>
        <button onClick={handleOpenForm} className="bg-[#3B82F6] text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all">
          <Plus size={20} />
        </button>
      </header>

      <div className="bg-[#1E293B] border-2 border-[#10B981]/30 p-3 rounded-2xl shadow-xl">
         <p className="text-[8px] font-black text-[#64748B] italic tracking-widest mb-1 uppercase leading-none">Dívida de reposição (Km rodado)</p>
         <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#10B981] italic">R$</span>
            <h2 className="text-3xl font-black text-[#F1F5F9] italic tracking-tighter leading-none">{formatCurrency(saldoARepor)}</h2>
         </div>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-2xl shadow-lg space-y-3">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[8px] font-black text-[#64748B] italic tracking-widest uppercase leading-none">Nível do tanque</p>
            <h2 className="text-xl font-black italic text-[#F1F5F9] tracking-tighter leading-none">{formatKm(tankLevel)}L</h2>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-[#64748B] italic tracking-widest uppercase leading-none">Autonomia</p>
            <h2 className="text-lg font-black italic text-[#10B981] tracking-tighter leading-none">~{formatKm(tankLevel * (state.vehicle?.estimatedKmL || 10))}km</h2>
          </div>
        </div>
        <div className="relative h-2 bg-[#0F172A] rounded-full border border-[#334155] overflow-hidden">
          <div className={`h-full transition-all duration-1000 bg-gradient-to-r ${tankPercent > 50 ? 'from-[#3B82F6] to-[#10B981]' : 'from-[#3B82F6] to-amber-500'}`} style={{ width: `${tankPercent}%` }} />
        </div>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-2xl shadow-lg space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-[#3B82F6]"/>
            <h3 className="text-[10px] font-black italic tracking-widest text-[#F1F5F9] uppercase">Configuração de Consumo</h3>
          </div>
          <button 
            onClick={() => setShowManualConfig(!showManualConfig)}
            className="text-[8px] font-black text-[#3B82F6] uppercase underline"
          >
            {showManualConfig ? 'Fechar' : 'Ajustar Valores'}
          </button>
        </div>

        {showManualConfig ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
              <button 
                onClick={() => setManualInputs({...manualInputs, fuelType: 'Gasolina'})} 
                className={`flex-1 py-1.5 rounded-xl border font-black italic text-[9px] transition-all ${manualInputs.fuelType === 'Gasolina' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}
              >
                Gasolina
              </button>
              <button 
                onClick={() => setManualInputs({...manualInputs, fuelType: 'Etanol'})} 
                className={`flex-1 py-1.5 rounded-xl border font-black italic text-[9px] transition-all ${manualInputs.fuelType === 'Etanol' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}
              >
                Etanol
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Preço/L Atual (R$)</label>
                <input 
                  className="w-full bg-[#0F172A] border border-[#334155] p-2 rounded-xl font-black text-[11px] text-[#3B82F6] outline-none" 
                  type="text" 
                  inputMode="decimal"
                  value={manualInputs.price}
                  onChange={e => setManualInputs({...manualInputs, price: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Média Estimada (Km/L)</label>
                <input 
                  className="w-full bg-[#0F172A] border border-[#334155] p-2 rounded-xl font-black text-[11px] text-[#10B981] outline-none" 
                  type="text" 
                  inputMode="decimal"
                  value={manualInputs.kmL}
                  onChange={e => setManualInputs({...manualInputs, kmL: e.target.value})}
                />
              </div>
            </div>
            <button 
              onClick={handleSaveManual}
              className="w-full bg-[#3B82F6] text-white py-2 rounded-xl font-black italic text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Save size={14}/> Salvar Configuração
            </button>
            <p className="text-[7px] text-[#64748B] italic text-center leading-tight">
              *Estes valores serão usados para os cálculos de meta e lucro até que você faça um abastecimento de "Tanque Cheio".
            </p>
          </div>
        ) : (
          <div className="flex justify-between items-center px-1">
            <div className="text-center flex-1 border-r border-[#334155]">
              <p className="text-[7px] font-bold text-[#64748B] uppercase">Preço ({fuelStore.tipoAtual})</p>
              <p className="text-xs font-black text-[#3B82F6]">R$ {formatCurrency(fuelStore.precoAtual)}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[7px] font-bold text-[#64748B] uppercase">Média ({fuelStore.tipoAtual})</p>
              <p className="text-xs font-black text-[#10B981]">{formatKm(fuelStore.medioKmL)} Km/L</p>
            </div>
          </div>
        )}
      </div>

      <FuelCalculator state={state} onUpdateVehicle={onUpdateVehicle} />

      {state.stations.length > 0 && (
        <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-2xl space-y-2 shadow-sm">
           <h3 className="text-[8px] font-black italic tracking-widest text-[#3B82F6] uppercase flex items-center gap-2 px-1"><MapPin size={10}/> Postos salvos</h3>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
              {state.stations.map(s => {
                const lastPrice = getStationLastPrice(s.id);
                return (
                  <button 
                    key={s.id} 
                    onClick={() => handleStationClick(s)} 
                    className="bg-[#0F172A] border border-[#334155] px-3 py-2 rounded-xl flex flex-col items-center min-w-[80px] active:scale-95 transition-all"
                  >
                    <span className="text-[10px] font-black text-[#F1F5F9] uppercase italic">{s.name}</span>
                    {lastPrice && <span className="text-[8px] font-bold text-[#3B82F6]">R$ {formatCurrency(lastPrice)}</span>}
                  </button>
                );
              })}
           </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-[8px] font-black italic tracking-widest text-[#64748B] border-l-4 border-[#3B82F6] pl-3 uppercase">Histórico recente</h3>
        {entries.slice(0, 3).map(e => (
          <div key={e.id} className="bg-[#1E293B] border border-[#334155] p-3 rounded-2xl flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <Droplets size={16} className="text-[#3B82F6]"/>
              <div>
                <p className="text-[8px] font-bold text-[#64748B] leading-none uppercase">{new Date(e.date).toLocaleDateString()}</p>
                <p className="text-[11px] font-black text-[#F1F5F9] italic leading-tight mt-1">{e.fuelType} • {formatCurrency(e.liters)}L em {e.stationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-black text-[#10B981] leading-none">R$ {formatCurrency(e.totalValue)}</p>
              <button 
                onClick={() => handleEditEntry(e)}
                className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg hover:bg-[#3B82F6]/20 transition-colors"
              >
                <Edit2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#0F172A]/95 z-[3000] p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-xs p-6 rounded-3xl space-y-4 shadow-2xl animate-slide-up">
            <h2 className="text-[12px] font-black text-[#F1F5F9] italic text-center uppercase tracking-widest">{editingEntry ? 'Editar abastecimento' : 'Novo abastecimento'}</h2>
            <div className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Local/Posto</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[11px]" placeholder="Nome do posto" value={data.stationName} onChange={e => setData({...data, stationName: e.target.value})} />
               </div>
               
               <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleFuelTypeChange('Gasolina')} className={`flex-1 py-2 rounded-xl border font-black italic text-[10px] transition-all ${data.fuelType === 'Gasolina' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Gasolina</button>
                  <button onClick={() => handleFuelTypeChange('Etanol')} className={`flex-1 py-2 rounded-xl border font-black italic text-[10px] transition-all ${data.fuelType === 'Etanol' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Etanol</button>
                  <button onClick={() => handleFuelTypeChange('Diesel')} className={`flex-1 py-2 rounded-xl border font-black italic text-[10px] transition-all ${data.fuelType === 'Diesel' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Diesel</button>
               </div>

               <div className="space-y-1">
                 <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Forma de Pagamento</label>
                 <div className="flex gap-2">
                   <button onClick={() => setData({...data, paymentMethod: 'cash'})} className={`flex-1 py-2 rounded-xl border font-black italic text-[10px] transition-all ${data.paymentMethod === 'cash' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Dinheiro</button>
                   <button onClick={() => setData({...data, paymentMethod: 'pix'})} className={`flex-1 py-2 rounded-xl border font-black italic text-[10px] transition-all ${data.paymentMethod === 'pix' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Pix</button>
                   <button onClick={() => setData({...data, paymentMethod: 'debit'})} className={`flex-1 py-2 rounded-xl border font-black italic text-[10px] transition-all ${data.paymentMethod === 'debit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Débito</button>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[8px] font-bold text-[#10B981] italic px-1 uppercase">Valor pago R$</label>
                      <input 
                        ref={valueInputRef}
                        className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[11px] text-[#10B981] outline-none" 
                        type="text" 
                        inputMode="decimal" 
                        placeholder="0,00" 
                        value={data.totalValue} 
                        onChange={e => handleTotalValueChange(e.target.value)} 
                        onBlur={() => setData(prev => ({ ...prev, totalValue: prev.totalValue ? parseFloat(prev.totalValue.replace(',', '.')).toFixed(2).replace('.', ',') : '' }))}
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-bold text-[#3B82F6] italic px-1 uppercase">Preço/L R$</label>
                      <input 
                        className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[11px] text-[#3B82F6] outline-none" 
                        type="text" 
                        inputMode="decimal" 
                        step="0.001" 
                        placeholder="0,00" 
                        value={data.price} 
                        onChange={e => handlePriceChange(e.target.value)} 
                        onBlur={() => setData(prev => ({ ...prev, price: prev.price ? parseFloat(prev.price.replace(',', '.')).toFixed(2).replace('.', ',') : '' }))}
                      />
                   </div>
                 </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[8px] font-bold text-[#64748B] italic px-1 uppercase">Odômetro (Km)</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[11px]" placeholder={formatOdometer(state.currentOdo)} value={data.odo} onChange={e => setData({...data, odo: e.target.value.replace(/\D/g, '').slice(0,6)})} onBlur={e => setData({...data, odo: e.target.value.padStart(6, '0')})} />
               </div>

               </div>

               <div className="flex items-center justify-between p-3 bg-[#0F172A] border border-[#334155] rounded-xl">
                  <span className="text-[8px] font-bold text-[#64748B] italic leading-none uppercase">Encheu o tanque?</span>
                  <button onClick={() => setData({...data, isFullTank: !data.isFullTank})} className="text-[#3B82F6]">
                    {data.isFullTank ? <CheckCircle size={28} className="text-[#10B981]"/> : <div className="w-6 h-6 rounded-lg border-2 border-[#334155]"/>}
                  </button>
               </div>

               <button onClick={handleSave} className="w-full bg-[#3B82F6] text-white py-3.5 rounded-2xl font-black italic shadow-xl text-[12px] uppercase tracking-wider">{editingEntry ? 'Salvar alterações ✓' : 'Registrar abastecimento ✓'}</button>
               <button onClick={handleCloseForm} className="w-full text-[#64748B] font-bold text-[9px] text-center uppercase">Cancelar</button>
            </div>
          </div>
      )}
    </div>
  );
};

export default FuelTab;
