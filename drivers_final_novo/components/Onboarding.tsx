
import React, { useState, useMemo } from 'react';
import { UserProfile, Vehicle } from '../types';
import { ChevronRight, Car, Sparkles, Loader2 } from 'lucide-react';
import { VEICULOS_DATA } from '../data/veiculos';
import { getVehicleSpecs } from '../services/geminiService';
import { formatCurrency, formatKm } from '../utils/formatters';

interface OnboardingProps {
  onComplete: (user: UserProfile, vehicle: Vehicle) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [user, setUser] = useState({ name: '', salary: '', costs: '', days: '' });
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [motor, setMotor] = useState('');
  const [initialOdo, setInitialOdo] = useState('');
  const [mainFuel, setMainFuel] = useState<'Gasolina' | 'Etanol'>('Gasolina');
  const [avgConsumption, setAvgConsumption] = useState('');
  
  // Novos campos manuais
  const [manualTank, setManualTank] = useState('');
  const [manualOil, setManualOil] = useState('');
  const [manualBelt, setManualBelt] = useState('');
  const [isSearchingSpecs, setIsSearchingSpecs] = useState(false);

  const marcasSugeridas = useMemo(() => Object.keys(VEICULOS_DATA).sort(), []);
  const modelosSugeridos = useMemo(() => {
    const brandKey = marca.toLowerCase();
    return VEICULOS_DATA[brandKey] ? Object.keys(VEICULOS_DATA[brandKey]).sort() : [];
  }, [marca]);

  const isKnownVehicle = useMemo(() => {
    const b = marca.toLowerCase();
    const m = modelo.toLowerCase();
    return !!VEICULOS_DATA[b]?.[m];
  }, [marca, modelo]);

  const fetchSpecs = async () => {
    if (!marca || !modelo) return;
    setIsSearchingSpecs(true);
    const specs = await getVehicleSpecs(marca, modelo, ano, motor);
    if (specs) {
      setManualTank(specs.tankCapacity.toFixed(1));
      setAvgConsumption(specs.avgConsumptionGas.toFixed(1));
      setManualOil(specs.oilInterval.toString());
      setManualBelt(specs.beltInterval.toString());
    }
    setIsSearchingSpecs(false);
  };

  const suggestedPlaceholder = useMemo(() => {
    const b = marca.toLowerCase();
    const m = modelo.toLowerCase();
    if (isKnownVehicle) {
      const brandData = VEICULOS_DATA[b][m];
      const years = Object.keys(brandData);
      const yearData = brandData[years[0]]; 
      const motors = Object.keys(yearData);
      const motorData = yearData[motor] || yearData[motors[0]];
      
      if (motorData?.estimatedKmL) {
        const val = mainFuel === 'Gasolina' ? motorData.estimatedKmL : (motorData.estimatedKmL * 0.7);
        return formatKm(val);
      }
    }
    return "";
  }, [marca, modelo, motor, mainFuel, isKnownVehicle]);

  const dailyGoal = useMemo(() => {
    const salary = parseFloat(user.salary.replace(',', '.')) || 0;
    const costs = parseFloat(user.costs.replace(',', '.')) || 0;
    const days = parseInt(user.days) || 1;
    return (salary + costs) / Math.max(days, 1);
  }, [user]);

  const canFinish = () => {
    const consumptionValue = avgConsumption === '' ? parseFloat(suggestedPlaceholder) : parseFloat(avgConsumption.replace(',', '.'));
    const basicInfo = user.name.trim().length > 2 && marca && modelo && initialOdo.trim() && user.salary.trim() && user.costs.trim() && user.days.trim();
    if (!basicInfo) return false;
    
    if (!isKnownVehicle) {
      return !isNaN(consumptionValue) && consumptionValue > 0 && manualTank.trim() !== '';
    }
    
    return !isNaN(consumptionValue) && consumptionValue > 0;
  };

  const handleFinish = () => {
    const consValue = avgConsumption === '' ? parseFloat(suggestedPlaceholder) : parseFloat(avgConsumption.replace(',', '.'));
    const gasCons = mainFuel === 'Gasolina' ? consValue : consValue / 0.7;
    const ethCons = mainFuel === 'Etanol' ? consValue : consValue * 0.7;

    let tank = 47;
    let preset = [];
    let oil = 10000;
    let belt = 60000;

    if (isKnownVehicle) {
      const b = marca.toLowerCase();
      const m = modelo.toLowerCase();
      const brandData = VEICULOS_DATA[b][m];
      const years = Object.keys(brandData);
      const yearData = brandData[years[0]]; 
      const motors = Object.keys(yearData);
      const motorData = yearData[motor] || yearData[motors[0]];
      tank = motorData?.tankCapacity || 47;
      preset = motorData?.items || [];
    } else {
      tank = parseFloat(manualTank) || 47;
      oil = parseFloat(manualOil) || 10000;
      belt = parseFloat(manualBelt) || 60000;
      preset = [
        { item: "Troca de Óleo e Filtro", intervalKm: oil, estimatedValue: 350, alarmBeforeKm: 1000 },
        { item: "Correia Dentada / Revisão Geral", intervalKm: belt, estimatedValue: 1200, alarmBeforeKm: 5000 }
      ];
    }

    onComplete(
      { 
        name: user.name, 
        salaryExpectation: parseFloat(user.salary.replace(',', '.')) || 0, 
        fixedCosts: parseFloat(user.costs.replace(',', '.')) || 0, 
        workingDays: parseInt(user.days) || 30,
        dailyGoal,
        subsistenceValue: 20
      },
      { 
        brand: marca.toUpperCase(), 
        model: modelo.toUpperCase(), 
        year: parseInt(ano.split('/')[0]) || 0, 
        engine: motor,
        hp: 0, 
        tankCapacity: tank,
        initialOdo: Math.min(999999, parseInt(initialOdo) || 0),
        estimatedKmL: consValue,
        estimatedKmLGas: gasCons,
        estimatedKmlEth: ethCons,
        oilChangeInterval: oil,
        beltChangeInterval: belt,
        maintenancePreset: preset
      } as any
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A] text-[#F1F5F9] p-4 flex flex-col z-[3000] overflow-y-auto no-scrollbar items-center">
      <div className="max-w-[480px] w-full py-8 space-y-4">
        <header className="flex items-center gap-3 mb-4 justify-center">
          <div className="w-12 h-12 bg-[#3B82F6]/10 border border-[#3B82F6] rounded-2xl flex items-center justify-center">
            <Car size={24} className="text-[#3B82F6]" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black italic text-[#F1F5F9] tracking-tighter leading-none">Drivers Friend</h1>
            <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest mt-1">Configuração de Perfil</p>
          </div>
        </header>

        <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-5 space-y-2 shadow-xl">
           <label className="text-[9px] font-black text-[#64748B] italic uppercase tracking-widest">Identificação do Piloto</label>
           <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-4 text-[13px] font-black outline-none italic placeholder:text-[#334155]" placeholder="NOME COMPLETO" value={user.name} onChange={e => setUser({...user, name: e.target.value})} />
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-[#64748B] italic uppercase tracking-widest flex items-center gap-2"><Car size={14}/> Veículo</label>
            {!isKnownVehicle && marca && modelo && (
              <button onClick={fetchSpecs} disabled={isSearchingSpecs} className="flex items-center gap-2 bg-[#3B82F6]/10 text-[#3B82F6] px-3 py-1 rounded-full text-[9px] font-black uppercase italic border border-[#3B82F6]/20">
                {isSearchingSpecs ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                Buscar Ficha Técnica
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <input list="marcas" className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-3.5 text-[12px] font-bold outline-none uppercase placeholder:text-[#334155]" placeholder="MARCA" value={marca} onChange={e => setMarca(e.target.value)} />
              <datalist id="marcas">
                {marcasSugeridas.map(m => <option key={m} value={m.toUpperCase()}/>)}
              </datalist>
            </div>
            <div className="space-y-1">
              <input list="modelos" className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-3.5 text-[12px] font-bold outline-none uppercase placeholder:text-[#334155]" placeholder="MODELO" value={modelo} onChange={e => setModelo(e.target.value)} />
              <datalist id="modelos">
                {modelosSugeridos.map(m => <option key={m} value={m.toUpperCase()}/>)}
              </datalist>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-3 text-[11px] font-bold outline-none text-center" placeholder="ANO" value={ano} onChange={e => setAno(e.target.value)} />
            <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-3 text-[11px] font-bold outline-none text-center" placeholder="MOTOR" value={motor} onChange={e => setMotor(e.target.value)} />
            <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-3 text-[11px] font-bold outline-none text-center" type="text" inputMode="numeric" placeholder="KM ATUAL" value={initialOdo} onChange={e => setInitialOdo(e.target.value.replace(/\D/g, '').slice(0,6))} onBlur={e => setInitialOdo(e.target.value.padStart(6, '0'))} />
          </div>

          {!isKnownVehicle && (marca || modelo) && (
            <div className="pt-2 space-y-3 animate-slide-up border-t border-[#334155]/50">
               <p className="text-[8px] font-black text-amber-500 uppercase italic">Atenção: Cadastro Manual Detectado</p>
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Tanque (L)</label>
                   <input className="w-full bg-[#0F172A] border border-amber-500/30 rounded-xl p-2.5 text-[11px] font-black outline-none" type="text" inputMode="numeric" placeholder="Ex: 50" value={manualTank} onChange={e => setManualTank(e.target.value.replace(/\D/g, ''))} onBlur={e => {
                      const val = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(val)) setManualTank(val.toFixed(1).replace('.', ','));
                    }} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Troca Óleo (Km)</label>
                   <input className="w-full bg-[#0F172A] border border-amber-500/30 rounded-xl p-2.5 text-[11px] font-black outline-none" type="text" inputMode="numeric" placeholder="Ex: 10000" value={manualOil} onChange={e => setManualOil(e.target.value.replace(/\D/g, ''))} onBlur={e => {
                      const val = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(val)) setManualOil(val.toFixed(1).replace('.', ','));
                    }} />
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-[#64748B] italic uppercase tracking-widest">Consumo Real (Km/L)</label>
            <div className="flex gap-2">
              <button onClick={() => setMainFuel('Gasolina')} className={`px-4 py-1.5 rounded-full text-[9px] font-black italic border transition-all ${mainFuel === 'Gasolina' ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#334155] text-[#64748B]'}`}>Gasolina</button>
              <button onClick={() => setMainFuel('Etanol')} className={`px-4 py-1.5 rounded-full text-[9px] font-black italic border transition-all ${mainFuel === 'Etanol' ? 'bg-[#10B981] border-[#10B981]' : 'border-[#334155] text-[#64748B]'}`}>Etanol</button>
            </div>
          </div>
          <input className={`w-full bg-[#0F172A] border-2 rounded-2xl p-4 font-black text-center text-xl outline-none transition-colors ${mainFuel === 'Gasolina' ? 'border-[#3B82F6] text-[#3B82F6]' : 'border-[#10B981] text-[#10B981]'}`} type="text" inputMode="decimal" placeholder={suggestedPlaceholder} value={avgConsumption} onChange={e => {
            let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
            if (val.includes('.')) {
              const parts = val.split('.');
              if (parts[1].length > 1) val = parts[0] + '.' + parts[1].substring(0, 1);
            }
            setAvgConsumption(val.replace('.', ','));
          }} onBlur={e => {
            const val = parseFloat(e.target.value.replace(',', '.'));
            if (!isNaN(val)) setAvgConsumption(val.toFixed(1).replace('.', ','));
          }} />
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-5 space-y-4 shadow-xl">
          <label className="text-[9px] font-black text-[#64748B] italic uppercase tracking-widest">Meta Financeira Mensal</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[7px] font-bold text-[#64748B] uppercase px-1">Pretensão Líquida</span>
              <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-4 font-black text-[13px] outline-none" type="text" inputMode="decimal" placeholder="R$ 3.000,00" value={user.salary} onChange={e => setUser({...user, salary: e.target.value.replace(/[^0-9.,]/g, '')})} onBlur={e => {
                const val = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(val)) setUser({...user, salary: val.toFixed(2).replace('.', ',')});
              }} />
            </div>
            <div className="space-y-1">
              <span className="text-[7px] font-bold text-[#64748B] uppercase px-1">Custos Fixos</span>
              <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-4 font-black text-[13px] outline-none" type="text" inputMode="decimal" placeholder="R$ 0,00" value={user.costs} onChange={e => setUser({...user, costs: e.target.value.replace(/[^0-9.,]/g, '')})} onBlur={e => {
                const val = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(val)) setUser({...user, costs: val.toFixed(2).replace('.', ',')});
              }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[7px] font-bold text-[#64748B] uppercase px-1">Dias de Trabalho</span>
              <input className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl p-4 font-black text-[13px] outline-none" type="text" inputMode="numeric" placeholder="30" value={user.days} onChange={e => setUser({...user, days: e.target.value.replace(/\D/g, '')})} />
            </div>
            <div className="bg-[#3B82F6] rounded-2xl flex flex-col items-center justify-center p-2 shadow-lg shadow-[#3B82F6]/20">
              <span className="text-[8px] font-black opacity-80 italic uppercase text-white leading-none">Meta Diária</span>
              <span className="text-[16px] font-black italic text-white mt-1">R$ {formatCurrency(dailyGoal)}</span>
            </div>
          </div>
        </div>

        <button onClick={handleFinish} disabled={!canFinish()} className="w-full bg-[#3B82F6] text-white py-5 rounded-[2rem] font-black text-base flex justify-center items-center gap-4 active:scale-95 disabled:opacity-30 italic transition-all shadow-2xl mt-4 uppercase tracking-widest">
          Concluir Configuração <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
