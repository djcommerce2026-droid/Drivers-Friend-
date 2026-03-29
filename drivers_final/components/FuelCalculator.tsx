
import React, { useMemo, useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { AppState } from '../types';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatKm } from '../utils/formatters';

interface FuelCalculatorProps {
  state: AppState;
  onUpdateVehicle: (updates: any) => void;
}

const FuelCalculator: React.FC<FuelCalculatorProps> = ({ state, onUpdateVehicle }) => {
  const setStoreCalcState = useFinanceStore(s => s.setCalculatorState);
  
  const [prices, setPrices] = useState(() => {
    const p = state.calculatorState?.prices || { gas: '', eth: '' };
    return {
      gas: p.gas ? parseFloat(p.gas.replace(',', '.')).toFixed(2).replace('.', ',') : '',
      eth: p.eth ? parseFloat(p.eth.replace(',', '.')).toFixed(2).replace('.', ',') : ''
    };
  });
  const [consumption, setConsumption] = useState(() => {
    const c = state.calculatorState?.consumption || { gas: '', eth: '' };
    return {
      gas: c.gas ? parseFloat(c.gas.replace(',', '.')).toFixed(1).replace('.', ',') : '',
      eth: c.eth ? parseFloat(c.eth.replace(',', '.')).toFixed(1).replace('.', ',') : ''
    };
  });

  useEffect(() => {
    setStoreCalcState({ prices, consumption });
  }, [prices, consumption, setStoreCalcState]);

  const calculation = useMemo(() => {
    const pGas = parseFloat(prices.gas.replace(',', '.'));
    const pEth = parseFloat(prices.eth.replace(',', '.'));
    const cGas = parseFloat(consumption.gas.replace(',', '.')) || state.vehicle?.estimatedKmLGas || state.vehicle?.estimatedKmL || 10;
    const cEth = parseFloat(consumption.eth.replace(',', '.')) || state.vehicle?.estimatedKmlEth || 7;

    if (isNaN(pGas) || isNaN(pEth)) return null;

    const costGas = pGas / cGas;
    const costEth = pEth / cEth;
    const winner = costEth < costGas ? 'Etanol' : 'Gasolina';
    return { costGas, costEth, winner };
  }, [prices, consumption, state.vehicle]);

  const handleBlur = () => {
    const formattedPrices = {
      gas: prices.gas ? parseFloat(prices.gas.replace(',', '.')).toFixed(2).replace('.', ',') : '',
      eth: prices.eth ? parseFloat(prices.eth.replace(',', '.')).toFixed(2).replace('.', ',') : ''
    };
    const formattedCons = {
      gas: consumption.gas ? parseFloat(consumption.gas.replace(',', '.')).toFixed(1).replace('.', ',') : '',
      eth: consumption.eth ? parseFloat(consumption.eth.replace(',', '.')).toFixed(1).replace('.', ',') : ''
    };
    
    setPrices(formattedPrices);
    setConsumption(formattedCons);

    const updates: any = {
      calculatorState: {
        prices: formattedPrices,
        consumption: formattedCons
      }
    };
    if (formattedPrices.gas) updates.lastPricePerLiter = parseFloat(formattedPrices.gas.replace(',', '.'));
    if (formattedPrices.eth) updates.lastPriceEth = parseFloat(formattedPrices.eth.replace(',', '.'));
    if (formattedCons.gas) updates.estimatedKmLGas = parseFloat(formattedCons.gas.replace(',', '.'));
    if (formattedCons.eth) updates.estimatedKmlEth = parseFloat(formattedCons.eth.replace(',', '.'));
    
    onUpdateVehicle(updates);
  };

  return (
    <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-2xl shadow-lg space-y-2">
      <div className="flex items-center gap-2 text-[#3B82F6]">
        <Calculator size={14} />
        <h3 className="text-[8px] font-black italic tracking-widest text-[#F1F5F9] uppercase">Calculadora inteligente</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[6px] font-black text-[#64748B] italic text-center uppercase">Preços (R$/L)</p>
          <input className="w-full bg-[#0F172A] border border-[#334155] p-1.5 rounded-xl font-black text-[10px] text-[#F1F5F9] outline-none text-right" type="text" inputMode="decimal" step="0.01" placeholder="Gas" value={prices.gas} onChange={e => setPrices({...prices, gas: e.target.value.replace(/[^0-9.,]/g, '')})} onBlur={handleBlur} />
          <input className="w-full bg-[#0F172A] border border-[#334155] p-1.5 rounded-xl font-black text-[10px] text-[#10B981] outline-none text-right" type="text" inputMode="decimal" step="0.01" placeholder="Eth" value={prices.eth} onChange={e => setPrices({...prices, eth: e.target.value.replace(/[^0-9.,]/g, '')})} onBlur={handleBlur} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[6px] font-black text-[#64748B] italic text-center uppercase">Consumo (Km/L)</p>
          <input className="w-full bg-[#0F172A] border border-[#334155] p-1.5 rounded-xl font-black text-[10px] text-[#F1F5F9] outline-none text-right" type="text" inputMode="decimal" step="0.01" placeholder={formatKm(state.vehicle?.estimatedKmLGas || state.vehicle?.estimatedKmL || 10)} value={consumption.gas} onChange={e => {
            let val = e.target.value.replace(/[^0-9.,]/g, '');
            if (val.includes(',') || val.includes('.')) {
              const separator = val.includes(',') ? ',' : '.';
              const parts = val.split(separator);
              if (parts[1].length > 1) val = parts[0] + separator + parts[1].substring(0, 1);
            }
            setConsumption({...consumption, gas: val});
          }} onBlur={handleBlur} />
          <input className="w-full bg-[#0F172A] border border-[#334155] p-1.5 rounded-xl font-black text-[10px] text-[#F1F5F9] outline-none text-right" type="text" inputMode="decimal" step="0.01" placeholder={formatKm(state.vehicle?.estimatedKmlEth || 7)} value={consumption.eth} onChange={e => {
            let val = e.target.value.replace(/[^0-9.,]/g, '');
            if (val.includes(',') || val.includes('.')) {
              const separator = val.includes(',') ? ',' : '.';
              const parts = val.split(separator);
              if (parts[1].length > 1) val = parts[0] + separator + parts[1].substring(0, 1);
            }
            setConsumption({...consumption, eth: val});
          }} onBlur={handleBlur} />
        </div>
      </div>
      {calculation && (
        <div className="bg-[#0F172A] p-1.5 rounded-xl border border-[#334155] text-center shadow-inner">
            <p className="text-[7px] font-black text-[#64748B] italic leading-none mb-1 uppercase">Abasteça com</p>
            <p className={`text-[11px] font-black italic ${calculation.winner === 'Etanol' ? 'text-[#10B981]' : 'text-[#3B82F6]'}`}>{calculation.winner}</p>
        </div>
      )}
    </div>
  );
};

export default FuelCalculator;
