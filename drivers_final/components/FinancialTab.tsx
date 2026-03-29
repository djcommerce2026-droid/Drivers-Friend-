
import React, { useState } from 'react';
import { Wallet, TrendingUp, Droplets, Lightbulb, Loader2, Wrench, FileDown } from 'lucide-react';
import { getFinancialAdvice } from '../services/geminiService';
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FinanceStoreState } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/formatters';

interface FinancialTabProps {
  state: FinanceStoreState;
}

const FinancialTab: React.FC<FinancialTabProps> = ({ state }) => {
  const [advice, setAdvice] = useState<{title: string, advice: string}[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const dashboard = state.getNetProfitStats();
  const lastShiftSummary = state.lastShiftSummary;
  const totalBalances = state.getTotalBalances();
  
  const isFuelDeficit = state.reservasAtuais.combustivel < 0;
  const isSubDeficit = state.reservasAtuais.subsistenceReserve < 0;
  
  const hasDeficit = dashboard.lucroRealAtual < 0;

  const kmRows = [
    { 
      area: 'Combustível', 
      dep: state.reservasAtuais.combustivel + state.saldosAcumulados.combustivel, 
      meta: state.pendingKmDeduction * state.getCostPerKm(), 
      icon: <Droplets size={14} className="text-amber-500"/>, 
      color: 'text-amber-500' 
    },
    { area: 'Manutenção', dep: state.reservasAtuais.manutencao, meta: 0, icon: <Wrench size={14} className="text-[#3B82F6]"/>, color: 'text-[#3B82F6]', detail: state.maintenancePlans },
  ];

  const dayRows = state.fixedCosts.map(c => ({
    area: c.nome,
    dep: c.valor / 30, // Assuming monthly
    meta: c.valor / 30,
    icon: <Wallet size={14} className="text-[#3B82F6]"/>,
    color: 'text-[#3B82F6]'
  }));

  const chartData = (state.getDailyReports() || [])
    .slice(0, 7)
    .reverse()
    .map(report => {
      const d = new Date(report.date);
      return {
        date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        lucroReal: report.netValue,
        meta: (report.reserves?.salary || 0) + (report.reserves?.fixedCosts || 0),
        custosFixos: report.reserves?.fixedCosts || 0,
        custosVariaveis: (report.reserves?.fuel || 0) + (report.reserves?.maintenance || 0) + (report.reserves?.expenses || 0)
      };
    });

  const fetchAdvice = async () => {
    if (loadingAdvice) return;
    setLoadingAdvice(true);
    const stats = {
      totalGrossToday: dashboard.faturamentoBruto,
      realPocket: dashboard.lucroRealAtual,
      totalReservesToday: dashboard.faturamentoBruto - dashboard.lucroRealAtual,
      amortizationFund: state.financialConfig?.amortizationFund || 0,
      surplusReserve: state.saldosAcumulados.surplusReserve || 0,
      metaDiaria: dashboard.faturamentoAlvo || 0
    };
    const res = await getFinancialAdvice(stats);
    setAdvice(res);
    setLoadingAdvice(false);
  };

  const exportToExcel = () => {
    const ridesData = state.rides.map(r => ({
      Data: new Date(r.timestamp).toLocaleDateString('pt-BR'),
      Hora: new Date(r.timestamp).toLocaleTimeString('pt-BR'),
      App: r.appName,
      Bruto: r.valueGross,
      TaxaApp: r.feeValue,
      Liquido: r.valueNet,
      Pocket: r.valuePocket,
      Pagamento: r.paymentMethod,
      KM_Total: r.telemetry.kmTotal
    }));

    const fuelData = state.fuelEntries.map(f => ({
      Data: new Date(f.date).toLocaleDateString('pt-BR'),
      Litros: f.liters,
      PrecoLitro: f.pricePerLiter,
      Total: f.totalValue,
      Odo: f.odometer,
      Posto: f.stationName,
      Tipo: f.fuelType,
      Pagamento: f.paymentMethod
    }));

    const expensesData = state.expenseEntries.map(e => ({
      Data: new Date(e.date).toLocaleDateString('pt-BR'),
      Descricao: e.description,
      Valor: e.value,
      Categoria: e.category,
      Tipo: e.type,
      Pagamento: e.paymentMethod
    }));

    const wb = XLSX.utils.book_new();
    const wsRides = XLSX.utils.json_to_sheet(ridesData);
    const wsFuel = XLSX.utils.json_to_sheet(fuelData);
    const wsExpenses = XLSX.utils.json_to_sheet(expensesData);

    XLSX.utils.book_append_sheet(wb, wsRides, "Corridas");
    XLSX.utils.book_append_sheet(wb, wsFuel, "Abastecimentos");
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos");

    XLSX.writeFile(wb, `Relatorio_Mensal_${new Date().getMonth() + 1}_${new Date().getFullYear()}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-[16px] animate-slide-up pb-8">
      <header className="border-b border-[#334155] pb-3">
        <h1 className="text-xl font-black italic text-[#3B82F6] tracking-tighter uppercase">Inteligência Financeira</h1>
        <p className="text-[9px] font-bold text-[#64748B] italic leading-none uppercase">Saldos operacionais em tempo real</p>
      </header>
      
      {(isFuelDeficit || isSubDeficit) && (
        <div className="bg-rose-500/10 border-2 border-rose-500 p-4 rounded-2xl animate-pulse flex items-center gap-3">
          <div className="bg-rose-500 text-white p-2 rounded-xl"><TrendingUp size={20} className="rotate-180"/></div>
          <div>
            <h3 className="text-[12px] font-black text-rose-500 italic uppercase leading-none">Alerta de Déficit de Operação</h3>
            <p className="text-[9px] font-bold text-rose-500/80 mt-1 uppercase">Sua reserva de combustível foi consumida por gastos manuais. Próximas corridas serão sequestradas para reposição.</p>
          </div>
        </div>
      )}
      
      <div className={`p-4 rounded-2xl shadow-xl border relative overflow-hidden transition-colors duration-500 ${hasDeficit ? 'bg-rose-950/20 border-rose-500' : 'bg-[#1E293B] border-[#334155]'}`}>
        <p className="text-[9px] font-black text-[#64748B] italic mb-2 uppercase">Líquido no Bolso (Real Profit)</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-bold italic ${hasDeficit ? 'text-rose-500' : 'text-[#10B981]'}`}>R$</span>
          <p className={`text-4xl font-black italic tracking-tighter ${hasDeficit ? 'text-rose-500' : 'text-[#F1F5F9]'}`}>{formatCurrency(dashboard.lucroRealAtual)}</p>
        </div>
        
        {/* Pilares da Meta */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#334155]/50 pt-4">
           <div className="text-center">
              <p className="text-[6px] font-black text-[#64748B] uppercase italic">Pilar X (Líquido)</p>
              <p className="text-[10px] font-black text-[#3B82F6]">R$ {formatCurrency(dashboard.pilarX)}</p>
           </div>
           <div className="text-center">
              <p className="text-[6px] font-black text-[#64748B] uppercase italic">Pilar Y (Operacional)</p>
              <p className="text-[10px] font-black text-amber-500">R$ {formatCurrency(dashboard.pilarY)}</p>
           </div>
           <div className="text-center">
              <p className="text-[6px] font-black text-[#64748B] uppercase italic">Pilar B (Margem)</p>
              <p className="text-[10px] font-black text-rose-500">R$ {formatCurrency(dashboard.pilarB)}</p>
           </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
           <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]">
              <p className="text-[7px] font-black text-[#64748B] italic uppercase mb-1">Ganhos Brutos</p>
              <p className="text-[10px] font-black text-[#F1F5F9]">R$ {formatCurrency(dashboard.faturamentoBruto)}</p>
           </div>
           <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]">
              <p className="text-[7px] font-black text-rose-500 italic uppercase mb-1">Total Reservas</p>
              <p className="text-[10px] font-black text-rose-500">R$ {formatCurrency(dashboard.faturamentoBruto - dashboard.lucroRealAtual)}</p>
           </div>
           <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]">
              <p className="text-[7px] font-black text-[#10B981] italic uppercase mb-1">Líquido Livre</p>
              <p className="text-[10px] font-black text-[#10B981]">R$ {formatCurrency(dashboard.lucroRealAtual)}</p>
           </div>
        </div>
      </div>

      {/* SALDOS TOTAIS ACUMULADOS (NOVO) */}
      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-2xl shadow-lg">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Saldos Totais Acumulados</h3>
            <p className="text-[8px] font-bold text-[#64748B] uppercase">Montante líquido (Descontado gastos e reservas)</p>
          </div>
          <div className="bg-[#10B981]/20 p-1.5 rounded-lg text-[#10B981]"><Wallet size={16}/></div>
        </header>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155] text-center">
            <p className="text-[7px] font-black text-[#64748B] uppercase mb-1">Dinheiro</p>
            <p className="text-[12px] font-black text-[#10B981]">R$ {formatCurrency(totalBalances.cash)}</p>
          </div>
          <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155] text-center">
            <p className="text-[7px] font-black text-[#64748B] uppercase mb-1">Pix</p>
            <p className="text-[12px] font-black text-[#10B981]">R$ {formatCurrency(totalBalances.pix)}</p>
          </div>
          <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155] text-center">
            <p className="text-[7px] font-black text-[#64748B] uppercase mb-1">Cartão (Déb/Créd)</p>
            <p className="text-[12px] font-black text-[#3B82F6]">R$ {formatCurrency(totalBalances.card)}</p>
          </div>
        </div>
        <div className="mt-3 bg-[#0F172A] p-2 rounded-xl border border-[#334155] flex justify-between items-center">
          <p className="text-[8px] font-black text-[#64748B] uppercase">Total Geral em Mãos</p>
          <p className="text-[14px] font-black text-[#F1F5F9] italic">R$ {formatCurrency(totalBalances.cash + totalBalances.pix + totalBalances.card)}</p>
        </div>
      </div>

      {/* TRANSFERÊNCIA DE DINHEIRO PARA PIX (NOVO) */}
      <div className="bg-[#1E293B] border border-[#3B82F6]/30 p-4 rounded-2xl shadow-lg">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Depósito / Transferência para Pix</h3>
            <p className="text-[8px] font-bold text-[#64748B] uppercase">Mover dinheiro físico para sua conta digital</p>
          </div>
          <div className="bg-[#3B82F6]/20 p-1.5 rounded-lg text-[#3B82F6]"><TrendingUp size={16}/></div>
        </header>
        
        <div className="flex gap-2">
          <input 
            type="number" 
            placeholder="Valor R$"
            className="flex-1 bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-xs font-black text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
            id="transferAmount"
          />
          <button 
            onClick={() => {
              const input = document.getElementById('transferAmount') as HTMLInputElement;
              const val = parseFloat(input.value);
              if (val > 0) {
                state.transferCashToPix(val);
                input.value = '';
                alert(`Transferência de R$ ${val.toFixed(2)} registrada com sucesso!`);
              }
            }}
            className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic active:scale-95 transition-all"
          >
            Transferir
          </button>
        </div>
        <p className="text-[7px] text-[#64748B] italic mt-2 uppercase">*Isso reduzirá seu saldo em dinheiro e aumentará seu saldo Pix no relatório.</p>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-2xl shadow-lg">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Relatórios Mensais</h3>
            <p className="text-[8px] font-bold text-[#64748B] uppercase">Exportar dados para Excel</p>
          </div>
          <button 
            onClick={exportToExcel}
            className="bg-[#10B981] text-white p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase italic active:scale-95 transition-all"
          >
            <FileDown size={16}/> Exportar Excel
          </button>
        </header>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-2xl shadow-lg">
          <p className="text-[7px] font-black text-[#64748B] uppercase italic mb-1">Excedente Acumulado</p>
          <p className="text-base font-black text-amber-400 italic">R$ {formatCurrency(state.saldosAcumulados.surplusReserve)}</p>
          <p className="text-[6px] font-bold text-[#64748B] uppercase mt-1">Crédito para amortização</p>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-2xl shadow-lg">
        <header className="mb-4">
          <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Evolução Financeira (7 Dias)</h3>
          <p className="text-[8px] font-bold text-[#64748B] uppercase">Lucro Real vs Meta de Sobrevivência</p>
        </header>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748B" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `R$${formatCurrency(value)}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                formatter={(value: number) => [`R$ ${formatCurrency(value)}`, '']}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="lucroReal" 
                name="Lucro Real" 
                stroke="#10B981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10B981' }} 
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="meta" 
                name="Meta" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Distribuição de Custos */}
      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-2xl shadow-lg">
        <header className="mb-4">
          <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Distribuição de Custos (7 Dias)</h3>
          <p className="text-[8px] font-bold text-[#64748B] uppercase">Fixos vs Variáveis</p>
        </header>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" fontSize={8} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${formatCurrency(value)}`} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} itemStyle={{ fontSize: '10px', fontWeight: 'bold' }} formatter={(value: number) => [`R$ ${formatCurrency(value)}`, '']} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Bar dataKey="custosFixos" name="Custos Fixos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custosVariaveis" name="Custos Variáveis" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Relatório de Envelopes */}
      {lastShiftSummary && lastShiftSummary.reserves && (
        <div className="bg-[#1E293B] border border-[#3B82F6]/30 p-4 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-2xl flex items-center justify-center text-[#3B82F6]"><Wallet size={20}/></div>
            <div>
              <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Último Fechamento: Envelopes</h3>
              <p className="text-[8px] font-bold text-[#64748B] uppercase">Distribuição de fundos do dia anterior</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Meta Salarial</p>
              <p className="text-[10px] font-black text-[#10B981]">R$ {formatCurrency(lastShiftSummary.reserves.salary)}</p>
            </div>
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Custos Fixos</p>
              <p className="text-[10px] font-black text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves.fixedCosts)}</p>
            </div>
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Gastos</p>
              <p className="text-[10px] font-black text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves.expenses)}</p>
            </div>
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Combustível</p>
              <p className="text-[10px] font-black text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves.fuel)}</p>
            </div>
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Manutenção</p>
              <p className="text-[10px] font-black text-[#F1F5F9]">R$ {formatCurrency(lastShiftSummary.reserves.maintenance)}</p>
            </div>
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Taxa App</p>
              <p className="text-[10px] font-black text-rose-500">R$ {formatCurrency(lastShiftSummary.reserves.appFees)}</p>
            </div>
            <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
              <p className="text-[7px] font-black text-[#64748B] uppercase italic">Taxa Cartão</p>
              <p className="text-[10px] font-black text-rose-500">R$ {formatCurrency(lastShiftSummary.reserves.cardFees)}</p>
            </div>
            {lastShiftSummary.cashToPixTransfers > 0 && (
              <div className="bg-[#10B981]/10 p-2 rounded-xl border border-[#10B981]/30 col-span-2">
                <p className="text-[7px] font-black text-[#10B981] uppercase italic">Depósito p/ Pix (Dinheiro Físico)</p>
                <p className="text-[10px] font-black text-[#10B981]">R$ {formatCurrency(lastShiftSummary.cashToPixTransfers)}</p>
              </div>
            )}
          </div>

          {lastShiftSummary.paymentMethods && (
            <div className="mt-4 pt-4 border-t border-[#334155]/50">
              <p className="text-[9px] font-black text-[#10B981] uppercase italic mb-2">Recebimentos (Formas de Pagamento)</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
                  <p className="text-[7px] font-black text-[#64748B] uppercase italic">Dinheiro</p>
                  <p className="text-[10px] font-black text-[#10B981]">R$ {formatCurrency(lastShiftSummary.paymentMethods.cash)}</p>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
                  <p className="text-[7px] font-black text-[#64748B] uppercase italic">Pix</p>
                  <p className="text-[10px] font-black text-[#10B981]">R$ {formatCurrency(lastShiftSummary.paymentMethods.pix)}</p>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
                  <p className="text-[7px] font-black text-[#64748B] uppercase italic">Débito</p>
                  <p className="text-[10px] font-black text-[#3B82F6]">R$ {formatCurrency(lastShiftSummary.paymentMethods.debit)}</p>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-xl border border-[#334155]/50">
                  <p className="text-[7px] font-black text-[#64748B] uppercase italic">Crédito</p>
                  <p className="text-[10px] font-black text-[#3B82F6]">R$ {formatCurrency(lastShiftSummary.paymentMethods.credit)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dicas do Gemini */}
      <div className="bg-[#1E293B] border border-[#3B82F6]/30 p-4 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-2xl flex items-center justify-center text-[#3B82F6]"><Lightbulb size={20}/></div>
            <div>
              <h3 className="text-[12px] font-black text-[#F1F5F9] italic uppercase tracking-tighter">Dicas de Inteligência</h3>
              <p className="text-[8px] font-bold text-[#64748B] uppercase">Análise personalizada Gemini</p>
            </div>
          </div>
          <button 
            onClick={fetchAdvice} 
            disabled={loadingAdvice}
            className="bg-[#3B82F6] text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase italic active:scale-95 disabled:opacity-50 transition-all"
          >
            {loadingAdvice ? 'Analisando...' : 'Pedir Dica'}
          </button>
        </div>

        {loadingAdvice ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="animate-spin text-[#3B82F6]" size={20} />
          </div>
        ) : (
          <div className="space-y-3">
            {advice.length > 0 ? (
              advice.map((item, idx) => (
                <div key={idx} className="bg-[#0F172A] p-3 rounded-xl border border-[#334155]/50">
                  <p className="text-[10px] font-black text-[#3B82F6] uppercase italic mb-1">{item.title}</p>
                  <p className="text-[9px] font-medium text-[#F1F5F9] leading-relaxed">{item.advice}</p>
                </div>
              ))
            ) : (
              <p className="text-[9px] text-[#64748B] italic text-center">Conectando ao cérebro financeiro...</p>
            )}
            
            <div className="bg-[#10B981]/10 p-3 rounded-xl border border-[#10B981]/30">
              <p className="text-[10px] font-black text-[#10B981] uppercase italic mb-1">Dica de Ouro</p>
              <p className="text-[9px] font-medium text-[#F1F5F9] leading-relaxed">
                Lembre-se: sempre que bater sua meta, reserve 10% do excedente para amortizar dívidas ou criar um fundo de reserva.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custos por KM */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-3 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
           <h3 className="text-[10px] font-black italic tracking-widest text-[#64748B] flex items-center gap-3 uppercase">
              <Droplets size={14} className="text-amber-500"/> Custos por KM (Variáveis)
           </h3>
           <span className="text-[8px] font-black text-amber-500/50 uppercase italic">Prioridade 1</span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#1E293B] border-b border-[#334155]/30 text-[9px] font-black text-[#64748B] italic uppercase">
              <th className="p-3">POTE</th>
              <th className="p-3 text-center">RESERVADO</th>
              <th className="p-3 text-right">META (DÍVIDA)</th>
            </tr>
          </thead>
          <tbody>
            {kmRows.map((row, i) => (
              <React.Fragment key={i}>
                <tr className="border-b border-[#334155]/20 hover:bg-[#0F172A]/30 transition-colors">
                  <td className="p-3 flex items-center gap-3">
                    <div className={row.color}>{row.icon}</div>
                    <span className="text-[10px] font-black text-[#F1F5F9] uppercase italic">{row.area}</span>
                  </td>
                  <td className="p-3 text-center financial-value text-[#F1F5F9] text-[11px]">R$ {formatCurrency(row.dep)}</td>
                  <td className="p-3 text-right text-[11px] font-bold text-rose-500">R$ {formatCurrency(row.meta)}</td>
                </tr>
                {row.area === 'Manutenção' && row.detail && row.detail.length > 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 pb-3 pt-0">
                       <div className="grid grid-cols-1 gap-1 pl-8">
                          {(row.detail || []).map((p: any, idx: number) => {
                            const rate = (p.estimatedValue || 0) / (p.intervalKm || 1);
                            const totalMaintRate = (row.detail || []).reduce((acc: number, x: any) => acc + ((x.estimatedValue || 0) / (x.intervalKm || 1)), 0);
                            const ratio = totalMaintRate > 0 ? (rate / totalMaintRate) : 0;
                            const val = (row.dep || 0) * ratio;
                            return (
                              <div key={idx} className="flex justify-between text-[7px] font-bold text-[#64748B] uppercase border-l border-[#334155] pl-2">
                                <span>{p.item}</span>
                                <span>R$ {formatCurrency(val)}</span>
                              </div>
                            );
                          })}
                       </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custos por Dia */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-3 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
           <h3 className="text-[10px] font-black italic tracking-widest text-[#64748B] flex items-center gap-3 uppercase">
              <Wallet size={14} className="text-[#3B82F6]"/> Custos por Dia (Fixos)
           </h3>
           <span className="text-[8px] font-black text-[#3B82F6]/50 uppercase italic">Prioridade 2</span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#1E293B] border-b border-[#334155]/30 text-[9px] font-black text-[#64748B] italic uppercase">
              <th className="p-3">POTE</th>
              <th className="p-3 text-center">RESERVADO</th>
              <th className="p-3 text-right">META DIÁRIA</th>
            </tr>
          </thead>
          <tbody>
            {dayRows.map((row, i) => (
              <tr key={i} className="border-b border-[#334155]/20 hover:bg-[#0F172A]/30 transition-colors">
                <td className="p-3 flex items-center gap-3">
                  <div className={row.color}>{row.icon}</div>
                  <span className="text-[10px] font-black text-[#F1F5F9] uppercase italic">{row.area}</span>
                </td>
                <td className="p-3 text-center financial-value text-[#F1F5F9] text-[11px]">R$ {formatCurrency(row.dep)}</td>
                <td className="p-3 text-right text-[11px] font-bold text-[#64748B]">R$ {formatCurrency(row.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialTab;
