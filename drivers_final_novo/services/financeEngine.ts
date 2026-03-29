
import { FixedCost, VariableRate, UserGoals, DynamicDashboardData, Conta, AjustesUsuario } from '../types';

export const calcularMetaExata = (ganhoBruto: number, kmNoExpediente: number, ajustes: AjustesUsuario, contas: Conta[]) => {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  
  // 1. CÁLCULO POR KM (Prioridade Máxima - Gastos Operacionais)
  const custoKmTotal = kmNoExpediente * (ajustes.custoManutencaoPorKm + ajustes.custoCombustivelPorKm);

  // 2. CÁLCULO DO SALÁRIO (Dias restantes até a data definida)
  let diasAteSalario;
  if (diaAtual <= ajustes.diaRecebimentoSalario) {
    diasAteSalario = ajustes.diaRecebimentoSalario - diaAtual + 1;
  } else {
    // Se já passou do dia este mês, calcula para o próximo
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    diasAteSalario = (ultimoDiaMes - diaAtual) + ajustes.diaRecebimentoSalario + 1;
  }
  const metaSalarioDiaria = ajustes.salarioPretendido / diasAteSalario; // Baseado nos dias restantes até o recebimento

  // 3. CÁLCULO DE CONTAS (Respeitando vencimentos específicos)
  let reservaContasHoje = 0;
  contas.forEach(conta => {
    let diasParaVencer;
    if (diaAtual <= conta.diaVencimento) {
      diasParaVencer = conta.diaVencimento - diaAtual + 1;
    } else {
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      diasParaVencer = (ultimoDiaMes - diaAtual) + conta.diaVencimento + 1;
    }
    reservaContasHoje += conta.valor / diasParaVencer;
  });

  // 4. SOBREVIDA / GASTOS DIÁRIOS (Os R$ 20 que você mencionou)
  const sobrevidaDiaria = 20;

  const metaRealDoDia = metaSalarioDiaria + reservaContasHoje + sobrevidaDiaria;
  const saldoAposKm = ganhoBruto - custoKmTotal;
  const sobraReal = saldoAposKm - metaRealDoDia;

  return {
    metaDiaria: metaRealDoDia.toFixed(2),
    custoKm: custoKmTotal.toFixed(2),
    saldoLivre: sobraReal.toFixed(2),
    diasRestantes: diasAteSalario
  };
};

/**
 * Motor de Cálculo Financeiro (Core Logic) - Drivers Friend
 * Baseado em Clean Architecture e Lógica Dinâmica
 */
export const calculateDynamicDashboard = (
  baseFixedCost: number,
  fixedCosts: FixedCost[],
  variableRate: VariableRate,
  goals: UserGoals,
  currentDate: Date,
  accumulatedDeficit: number = 0,
  kmsDrivenToday: number = 0,
  subsistenceValue: number = 0,
  appFeePercent: number = 25
): DynamicDashboardData => {
  const now = currentDate;
  const today = now.getDate();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  // 1. Salário + Custos Fixos Diários: (Meta - Acumulado) / Dias até dia 1 do próximo mês
  // Nota: O acumulado aqui é tratado via accumulatedDeficit se o usuário não bater a meta.
  // Se ele bater, o valor "sobra" no bolso.
  const totalFixedMensal = baseFixedCost + fixedCosts.reduce((acc, c) => acc + (c.valor || 0), 0);
  const dailyFixedCost = totalFixedMensal / 30;
  
  // Salário Diário: Salário Pretendido / Dias de Trabalho no Mês
  // Assumindo 4 semanas por mês para simplificar, ou usando o valor de diasTrabalhoSemana
  const diasTrabalhoMes = (goals.diasTrabalhoSemana || 5) * 4.33; // Média de semanas num mês
  const dailySalary = goals.salarioPretendido / diasTrabalhoMes;
  
  // Déficit diário a recuperar (dividido pelos dias restantes do mês)
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diffMsSalary = firstOfNextMonth.getTime() - now.getTime();
  const daysLeftSalary = Math.max(1, Math.ceil(diffMsSalary / (1000 * 60 * 60 * 24)));
  const dailyDeficit = (accumulatedDeficit || 0) / daysLeftSalary;

  const dailySalaryFixed = dailyFixedCost + dailySalary + dailyDeficit;
  
  // 2. Gastos de Subsistência (Almoço, etc) - Já é um valor diário
  const dailySubsistence = subsistenceValue;

  // Pilar X (Estrutural): Soma das necessidades líquidas diárias
  const pilarX = dailySalaryFixed + dailySubsistence;

  // 4. Pilar Y (Operacional): KM Rodado * (Combustível + Manutenção + Depreciação)
  const custoRealKM = (variableRate.combustivel || 0) + (variableRate.manutencao || 0) + (variableRate.depreciacao || 0);
  const pilarY = kmsDrivenToday * custoRealKM;
  
  // 5. Pilar B (Taxas): Gross - Net
  const feeDecimal = appFeePercent / 100;
  const metaBruta = (pilarX + pilarY) / (1 - feeDecimal);
  const pilarB = metaBruta - (pilarX + pilarY);

  // 6. Ponto de Equilíbrio (Break-even)
  const daysToCoverFixed = pilarX > 0 ? Math.ceil(totalFixedMensal / pilarX) : 0;
  const breakEvenDay = Math.min(lastDayOfMonth, today + daysToCoverFixed);

  // 7. Prioridade de Caixa (Vencimento mais próximo)
  const upcomingCosts = fixedCosts
    .filter(c => c.vencimento >= today)
    .sort((a, b) => a.vencimento - b.vencimento);
  
  const nextVencimento = upcomingCosts.length > 0 ? {
    nome: upcomingCosts[0].nome,
    valor: upcomingCosts[0].valor,
    diasRestantes: upcomingCosts[0].vencimento - today
  } : null;

  return {
    metaHoje: pilarX,
    pilarX,
    pilarY,
    pilarB,
    breakEvenDay,
    custoRealKM,
    proximoVencimento: nextVencimento,
    deficitAcumulado: accumulatedDeficit
  };
};
