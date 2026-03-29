
import React from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../utils/formatters';

const NetProfitProgressBar: React.FC = () => {
  const stats = useFinanceStore(s => s.getNetProfitStats());

  return (
    <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-3xl shadow-lg space-y-3 animate-slide-up">
      <div className="flex justify-between items-end mb-1">
        <div>
          <p className="text-[9px] font-bold text-[#64748B] italic uppercase">Progresso da Meta</p>
          <p className="text-lg font-black text-[#10B981] italic leading-none">{formatPercent(stats.progressoMeta)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-[#64748B] italic uppercase">Meta do Dia</p>
          <p className="text-lg font-black text-[#F1F5F9] italic leading-none">R$ {formatCurrency(stats.faturamentoAlvo)}</p>
        </div>
      </div>
      
      <div className="relative h-2.5 bg-[#0F172A] rounded-full overflow-hidden border border-[#334155]/30">
        <div 
          className={`h-full transition-all duration-1000 ease-out ${stats.progressoMeta >= 100 ? 'bg-[#10B981]' : 'bg-[#3B82F6]'}`}
          style={{ width: `${Math.max(0, Math.min(100, stats.progressoMeta))}%` }}
        />
      </div>
    </div>
  );
};

export default NetProfitProgressBar;
