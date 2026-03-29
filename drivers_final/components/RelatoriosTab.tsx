
import React, { useMemo, useState } from 'react';
import { DailyReport } from '../types';
import { BarChart2, Calendar, ChevronDown, ChevronUp, Wallet, Droplets, Smartphone, TrendingUp, PieChart as PieChartIcon, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { formatCurrency, formatKm, formatPercent } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { useFinanceStore } from '../store/useFinanceStore';

interface RelatoriosTabProps {
  reports: DailyReport[];
}

const RelatoriosTab: React.FC<RelatoriosTabProps> = ({ reports }) => {
  const resetApp = useFinanceStore(s => s.resetApp);
  const fuelEntries = useFinanceStore(s => s.fuelEntries);
  const sortedReports = useMemo(() => {
    if (!reports) return [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return [...reports]
      .filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports]);

  const currentMonthFuelEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return fuelEntries.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [fuelEntries]);

  const exportToExcel = () => {
    const dataToExport = sortedReports.map(report => {
      const row: any = {
        'Início Expediente': report.startDate ? `${new Date(report.startDate).toLocaleDateString('pt-BR')} ${new Date(report.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : new Date(report.date).toLocaleDateString('pt-BR'),
        'Fim Expediente': report.endDate ? `${new Date(report.endDate).toLocaleDateString('pt-BR')} ${new Date(report.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '',
        'Faturamento Bruto': report.grossValue,
        'Líquido (Pocket)': report.netValue,
        'Salário Pretendido': report.reserves?.salary || 0,
        'KM Total': report.kmTotal,
        'KM Produtivo': report.kmProductive,
        'KM Vazio': report.kmEmpty,
        'Qtd Corridas': report.ridesCount,
        'Total a Reservar': report.totalReservar,
        'Reserva Combustível': report.reserves?.fuel || 0,
        'Reserva Manutenção': report.reserves?.maintenance || 0,
        'Gastos com Vencimento (Fixos)': report.reserves?.fixedCosts || 0,
        'Gastos Inesperados': report.reserves?.expenses || 0,
        'Taxas de App': report.reserves?.appFees || 0,
        'Taxas de Cartão': report.reserves?.cardFees || 0,
        'Amortização de Déficit': report.reserves?.amortization || 0,
        'Reserva de Excedente': report.reserves?.surplusReserve || 0,
        'Dinheiro': report.paymentMethods?.cash || 0,
        'Pix': report.paymentMethods?.pix || 0,
        'Depósito p/ Pix': report.cashToPixTransfers || 0,
        'Débito': report.paymentMethods?.debit || 0,
        'Crédito': report.paymentMethods?.credit || 0,
      };

      // Add detailed maintenance
      if (report.reserves?.maintenanceDetail) {
        report.reserves.maintenanceDetail.forEach(item => {
          row[`Manutenção - ${item.name}`] = item.value;
        });
      }

      // Add detailed fixed costs
      if (report.reserves?.fixedCostsDetail) {
        report.reserves.fixedCostsDetail.forEach(item => {
          row[`Custo Fixo - ${item.name}`] = item.value;
        });
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, "Relatorio.xlsx");
    
    // Automatic cleanup after download
    if (confirm("Relatório baixado com sucesso. Deseja limpar os dados e o cache para iniciar um novo mês?")) {
      resetApp();
    }
  };

  const stats = useMemo(() => {
    if (sortedReports.length === 0) return null;
    return {
      bruto: sortedReports.reduce((s, r) => s + r.grossValue, 0),
      pocket: sortedReports.reduce((s, r) => s + (r.reserves?.salary || 0) + (r.reserves?.surplusReserve || 0), 0),
      taxas: sortedReports.reduce((s, r) => s + (r.reserves?.appFees || 0) + (r.reserves?.cardFees || 0), 0),
      combustivel: sortedReports.reduce((s, r) => s + (r.reserves?.fuel || 0), 0),
      manutencao: sortedReports.reduce((s, r) => s + (r.reserves?.maintenance || 0), 0),
      fixedCosts: sortedReports.reduce((s, r) => s + (r.reserves?.fixedCosts || 0), 0),
      salary: sortedReports.reduce((s, r) => s + (r.reserves?.salary || 0), 0),
      expenses: sortedReports.reduce((s, r) => s + (r.reserves?.expenses || 0), 0),
      surplusReserve: sortedReports.reduce((s, r) => s + (r.reserves?.surplusReserve || 0), 0),
      kmTotal: sortedReports.reduce((s, r) => s + (r.kmTotal || 0), 0),
      kmProductive: sortedReports.reduce((s, r) => s + (r.kmProductive || 0), 0),
      kmEmpty: sortedReports.reduce((s, r) => s + (r.kmEmpty || 0), 0),
      paymentMethods: {
        cash: sortedReports.reduce((s, r) => s + (r.paymentMethods?.cash || 0), 0),
        pix: sortedReports.reduce((s, r) => s + (r.paymentMethods?.pix || 0), 0),
        debit: sortedReports.reduce((s, r) => s + (r.paymentMethods?.debit || 0), 0),
        credit: sortedReports.reduce((s, r) => s + (r.paymentMethods?.credit || 0), 0),
      },
      fuel: {
        totalLiters: currentMonthFuelEntries.reduce((s, f) => s + (f.liters || 0), 0),
        cash: currentMonthFuelEntries.filter(f => f.paymentMethod === 'cash').reduce((s, f) => s + (f.totalValue || 0), 0),
        pix: currentMonthFuelEntries.filter(f => f.paymentMethod === 'pix').reduce((s, f) => s + (f.totalValue || 0), 0),
        debit: currentMonthFuelEntries.filter(f => f.paymentMethod === 'debit').reduce((s, f) => s + (f.totalValue || 0), 0),
        credit: currentMonthFuelEntries.filter(f => f.paymentMethod === 'credit').reduce((s, f) => s + (f.totalValue || 0), 0),
      }
    };
  }, [sortedReports, currentMonthFuelEntries]);

  if (sortedReports.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30 space-y-2">
        <BarChart2 size={24} />
        <p className="text-[8px] font-black italic">Sem dados históricos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      <header className="border-b border-[#334155] pb-1.5 flex justify-between items-center">
        <h1 className="text-xl font-black italic text-[#3B82F6] tracking-tighter">Relatórios</h1>
        <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#10B981] text-white px-3 py-1.5 rounded-xl text-[10px] font-black italic uppercase">
          <Download size={12} /> Exportar Excel
        </button>
      </header>

      <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-3xl shadow-xl space-y-3">
         <div className="text-center">
            <p className="text-[7px] font-black italic text-[#64748B]">Faturamento bruto total</p>
            <p className="text-2xl font-black text-[#F1F5F9] italic leading-none mt-1">R$ {formatCurrency(stats?.bruto)}</p>
         </div>
         <div className="bg-[#10B981]/10 p-3 rounded-2xl border border-[#10B981]/30 text-center">
            <p className="text-[7px] font-black italic text-[#10B981]">Lucro real (Pocket)</p>
            <p className="text-3xl font-black text-[#10B981] italic tracking-tighter leading-none mt-1">R$ {formatCurrency(stats?.pocket)}</p>
         </div>

         {/* Gráfico Donut Global */}
         {stats && (stats.taxas > 0 || stats.combustivel > 0 || stats.manutencao > 0 || stats.salary > 0 || stats.fixedCosts > 0 || stats.expenses > 0 || stats.surplusReserve > 0) && (
           <div className="pt-2 border-t border-[#334155]/50 flex flex-col items-center">
             <p className="text-[8px] font-black text-[#64748B] italic uppercase mb-2 self-start flex items-center gap-1">
               <PieChartIcon size={10}/> Distribuição Histórica:
             </p>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={[
                       { name: 'Taxas', value: stats.taxas, color: '#EF4444' },
                       { name: 'Combustível', value: stats.combustivel, color: '#F59E0B' },
                       { name: 'Manutenção', value: stats.manutencao, color: '#D97706' },
                       { name: 'Salário', value: stats.salary, color: '#10B981' },
                       { name: 'Custos Fixos', value: stats.fixedCosts, color: '#3B82F6' },
                       { name: 'Inesperados', value: stats.expenses, color: '#8B5CF6' },
                       { name: 'Excedente', value: stats.surplusReserve, color: '#059669' }
                     ].filter(d => d.value > 0)}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={65}
                     paddingAngle={2}
                     dataKey="value"
                     stroke="none"
                   >
                     {
                       [
                         { name: 'Taxas', value: stats.taxas, color: '#EF4444' },
                         { name: 'Combustível', value: stats.combustivel, color: '#F59E0B' },
                         { name: 'Manutenção', value: stats.manutencao, color: '#D97706' },
                         { name: 'Salário', value: stats.salary, color: '#10B981' },
                         { name: 'Custos Fixos', value: stats.fixedCosts, color: '#3B82F6' },
                         { name: 'Inesperados', value: stats.expenses, color: '#8B5CF6' },
                         { name: 'Excedente', value: stats.surplusReserve, color: '#059669' }
                       ].filter(d => d.value > 0).map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))
                     }
                   </Pie>
                   <RechartsTooltip 
                     formatter={(value: number) => `R$ ${formatCurrency(value)}`}
                     contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                     itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
         )}

         {/* Formas de Pagamento Global */}
         {stats && stats.paymentMethods && (
           <div className="pt-3 mt-3 border-t border-[#334155]/50">
             <p className="text-[8px] font-black text-[#3B82F6] italic uppercase mb-2 flex items-center gap-1">
               <Wallet size={10}/> Recebimentos Totais:
             </p>
             <div className="grid grid-cols-2 gap-x-4 gap-y-2">
               <div className="flex justify-between items-center bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30">
                 <span className="text-[8px] font-bold text-[#64748B] uppercase">Dinheiro</span>
                 <span className="text-[10px] font-black text-[#10B981] italic">R$ {formatCurrency(stats.paymentMethods.cash)}</span>
               </div>
               <div className="flex justify-between items-center bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30">
                 <span className="text-[8px] font-bold text-[#64748B] uppercase">Pix</span>
                 <span className="text-[10px] font-black text-[#10B981] italic">R$ {formatCurrency(stats.paymentMethods.pix)}</span>
               </div>
               <div className="flex justify-between items-center bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30">
                 <span className="text-[8px] font-bold text-[#64748B] uppercase">Débito</span>
                 <span className="text-[10px] font-black text-[#3B82F6] italic">R$ {formatCurrency(stats.paymentMethods.debit)}</span>
               </div>
               <div className="flex justify-between items-center bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30">
                 <span className="text-[8px] font-bold text-[#64748B] uppercase">Crédito</span>
                 <span className="text-[10px] font-black text-[#3B82F6] italic">R$ {formatCurrency(stats.paymentMethods.credit)}</span>
               </div>
             </div>
           </div>
         )}

         {/* Gráfico de KM Global */}
         {stats && stats.kmTotal > 0 && (
           <div className="pt-3 mt-3 border-t border-[#334155]/50 flex flex-col items-center">
             <p className="text-[8px] font-black text-[#3B82F6] italic uppercase mb-2 self-start flex items-center gap-1">
               <BarChart2 size={10}/> Distribuição de KM:
             </p>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={[
                       { name: 'Produtivo', value: stats.kmProductive, color: '#10B981' },
                       { name: 'Vazio/Desloc.', value: stats.kmEmpty, color: '#64748B' }
                     ].filter(d => d.value > 0)}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={65}
                     paddingAngle={2}
                     dataKey="value"
                     stroke="none"
                   >
                     {
                       [
                         { name: 'Produtivo', value: stats.kmProductive, color: '#10B981' },
                         { name: 'Vazio/Desloc.', value: stats.kmEmpty, color: '#64748B' }
                       ].filter(d => d.value > 0).map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))
                     }
                   </Pie>
                   <RechartsTooltip 
                     formatter={(value: number) => `${formatKm(value)} km`}
                     contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                     itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="w-full grid grid-cols-2 gap-2 mt-2">
               <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30 text-center">
                 <p className="text-[7px] font-bold text-[#64748B] uppercase">KM Total</p>
                 <p className="text-[12px] font-black text-[#F1F5F9] italic">{formatKm(stats.kmTotal)} km</p>
               </div>
               <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30 text-center">
                 <p className="text-[7px] font-bold text-[#64748B] uppercase">Eficiência</p>
                 <p className="text-[12px] font-black text-[#10B981] italic">{formatPercent((stats.kmProductive / Math.max(1, stats.kmTotal)) * 100)}</p>
               </div>
             </div>
           </div>
         )}
      </div>

      {/* Dados de Combustível */}
      {stats && stats.fuel && stats.fuel.totalLiters > 0 && (
        <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-3xl shadow-xl space-y-3 mb-4">
          <div className="flex flex-col items-center">
            <p className="text-[8px] font-black text-[#F59E0B] italic uppercase mb-2 self-start flex items-center gap-1">
              <Droplets size={10}/> Consumo de Combustível:
            </p>
            <div className="w-full grid grid-cols-2 gap-2">
              <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30 text-center">
                <p className="text-[7px] font-bold text-[#64748B] uppercase">Litros</p>
                <span className="text-[12px] font-black text-[#F1F5F9] italic">{stats.fuel.totalLiters.toFixed(2)} L</span>
              </div>
              <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30 text-center">
                <p className="text-[7px] font-bold text-[#64748B] uppercase">Média</p>
                <span className="text-[12px] font-black text-[#10B981] italic">{stats.fuel.totalLiters > 0 ? (stats.kmTotal / stats.fuel.totalLiters).toFixed(2) : 0} km/L</span>
              </div>
              <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30 text-center">
                <p className="text-[7px] font-bold text-[#64748B] uppercase">Dinheiro</p>
                <span className="text-[12px] font-black text-[#F59E0B] italic">R$ {formatCurrency(stats.fuel.cash)}</span>
              </div>
              <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/30 text-center">
                <p className="text-[7px] font-bold text-[#64748B] uppercase">Pix</p>
                <span className="text-[12px] font-black text-[#F59E0B] italic">R$ {formatCurrency(stats.fuel.pix)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sortedReports.slice(0, 10).map((dia, idx) => (
          <ReportItem key={idx} dia={dia} />
        ))}
      </div>
    </div>
  );
};

const ReportItem: React.FC<{ dia: DailyReport }> = ({ dia }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
      <div 
        className="p-3 flex justify-between items-center cursor-pointer active:bg-[#0F172A]/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center text-[#3B82F6]">
            <Calendar size={14}/>
          </div>
          <div>
            <p className="text-[10px] font-black text-[#F1F5F9] italic">
              {dia.startDate && dia.endDate ? (
                <>
                  {new Date(dia.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} {new Date(dia.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  <span className="mx-1 text-[#64748B]">-</span>
                  {new Date(dia.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} {new Date(dia.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </>
              ) : (
                <>
                  {new Date(dia.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} - {new Date(dia.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </p>
            <p className="text-[8px] font-bold text-[#64748B] uppercase">{formatKm(dia.kmTotal)} KM • {dia.ridesCount} CORRIDAS</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-[7px] font-black text-[#64748B] uppercase italic">Líquido Pocket</p>
            <p className="text-[13px] font-black text-[#10B981] italic">R$ {formatCurrency(dia.netValue)}</p>
          </div>
          <div className="text-[#64748B]">
            {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#334155]/30 space-y-3 animate-slide-down">
          {/* Gráfico Donut */}
          <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/50 flex flex-col items-center">
            <p className="text-[8px] font-black text-[#64748B] italic uppercase mb-2 self-start flex items-center gap-1">
              <PieChartIcon size={10}/> Distribuição do Faturamento:
            </p>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Taxas', value: (dia.reserves?.appFees || 0) + (dia.reserves?.cardFees || 0), color: '#EF4444' },
                      { name: 'Combustível', value: dia.reserves?.fuel || 0, color: '#F59E0B' },
                      { name: 'Manutenção', value: dia.reserves?.maintenance || 0, color: '#D97706' },
                      { name: 'Salário', value: dia.reserves?.salary || 0, color: '#10B981' },
                      { name: 'Custos Fixos', value: dia.reserves?.fixedCosts || 0, color: '#3B82F6' },
                      { name: 'Inesperados', value: dia.reserves?.expenses || 0, color: '#8B5CF6' },
                      { name: 'Excedente', value: dia.reserves?.surplusReserve || 0, color: '#059669' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {
                      [
                        { name: 'Taxas', color: '#EF4444' },
                        { name: 'Combustível', color: '#F59E0B' },
                        { name: 'Manutenção', color: '#D97706' },
                        { name: 'Salário', color: '#10B981' },
                        { name: 'Custos Fixos', color: '#3B82F6' },
                        { name: 'Inesperados', color: '#8B5CF6' },
                        { name: 'Excedente', color: '#059669' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))
                    }
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => `R$ ${formatCurrency(value)}`}
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de KM */}
          <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/50 flex flex-col items-center">
            <p className="text-[8px] font-black text-[#64748B] italic uppercase mb-2 self-start flex items-center gap-1">
              <BarChart2 size={10}/> Distribuição de KM:
            </p>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Produtivo', value: dia.kmProductive, color: '#10B981' },
                      { name: 'Vazio/Desloc.', value: dia.kmEmpty, color: '#64748B' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#64748B" />
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => `${formatKm(value)} km`}
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between w-full px-4 mt-1">
               <div className="text-center">
                  <p className="text-[6px] font-bold text-[#64748B] uppercase">Eficiência</p>
                  <p className="text-[10px] font-black text-[#10B981] italic">{formatPercent((dia.kmProductive / Math.max(1, dia.kmTotal)) * 100)}</p>
               </div>
               <div className="text-center">
                  <p className="text-[6px] font-bold text-[#64748B] uppercase">KM Total</p>
                  <p className="text-[10px] font-black text-[#F1F5F9] italic">{formatKm(dia.kmTotal)} km</p>
               </div>
            </div>
          </div>

          {/* Árvore de Custos */}
          <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/50">
            <p className="text-[8px] font-black text-[#3B82F6] italic uppercase mb-2 flex items-center gap-1">
              <Wallet size={10}/> Árvore de Custos:
            </p>
            <div className="space-y-2">
              <DetailRow icon={<TrendingUp size={10}/>} label="Total Bruto" value={dia.grossValue} color="text-[#F1F5F9]" />
              
              <div className="flex flex-col">
                <DetailRow icon={<Smartphone size={10}/>} label="Taxas Apps/Cartão" value={(dia.reserves?.appFees || 0) + (dia.reserves?.cardFees || 0)} color="text-rose-400" isNegative />
              </div>
              
              <div className="pt-1 border-t border-[#334155]/30">
                <DetailRow icon={<Droplets size={10}/>} label="Combustível & Manutenção" value={(dia.reserves?.fuel || 0) + (dia.reserves?.maintenance || 0)} color="text-amber-500" isNegative />
                <div className="pl-4 mt-1 space-y-1 border-l border-[#334155]/50 ml-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[7px] font-bold text-[#64748B] uppercase">Combustível</span>
                    <span className="text-[8px] font-black text-amber-500">R$ {formatCurrency(dia.reserves?.fuel)}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-[7px] font-bold text-[#64748B] uppercase">Manutenção</span>
                      <span className="text-[8px] font-black text-amber-600">R$ {formatCurrency(dia.reserves?.maintenance)}</span>
                    </div>
                    {dia.reserves?.maintenanceDetail && dia.reserves.maintenanceDetail.length > 0 && (
                      <div className="pl-2 mt-0.5 space-y-0.5">
                        {dia.reserves.maintenanceDetail.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center">
                            <span className="text-[6px] font-bold text-[#64748B] uppercase">- {item.name}</span>
                            <span className="text-[7px] font-black text-amber-600/80">R$ {formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-[#334155]/30 flex flex-col">
                <DetailRow icon={<Wallet size={10}/>} label="Salário Pretendido" value={dia.reserves?.salary || 0} color="text-[#10B981]" />
              </div>

              <div className="pt-1 border-t border-[#334155]/30 flex flex-col">
                <DetailRow icon={<Calendar size={10}/>} label="Gastos com Vencimento (Fixos)" value={dia.reserves?.fixedCosts || 0} color="text-[#3B82F6]" isNegative />
                {dia.reserves?.fixedCostsDetail && dia.reserves.fixedCostsDetail.length > 0 && (
                  <div className="pl-4 mt-1 space-y-1 border-l border-[#334155]/50 ml-1.5">
                    {dia.reserves.fixedCostsDetail.map((item: any, i: number) => (
                      <div key={`fixed-${i}`} className="flex justify-between items-center">
                        <span className="text-[6px] font-bold text-[#64748B] uppercase">- {item.name}</span>
                        <span className="text-[7px] font-black text-[#3B82F6]/80">R$ {formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {dia.reserves?.expenses > 0 && (
                <div className="pt-1 border-t border-[#334155]/30 flex flex-col">
                  <DetailRow icon={<TrendingUp size={10}/>} label="Gastos Inesperados" value={dia.reserves?.expenses || 0} color="text-rose-500" isNegative />
                </div>
              )}

              {(dia.reserves?.amortization > 0 || dia.reserves?.surplusReserve > 0) && (
                <div className="pt-1 border-t border-[#334155]/50 space-y-1">
                  {dia.reserves?.amortization > 0 && (
                    <DetailRow icon={<TrendingUp size={10}/>} label="Amortização de Déficit" value={dia.reserves.amortization} color="text-rose-500" isNegative />
                  )}
                  {dia.reserves?.surplusReserve > 0 && (
                    <DetailRow icon={<Wallet size={10}/>} label="Reserva de Excedente" value={dia.reserves.surplusReserve} color="text-emerald-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Formas de Pagamento */}
          {dia.paymentMethods && (
            <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/50">
              <p className="text-[8px] font-black text-[#3B82F6] italic uppercase mb-2 flex items-center gap-1">
                <Wallet size={10}/> Recebimentos (Formas de Pagamento):
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-bold text-[#64748B] uppercase">Dinheiro</span>
                  <span className="text-[9px] font-black text-[#10B981] italic">R$ {formatCurrency(dia.paymentMethods.cash)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-bold text-[#64748B] uppercase">Pix</span>
                  <span className="text-[9px] font-black text-[#10B981] italic">R$ {formatCurrency(dia.paymentMethods.pix)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-bold text-[#64748B] uppercase">Débito</span>
                  <span className="text-[9px] font-black text-[#3B82F6] italic">R$ {formatCurrency(dia.paymentMethods.debit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-bold text-[#64748B] uppercase">Crédito</span>
                  <span className="text-[9px] font-black text-[#3B82F6] italic">R$ {formatCurrency(dia.paymentMethods.credit)}</span>
                </div>
              </div>
              {dia.cashToPixTransfers > 0 && (
                <div className="mt-2 pt-1 border-t border-[#334155]/30 flex justify-between items-center">
                  <span className="text-[7px] font-black text-[#10B981] uppercase italic">Depósito p/ Pix (Dinheiro Físico)</span>
                  <span className="text-[9px] font-black text-[#10B981] italic">R$ {formatCurrency(dia.cashToPixTransfers)}</span>
                </div>
              )}
            </div>
          )}

          {/* KM Detalhado */}
          <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/50">
            <p className="text-[8px] font-black text-[#3B82F6] italic uppercase mb-2 flex items-center gap-1">
              <TrendingUp size={10}/> Detalhamento de KM:
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold text-[#64748B] uppercase">KM Total</span>
                <span className="text-[9px] font-black text-[#F1F5F9] italic">{formatKm(dia.kmTotal)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold text-[#64748B] uppercase">Produtivo</span>
                <span className="text-[9px] font-black text-[#10B981] italic">{formatKm(dia.kmProductive)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold text-[#64748B] uppercase">Vazio/Desloc.</span>
                <span className="text-[9px] font-black text-[#64748B] italic">{formatKm(dia.kmEmpty)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-bold text-[#64748B] uppercase">Média p/ Corrida</span>
                <span className="text-[9px] font-black text-[#3B82F6] italic">{formatKm(dia.kmTotal / Math.max(1, dia.ridesCount))} km</span>
              </div>
            </div>
          </div>

          {/* KM por Aplicativo */}
          {dia.kmPerApp && Object.keys(dia.kmPerApp).length > 0 && (
            <div className="bg-[#0F172A]/50 p-2 rounded-lg border border-[#334155]/50">
              <p className="text-[8px] font-black text-[#3B82F6] italic uppercase mb-2 flex items-center gap-1">
                <Smartphone size={10}/> Km por Aplicativo:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(dia.kmPerApp).map(([name, km]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-[7px] font-bold text-[#64748B] uppercase">{name}</span>
                    <span className="text-[9px] font-black text-[#F1F5F9] italic">{formatKm(km)} km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-[#334155]/20">
            <div>
              <p className="text-[7px] font-black text-[#64748B] uppercase">Lucro Bruto Total</p>
              <p className="text-[11px] font-black text-[#F1F5F9]">R$ {formatCurrency(dia.grossValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black text-[#10B981] uppercase italic">Total a Guardar</p>
              <p className="text-[11px] font-black text-[#10B981] italic">R$ {formatCurrency(dia.grossValue - Math.max(0, dia.netValue - (dia.reserves?.fixedCosts || 0)))}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ icon: React.ReactNode, label: string, value: number, color?: string, isNegative?: boolean }> = ({ icon, label, value, color = "text-[#F1F5F9]", isNegative = false }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-1.5">
      <span className="text-[#64748B]">{icon}</span>
      <span className="text-[8px] font-bold text-[#64748B] uppercase">{label}</span>
    </div>
    <span className={`text-[9px] font-black ${color}`}>{isNegative ? '- ' : ''}R$ {formatCurrency(value)}</span>
  </div>
);

export default RelatoriosTab;
