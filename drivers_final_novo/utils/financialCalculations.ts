export interface FinanceData {
  ganhoBruto: number;
  kmRodados: number;
  custoCombustivelPorKm: number;
  contas: { valor: number; dataVencimento: string }[]; // Formato ISO "YYYY-MM-DD"
  salarioPretendidoMensal: number;
  gastosInesperadosMes: number;
  deficitAcumulado: number;
}

export const calcularFechamentoDiario = (data: FinanceData) => {
  const hoje = new Date();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasNoMes = ultimoDiaMes;
  const diasRestantesMes = ultimoDiaMes - hoje.getDate() + 1;

  // 1. PRIORIDADE ZERO: Custo Operacional (Direto do ganho bruto)
  const custoOperacional = data.kmRodados * data.custoCombustivelPorKm;

  // 2. CONTAS COM VENCIMENTO (Cálculo por urgência)
  let reservaContasHoje = 0;
  data.contas.forEach(conta => {
    const venc = new Date(conta.dataVencimento);
    const diffMilis = venc.getTime() - hoje.getTime();
    const diasParaVencer = Math.max(Math.ceil(diffMilis / (1000 * 60 * 60 * 24)), 1);
    
    // Se a conta vence em 1 dia, pega o valor total hoje. Se vence em 10, pega 1/10.
    reservaContasHoje += conta.valor / diasParaVencer;
  });

  // 3. SALÁRIO E AMORTIZAÇÕES
  const reservaSalarioHoje = data.salarioPretendidoMensal / diasNoMes;
  const amortizacaoInesperados = data.gastosInesperadosMes / diasRestantesMes;
  const amortizacaoDeficit = data.deficitAcumulado / diasRestantesMes;

  // CÁLCULO FINAL
  const metaTotalNecessaria = reservaContasHoje + reservaSalarioHoje + amortizacaoInesperados + amortizacaoDeficit;
  const saldoLivreReal = (data.ganhoBruto - custoOperacional) - metaTotalNecessaria;

  return {
    custoOperacional: custoOperacional.toFixed(2),
    reservaContas: reservaContasHoje.toFixed(2),
    metaDoDia: metaTotalNecessaria.toFixed(2),
    saldoLivre: saldoLivreReal.toFixed(2),
    alerta: saldoLivreReal < 0 ? "Atenção: Meta não atingida!" : "Meta Batida!"
  };
};
