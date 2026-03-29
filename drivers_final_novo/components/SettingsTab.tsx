
import React, { useState, useMemo } from 'react';
import { User, Car, ChevronDown, ChevronUp, Banknote, ToggleLeft, ToggleRight, Calendar, Save, Sparkles, Loader2, Settings, Type, ZoomIn, Layout, Map as MapIcon } from 'lucide-react';
import { AppState, UserProfile, Vehicle, FinancialConfig, UserPreferences, FixedCost, TabType } from '../types';
import { VEICULOS_DATA } from '../data/veiculos';
import { getVehicleSpecs } from '../services/geminiService';
import { useFuelStore } from '../store/useFuelStore';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency, formatOdometer, formatPercent } from '../utils/formatters';

interface SettingsTabProps {
  state: AppState;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateVehicle: (updates: Partial<Vehicle>) => void;
  updateFinancialConfig: (updates: Partial<FinancialConfig>) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  addFixedCost: (cost: FixedCost) => void;
  deleteFixedCost: (id: string) => void;
  resetApp: () => void;
  setActiveTab: (tab: TabType) => void;
  syncOdometer: (odo: number) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
  state, updateProfile, updateVehicle, updateFinancialConfig, 
  updatePreferences, addFixedCost, deleteFixedCost, resetApp,
  setActiveTab, syncOdometer
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Estado local para Perfil
  const [localName, setLocalName] = useState(state.user?.name || '');
  const [localPhone, setLocalPhone] = useState(state.user?.phone || '');
  const [localPlatform, setLocalPlatform] = useState(state.user?.platform || 'Uber');

  // Estado local para Financeiro
  const [localSalary, setLocalSalary] = useState(state.user?.salaryExpectation ? state.user.salaryExpectation.toFixed(2).replace('.', ',') : '');
  const [localSalaryDay, setLocalSalaryDay] = useState(state.user?.salaryDay?.toString() || '1');
  const [localCosts, setLocalCosts] = useState(state.user?.fixedCosts ? state.user.fixedCosts.toFixed(2).replace('.', ',') : '');
  const [localDays, setLocalDays] = useState(state.financialConfig?.diasUteisMes?.toString() || '');
  const [localSubsistence, setLocalSubsistence] = useState(state.user?.subsistenceValue ? state.user.subsistenceValue.toFixed(2).replace('.', ',') : '');
  const [localCardDebit, setLocalCardDebit] = useState(state.financialConfig?.cardFeeDebit ? formatPercent(state.financialConfig.cardFeeDebit) : '');
  const [localCardCredit, setLocalCardCredit] = useState(state.financialConfig?.cardFeeCredit ? formatPercent(state.financialConfig.cardFeeCredit) : '');
  const [localResetHour, setLocalResetHour] = useState(state.financialConfig?.dailyResetHour?.toString() || '0');
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedValue, setNewFixedValue] = useState('');
  const [newFixedDay, setNewFixedDay] = useState('');
  const [newFixedIsFixa, setNewFixedIsFixa] = useState(true);

  // Estado local para Veículo (Flexível)
  const [marca, setMarca] = useState(state.vehicle?.brand || '');
  const [modelo, setModelo] = useState(state.vehicle?.model || '');
  const [tank, setTank] = useState(state.vehicle?.tankCapacity ? state.vehicle.tankCapacity.toFixed(1) : '');
  const [oil, setOil] = useState(state.vehicle?.oilChangeInterval ? state.vehicle.oilChangeInterval.toString() : '');
  const [belt, setBelt] = useState(state.vehicle?.beltChangeInterval ? state.vehicle.beltChangeInterval.toString() : '');
  const [editCons, setEditCons] = useState(() => {
    const val = state.vehicle?.estimatedKmLGas || state.vehicle?.estimatedKmL;
    return val ? val.toFixed(1) : '';
  });
  const [editConsEth, setEditConsEth] = useState(() => {
    const val = state.vehicle?.estimatedKmlEth;
    return val ? val.toFixed(1) : '';
  });
  const [localOdo, setLocalOdo] = useState(formatOdometer(state.currentOdo));
  const [isSearchingSpecs, setIsSearchingSpecs] = useState(false);
  const [errorSpecs, setErrorSpecs] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const marcasSugeridas = useMemo(() => Object.keys(VEICULOS_DATA).sort(), []);
  const modelosSugeridos = useMemo(() => {
    const brandKey = marca.toLowerCase();
    return VEICULOS_DATA[brandKey] ? Object.keys(VEICULOS_DATA[brandKey]).sort() : [];
  }, [marca]);

  const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  const handleMoneyBlur = (val: string, setter: (v: string) => void) => {
    if (!val) return;
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num)) {
      setter(num.toFixed(2).replace('.', ','));
    }
  };

  const handleConsBlur = (val: string, setter: (v: string) => void) => {
    if (!val) return;
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num)) {
      setter(num.toFixed(1).replace('.', ','));
    }
  };

  const handleFetchSpecs = async () => {
    if (!marca || !modelo) {
      setErrorSpecs("Por favor, preencha marca e modelo.");
      return;
    }
    setErrorSpecs(null);
    setIsSearchingSpecs(true);
    try {
      const specs = await getVehicleSpecs(marca, modelo, state.vehicle?.year?.toString() || '2023', state.vehicle?.engine || '');
      if (specs) {
        setTank(specs.tankCapacity.toFixed(1));
        setEditCons(specs.avgConsumptionGas.toFixed(1));
        setEditConsEth(specs.avgConsumptionEth.toFixed(1));
        setOil(specs.oilInterval.toString());
        setBelt(specs.beltInterval.toString());
      } else {
        setErrorSpecs("Não foi possível encontrar especificações para este veículo.");
      }
    } catch (error) {
      console.error("Gemini Vehicle Specs Error:", error);
      setErrorSpecs("Erro ao conectar com a assistência de IA.");
    } finally {
      setIsSearchingSpecs(false);
    }
  };

  const handleSaveProfile = () => {
    updateProfile({
      name: localName,
      phone: localPhone,
      platform: localPlatform
    });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setActiveTab('rides');
    }, 800);
  };

  const handleAddFixedCost = () => {
    if (!newFixedName || !newFixedValue) return;
    addFixedCost({
      id: uuidv4(),
      nome: newFixedName,
      valor: parseFloat(newFixedValue.replace(',', '.')) || 0,
      diaVencimento: parseInt(newFixedDay) || 1,
      isFixa: newFixedIsFixa
    });
    setNewFixedName('');
    setNewFixedValue('');
    setNewFixedDay('');
    setNewFixedIsFixa(true);
  };

  const handlePercentBlur = (val: string, setter: (v: string) => void) => {
    if (!val) return;
    setter(formatPercent(val));
  };

  const handleSaveFinance = () => {
    const salary = parseFloat(localSalary.replace(',', '.')) || 0;
    const costs = parseFloat(localCosts.replace(',', '.')) || 0;
    const days = parseInt(localDays) || 30;

    updateProfile({
      salaryExpectation: salary,
      fixedCosts: costs,
      subsistenceValue: parseFloat(localSubsistence.replace(',', '.')) || 0,
      salaryDay: parseInt(localSalaryDay) || 1
    });
    updateFinancialConfig({
      diasUteisMes: days,
      cardFeeDebit: parseFloat(localCardDebit.replace('%', '').replace(',', '.')) || 0,
      cardFeeCredit: parseFloat(localCardCredit.replace('%', '').replace(',', '.')) || 0,
      dailyResetHour: parseInt(localResetHour) || 0
    });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setActiveTab('rides');
    }, 800);
  };

  const handleSaveVehicle = () => {
    const kmLGas = parseFloat(editCons.replace(',', '.')) || 10;
    const kmLEth = parseFloat(editConsEth.replace(',', '.')) || 7;
    const price = state.vehicle?.lastPricePerLiter || 5.80;
    const odoValue = parseFloat(localOdo.replace(',', '.')) || 0;
    
    // Atualiza o FuelStore (que agora é persistente)
    // Usamos o tipo atual para decidir qual consumo enviar para o FuelStore
    const currentFuelType = state.vehicle?.fuelType || 'Gasolina';
    const currentKmL = currentFuelType === 'Gasolina' ? kmLGas : kmLEth;
    
    useFuelStore.getState().setManualConfig(currentKmL, price, currentFuelType as any);

    updateVehicle({
      brand: marca,
      model: modelo,
      engine: state.vehicle?.engine || '',
      tankCapacity: parseFloat(tank) || 47,
      estimatedKmL: currentKmL,
      estimatedKmLGas: kmLGas,
      estimatedKmlEth: kmLEth,
      oilChangeInterval: parseFloat(oil) || 10000,
      beltChangeInterval: parseFloat(belt) || 60000
    });

    // Sincroniza o odômetro se alterado manualmente
    if (odoValue !== state.currentOdo) {
      syncOdometer(odoValue);
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setActiveTab('rides');
    }, 800);
  };

  return (
    <div className="flex flex-col gap-[16px] animate-slide-up pb-8">
      <header className="border-b border-[#334155] pb-2 px-1">
        <h1 className="text-xl font-black italic text-[#3B82F6] tracking-tighter uppercase">Configurações</h1>
        <p className="text-[9px] font-bold text-[#64748B] italic mt-0.5 uppercase tracking-widest">Personalize sua operação</p>
      </header>

      {/* Perfil */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <button onClick={() => toggleSection('perfil')} className="w-full p-4 flex justify-between items-center bg-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center text-[#3B82F6]"><User size={18}/></div>
            <span className="font-black italic text-[11px] uppercase">Perfil do Motorista</span>
          </div>
          {expandedSection === 'perfil' ? <ChevronUp className="text-[#3B82F6]" size={18}/> : <ChevronDown className="text-[#64748B]" size={18}/>}
        </button>
        {expandedSection === 'perfil' && (
          <div className="p-4 pt-0 space-y-3 animate-slide-up">
            <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[12px]" placeholder="Nome Completo" value={localName} onChange={(e) => setLocalName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
               <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="tel" placeholder="Telefone" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} />
               <select className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[12px]" value={localPlatform} onChange={(e) => setLocalPlatform(e.target.value)}>
                    <option value="Uber">Uber</option>
                    <option value="99">99</option>
                    <option value="Indriver">Indriver</option>
                    <option value="Outros">Outros</option>
               </select>
            </div>
            <button onClick={handleSaveProfile} className="w-full bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 py-3.5 rounded-xl font-black italic text-[10px] uppercase flex items-center justify-center gap-3">
              <Save size={14}/> Confirmar Alterações ✓
            </button>
          </div>
        )}
      </div>

      {/* Financeiro */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <button onClick={() => toggleSection('financeiro')} className="w-full p-4 flex justify-between items-center bg-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Banknote size={18}/></div>
            <span className="font-black italic text-[11px] uppercase">Metas & Planejamento</span>
          </div>
          {expandedSection === 'financeiro' ? <ChevronUp className="text-[#3B82F6]" size={18}/> : <ChevronDown className="text-[#64748B]" size={18}/>}
        </button>
        {expandedSection === 'financeiro' && (
          <div className="p-4 pt-0 space-y-3 animate-slide-up">
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Meta Líquida Mês</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="decimal" value={localSalary} onChange={e => setLocalSalary(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={() => handleMoneyBlur(localSalary, setLocalSalary)} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Custos Fixos Mês</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="decimal" value={localCosts} onChange={e => setLocalCosts(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={() => handleMoneyBlur(localCosts, setLocalCosts)} />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Ciclo de Dias</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="numeric" value={localDays} onChange={e => setLocalDays(e.target.value.replace(/\D/g, ''))} />
               </div>
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Dia Recebimento Salário (1-31)</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="number" min="1" max="31" value={localSalaryDay} onChange={e => setLocalSalaryDay(e.target.value)} />
               </div>
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Diária Subsistência</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="decimal" value={localSubsistence} onChange={e => setLocalSubsistence(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={() => handleMoneyBlur(localSubsistence, setLocalSubsistence)} />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Taxa Cartão Débito (%)</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="decimal" value={localCardDebit} onChange={e => setLocalCardDebit(e.target.value.replace(/[^0-9.,%]/g, ''))} onBlur={() => handlePercentBlur(localCardDebit, setLocalCardDebit)} />
               </div>
               <div className="space-y-1">
                  <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Taxa Cartão Crédito (%)</label>
                  <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="decimal" value={localCardCredit} onChange={e => setLocalCardCredit(e.target.value.replace(/[^0-9.,%]/g, ''))} onBlur={() => handlePercentBlur(localCardCredit, setLocalCardCredit)} />
               </div>
             </div>
             <div className="space-y-1">
                <label className="text-[7px] font-black text-[#64748B] uppercase px-1">Horário de Fechamento do Dia (0-23h)</label>
                <div className="flex items-center gap-3">
                  <input 
                    className="flex-1 bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" 
                    type="number" 
                    min="0" 
                    max="23" 
                    value={localResetHour} 
                    onChange={e => setLocalResetHour(e.target.value)} 
                  />
                  <span className="text-[10px] font-bold text-[#64748B] italic uppercase">{localResetHour}:00h</span>
                </div>
                <p className="text-[8px] text-[#64748B] italic px-1">O dia financeiro será encerrado neste horário, permitindo consolidar os ganhos antes do próximo ciclo.</p>
             </div>
             <div className="flex items-center justify-between p-3 bg-[#0F172A] border border-[#334155] rounded-xl shadow-inner">
                <div className="flex items-center gap-3">
                   <Calendar size={16} className="text-[#3B82F6]"/>
                   <span className="font-bold text-[#F1F5F9] italic uppercase text-[9px]">Excluir dias não úteis</span>
                </div>
                <button onClick={() => updateFinancialConfig({ excluirFinaisSemana: !state.financialConfig?.excluirFinaisSemana })}>
                   {state.financialConfig?.excluirFinaisSemana ? <ToggleRight size={32} className="text-[#3B82F6]" /> : <ToggleLeft size={32} className="text-[#64748B] opacity-40" />}
                </button>
             </div>
             <button onClick={handleSaveFinance} className="w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-3.5 rounded-xl font-black italic text-[10px] uppercase flex items-center justify-center gap-3">
              <Save size={14}/> Salvar Planejamento ✓
            </button>
          </div>
        )}
      </div>

      {/* Custos Fixos Detalhados (Substitui Provisões) */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <button onClick={() => toggleSection('fixedCosts')} className="w-full p-4 flex justify-between items-center bg-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500"><Calendar size={18}/></div>
            <span className="font-black italic text-[11px] uppercase">Custos Fixos & Provisões</span>
          </div>
          {expandedSection === 'fixedCosts' ? <ChevronUp className="text-[#3B82F6]" size={18}/> : <ChevronDown className="text-[#64748B]" size={18}/>}
        </button>
        {expandedSection === 'fixedCosts' && (
          <div className="p-4 pt-0 space-y-3 animate-slide-up">
            <p className="text-[8px] text-[#64748B] italic px-1 mb-2">Adicione aqui seus custos mensais recorrentes (Seguro, IPVA, MEI, etc). Eles serão diluídos na sua meta diária.</p>
            <div className="space-y-2">
              {(state.fixedCosts || []).map((cost) => (
                <div key={cost.id} className="flex items-center justify-between bg-[#0F172A] p-2 rounded-xl border border-[#334155]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#F1F5F9] uppercase italic">{cost.nome} {cost.isFixa ? '(Fixo)' : '(Variável)'}</span>
                    <span className="text-[8px] text-[#64748B]">Vencimento: Dia {cost.diaVencimento}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-rose-500">R$ {formatCurrency(cost.valor)}</span>
                    <button onClick={() => deleteFixedCost(cost.id)} className="text-rose-500/50 hover:text-rose-500">
                      <ChevronDown size={14} className="rotate-45"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155] space-y-2">
              <input 
                className="w-full bg-[#1E293B] border border-[#334155] p-2 rounded-lg text-[10px] font-bold text-[#F1F5F9] outline-none" 
                placeholder="Nome do Custo (ex: Seguro)" 
                value={newFixedName} 
                onChange={e => setNewFixedName(e.target.value)} 
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  className="w-full bg-[#1E293B] border border-[#334155] p-2 rounded-lg text-[10px] font-bold text-[#F1F5F9] outline-none" 
                  placeholder="Valor (R$)" 
                  inputMode="decimal"
                  value={newFixedValue} 
                  onChange={e => setNewFixedValue(e.target.value)} 
                />
                <input 
                  className="w-full bg-[#1E293B] border border-[#334155] p-2 rounded-lg text-[10px] font-bold text-[#F1F5F9] outline-none" 
                  placeholder="Dia Vencimento (1-31)" 
                  type="number"
                  min="1"
                  max="31"
                  value={newFixedDay} 
                  onChange={e => setNewFixedDay(e.target.value)} 
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={newFixedIsFixa} 
                  onChange={e => setNewFixedIsFixa(e.target.checked)} 
                  className="accent-[#3B82F6]"
                />
                <span className="text-[10px] font-bold text-[#F1F5F9] uppercase italic">É custo fixo todo mês?</span>
              </div>
              <button 
                onClick={handleAddFixedCost}
                className="w-full bg-[#3B82F6] text-white py-2 rounded-lg font-black italic text-[9px] uppercase"
              >
                Adicionar Custo +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Veículo Flexível */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <button onClick={() => toggleSection('veiculo')} className="w-full p-4 flex justify-between items-center bg-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500"><Car size={18}/></div>
            <span className="font-black italic text-[11px] uppercase">Especificações Técnicas</span>
          </div>
          {expandedSection === 'veiculo' ? <ChevronUp className="text-[#3B82F6]" size={18}/> : <ChevronDown className="text-[#64748B]" size={18}/>}
        </button>
        {expandedSection === 'veiculo' && (
          <div className="p-4 pt-0 space-y-3 animate-slide-up">
             <div className="flex justify-between items-center">
                <label className="text-[8px] font-black text-[#64748B] uppercase tracking-widest px-1">Dados de Rodagem</label>
                <button onClick={handleFetchSpecs} disabled={isSearchingSpecs} className="flex items-center gap-2 bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-0.5 rounded-full text-[8px] font-black uppercase italic border border-[#3B82F6]/20">
                  {isSearchingSpecs ? <Loader2 className="animate-spin" size={10}/> : <Sparkles size={10}/>} Assistência IA
                </button>
             </div>
             {errorSpecs && <p className="text-[9px] font-bold text-rose-500 italic uppercase">{errorSpecs}</p>}
             <div className="grid grid-cols-2 gap-3">
                <input list="marcas" className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[12px] uppercase" placeholder="Marca" value={marca} onChange={e => setMarca(e.target.value)} />
                <datalist id="marcas">{marcasSugeridas.map(m => <option key={m} value={m.toUpperCase()}/>)}</datalist>
                
                <input list="modelos" className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-bold text-[#F1F5F9] outline-none text-[12px] uppercase" placeholder="Modelo" value={modelo} onChange={e => setModelo(e.target.value)} />
                <datalist id="modelos">{modelosSugeridos.map(m => <option key={m} value={m.toUpperCase()}/>)}</datalist>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Consumo (Gasolina)</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#3B82F6] outline-none text-[12px]" type="text" inputMode="decimal" value={editCons} onChange={e => {
                      let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      if (val.includes('.')) {
                        const parts = val.split('.');
                        if (parts[1].length > 1) val = parts[0] + '.' + parts[1].substring(0, 1);
                      }
                      setEditCons(val);
                    }} onBlur={() => handleConsBlur(editCons, setEditCons)} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Consumo (Etanol)</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#10B981] outline-none text-[12px]" type="text" inputMode="decimal" value={editConsEth} onChange={e => {
                      let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      if (val.includes('.')) {
                        const parts = val.split('.');
                        if (parts[1].length > 1) val = parts[0] + '.' + parts[1].substring(0, 1);
                      }
                      setEditConsEth(val);
                    }} onBlur={() => handleConsBlur(editConsEth, setEditConsEth)} />
                </div>
             </div>
             <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Tanque (Litros)</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-[#F1F5F9] outline-none text-[12px]" type="text" inputMode="numeric" value={tank} onChange={e => setTank(e.target.value.replace(/\D/g, ''))} onBlur={() => handleConsBlur(tank, setTank)} />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Troca de Óleo (Km)</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-amber-500 outline-none text-[12px]" type="text" inputMode="numeric" value={oil} onChange={e => setOil(e.target.value)} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Correia Dentada (Km)</label>
                   <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-amber-500 outline-none text-[12px]" type="text" inputMode="numeric" value={belt} onChange={e => setBelt(e.target.value)} />
                </div>
             </div>
              <div className="grid grid-cols-1 gap-3">
                 <div className="space-y-1">
                    <label className="text-[7px] font-bold text-[#64748B] uppercase px-1">Odômetro Atual (Km)</label>
                    <input className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl font-black text-emerald-500 outline-none text-[12px]" type="text" inputMode="numeric" value={localOdo} onChange={e => setLocalOdo(e.target.value.replace(/\D/g, '').slice(0,6))} />
                 </div>
              </div>
             <button onClick={handleSaveVehicle} className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 py-3.5 rounded-xl font-black italic text-[10px] uppercase flex items-center justify-center gap-3">
              <Save size={14}/> Atualizar Dados Técnicos ✓
            </button>
          </div>
        )}
      </div>

      {/* Preferências do App */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <button onClick={() => toggleSection('prefs')} className="w-full p-4 flex justify-between items-center bg-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500"><Settings size={18}/></div>
            <span className="font-black italic text-[11px] uppercase">Preferências do App</span>
          </div>
          {expandedSection === 'prefs' ? <ChevronUp className="text-[#3B82F6]" size={18}/> : <ChevronDown className="text-[#64748B]" size={18}/>}
        </button>
        {expandedSection === 'prefs' && (
          <div className="p-4 pt-0 space-y-5 animate-slide-up">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type size={14} className="text-[#64748B]"/>
                  <span className="text-[10px] font-black text-[#F1F5F9] italic uppercase">Tamanho da Fonte</span>
                </div>
                <div className="flex bg-[#0F172A] rounded-lg p-1 border border-[#334155]">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updatePreferences({ fontSize: size })}
                      className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all ${state.preferences.fontSize === size ? 'bg-[#3B82F6] text-white' : 'text-[#64748B]'}`}
                    >
                      {size === 'small' ? 'P' : size === 'medium' ? 'M' : 'G'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoomIn size={14} className="text-[#64748B]"/>
                  <span className="text-[10px] font-black text-[#F1F5F9] italic uppercase">Nível de Zoom</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="80"
                    max="120"
                    step="5"
                    value={state.preferences.zoomLevel}
                    onChange={(e) => updatePreferences({ zoomLevel: parseInt(e.target.value) })}
                    className="w-20 accent-[#3B82F6]"
                  />
                  <span className="text-[9px] font-black text-[#3B82F6] w-8">{formatPercent(state.preferences.zoomLevel)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout size={14} className="text-[#64748B]"/>
                  <span className="text-[10px] font-black text-[#F1F5F9] italic uppercase">Layout dos Cards</span>
                </div>
                <div className="flex bg-[#0F172A] rounded-lg p-1 border border-[#334155]">
                  {(['default', 'compact'] as const).map((layout) => (
                    <button
                      key={layout}
                      onClick={() => updatePreferences({ cardLayout: layout })}
                      className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all ${state.preferences.cardLayout === layout ? 'bg-[#3B82F6] text-white' : 'text-[#64748B]'}`}
                    >
                      {layout === 'default' ? 'Padrão' : 'Compacto'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon size={14} className="text-[#64748B]"/>
                  <span className="text-[10px] font-black text-[#F1F5F9] italic uppercase">Mapa em Tempo Real</span>
                </div>
                <button onClick={() => updatePreferences({ showMap: !state.preferences.showMap })}>
                  {state.preferences.showMap ? <ToggleRight size={28} className="text-[#3B82F6]" /> : <ToggleLeft size={28} className="text-[#64748B] opacity-40" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6">
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1E293B] border border-emerald-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                <Save size={32} />
              </div>
              <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Alterações Salvas!</h3>
              <p className="text-[10px] font-bold text-[#64748B] uppercase italic tracking-widest">Sincronizando dados...</p>
            </div>
          </div>
        )}
        <button onClick={resetApp} className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 py-4 rounded-2xl font-black italic text-[10px] uppercase tracking-widest shadow-sm active:bg-rose-500/20 transition-all">
          Apagar Tudo e Resetar Aplicativo
        </button>
        <p className="text-center text-[8px] font-bold text-[#64748B] mt-4 uppercase opacity-40 italic tracking-widest">Drivers Friend v1.1.0 • Build Operacional</p>
      </div>
    </div>
  );
};

export default SettingsTab;
