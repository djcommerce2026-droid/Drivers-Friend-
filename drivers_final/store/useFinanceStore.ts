import { Preferences } from '@capacitor/preferences';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  UserProfile, Vehicle, Ride, Shift, AppState, 
  FuelEntry, ExpenseEntry, MaintenancePlan, TransportApp, Station, FinancialConfig,
  UserPreferences, FixedCost, Planning, ShiftSummary
} from '../types';
import { useFuelStore } from './useFuelStore';
import { capacitorStorage } from '../services/storageService';

const STORAGE_KEY = 'drivers-friend-finance-storage-v2';

interface FinanceStoreState extends AppState {
  rides: Ride[];
  shifts: Shift[];
  fuelEntries: FuelEntry[];
  expenseEntries: ExpenseEntry[];
  maintenancePlans: MaintenancePlan[];
  lastShiftSummary: ShiftSummary | null;
  isLoading: boolean;
  surplusAppliedToday: boolean;
  kmPerApp: { [appId: string]: number };
  // New Planning State
  planning: Planning;
  
  // Computed
  getCostPerKm: () => number;
  getMaintReservePerKm: () => number;
  getMetaDiariaReal: () => number;
  getLucroReal: (faturamentoBruto: number, kmRodados: number) => number;
  getNetProfitStats: () => { faturamentoBruto: number, lucroRealAtual: number, pilarX: number, pilarY: number, pilarB: number, faturamentoAlvo: number };
  getDailyReports: () => DailyReport[];
  getTotalBalances: () => { cash: number, pix: number, card: number };
  getMonthlyReport: () => { 
    goal: number, 
    gross: number, 
    net: number, 
    surplus: number, 
    isGoalMet: boolean,
    monthName: string
  } | null;
  calcularMetaHoje: () => number;
  checkDailyReset: () => void;
  
  // Actions
  resetPlanning: () => void;
  updatePlanning: (updates: Partial<Planning>) => void;
  performMaintenance: (planId: string) => void;
  updateTransaction: (id: string, updates: any) => void;
  updateRide: (id: string, updates: Partial<Ride>) => void;
  updateFuelEntry: (id: string, updates: Partial<FuelEntry>) => void;
  updateExpense: (id: string, updates: Partial<ExpenseEntry>) => void;
  applyFinancialImpact: (impact: {
    combustivel?: number;
    manutencao?: number;
    metaSobrevivencia?: number;
    surplusReserve?: number;
    saldosCombustivel?: number;
    saldosManutencao?: number;
    saldosSurplus?: number;
  }) => void;
  
  // ... existing actions ...
  completeSetup: (u: UserProfile, v: Vehicle) => void;
  incrementOdo: (distance: number) => void;
  syncOdometer: (odo: number) => void;
  addFuel: (f: FuelEntry) => void;
  addRide: (ride: Ride, finalOdo?: number) => void;
  startShift: (odo: number, appId: string) => void;
  endShift: (odo: number, endTime?: string) => void;
  updateRideStage: (stage: string) => void;
  updateVehicle: (updates: Partial<Vehicle>) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateFinancialConfig: (updates: Partial<FinancialConfig>) => void;
  setCalculatorState: (calc: { prices: { gas: string; eth: string }; consumption: { gas: string; eth: string } }) => void;
  resetApp: () => void;
  confirmPayment: (id: string) => void;
  addExpense: (e: ExpenseEntry) => void;
  deleteExpense: (id: string) => void;
  addMaintenancePlan: (p: MaintenancePlan) => void;
  deleteMaintenancePlan: (id: string) => void;
  updateMaintenancePlan: (id: string, updates: Partial<MaintenancePlan>) => void;
  addFixedCost: (p: FixedCost) => void;
  deleteFixedCost: (id: string) => void;
  setFixedCosts: (list: FixedCost[]) => void;
  addTransportApp: (a: TransportApp) => void;
  addStation: (name: string) => Station;
  selectApp: (id: string) => void;
  setFuelOffset: (val: number) => void;
  syncFuelReserve: () => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  clearSummary: () => void;
  confirmSurplusReservation: (amount: number) => void;
  transferCashToPix: (amount: number) => void;
}

export const useFinanceStore = create<FinanceStoreState>()(
  persist(
    (set, get) => ({
      // ... initial state ...
      isSetupComplete: false,
      currentOdo: 0,
      initialOdoAtRegistration: 0,
      lastClosedOdo: 0,
      dayStartOdo: 0,
      rideStage: 'idle',
      transportApps: [],
      stations: [],
      dailyReports: [],
      fuelCredit: 0,
      pendingKmDeduction: 0,
      fixedCosts: [],
      deficitAcumulado: 0,
      financialConfig: {
        metaBaseDiaria: 250,
        diasUteisMes: 30, 
        kmDiariosAlvo: 200,
        excluirFinaisSemana: false,
        deficitsAcumulados: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        mesAtual: new Date().toISOString().slice(0, 7),
        fuelAmortizationDaily: 0,
        surplusAmortization: 0,
        dailyExpenseRate: 0.05,
        cardFeeDebit: 0,
        cardFeeCredit: 0,
        dailyResetHour: 0
      },
      calculatorState: {
        prices: { gas: '', eth: '' },
        consumption: { gas: '', eth: '' }
      },
      rides: [],
      shifts: [],
      fuelEntries: [],
      expenseEntries: [],
      maintenancePlans: [],
      lastShiftSummary: null,
      isLoading: false,
      surplusAppliedToday: false,
      kmPerApp: {},
      saldosAcumulados: { combustivel: 0, manutencao: 0, survival: 0, surplusReserve: 0 },
      reservasAtuais: { combustivel: 0, manutencao: 0, metaSobrevivencia: 0, amortization: 0, subsistenceReserve: 0, surplusReserve: 0 },
      preferences: {
        fontSize: 'medium',
        zoomLevel: 100,
        showMap: true,
        cardLayout: 'default'
      },

      // New Planning State
      planning: {
        monthlySalaryTarget: 0,
        monthlyFixedCosts: 0,
        daysCycle: 30
      },

      calcularMetaHoje: () => get().getMetaDiariaReal(),

      checkDailyReset: () => {
        const state = get();
        const resetHour = state.financialConfig?.dailyResetHour || 0;
        const now = new Date();
        const currentHour = now.getHours();
        
        // Se já passou da hora de reset
        if (currentHour >= resetHour) {
          const lastResetDate = state.financialConfig?.lastResetDate; // YYYY-MM-DD
          const todayDate = now.toISOString().split('T')[0];
          
          if (lastResetDate && lastResetDate !== todayDate) {
            // Check if month changed
            const lastReset = new Date(lastResetDate + 'T00:00:00');
            const today = new Date(todayDate + 'T00:00:00');
            
            if (lastReset.getMonth() !== today.getMonth() || lastReset.getFullYear() !== today.getFullYear()) {
              // Month changed! Reset general mileage (dayStartOdo)
              set({ dayStartOdo: state.currentOdo });
            }

            // Se tem turno ativo, encerra (o endShift já cuida do déficit do dia que encerrou)
            if (state.activeShift) {
              get().endShift(state.currentOdo);
            } else {
              // Se não tinha turno, o dia (ou dias) passou em branco. 
              // Precisamos adicionar o alvo diário ao déficit acumulado para cada dia perdido.
              
              if (lastReset.getMonth() !== today.getMonth() || lastReset.getFullYear() !== today.getFullYear()) {
                // Month changed! Reset deficit to 0, but add missed days of the current month.
                const missedDaysThisMonth = today.getDate() - 1;
                let newDeficit = 0;
                if (missedDaysThisMonth > 0) {
                  const dailySalaryTarget = (state.planning.monthlySalaryTarget || 0) / (state.planning.daysCycle || 30);
                  const dailyFixedCosts = state.fixedCosts.reduce((acc, c) => acc + (c.valor || 0), 0) / (state.planning.daysCycle || 30);
                  const dailyTarget = dailySalaryTarget + dailyFixedCosts;
                  newDeficit = dailyTarget * missedDaysThisMonth;
                }
                set({ deficitAcumulado: newDeficit });
              } else {
                const diffTime = Math.abs(today.getTime() - lastReset.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 0) {
                  const dailySalaryTarget = (state.planning.monthlySalaryTarget || 0) / (state.planning.daysCycle || 30);
                  const dailyFixedCosts = state.fixedCosts.reduce((acc, c) => acc + (c.valor || 0), 0) / (state.planning.daysCycle || 30);
                  const dailyTarget = dailySalaryTarget + dailyFixedCosts;
                  
                  // Adiciona o alvo dos dias perdidos ao déficit
                  set(s => ({ deficitAcumulado: s.deficitAcumulado + (dailyTarget * diffDays) }));
                }
              }
            }
            
            // Atualiza a data do último reset
            get().updateFinancialConfig({ lastResetDate: todayDate });
          }
        }
      },

      resetPlanning: () => set({
        planning: {
          monthlySalaryTarget: 0,
          monthlyFixedCosts: 0,
          daysCycle: 30
        }
      }),

      updatePlanning: (updates) => set(state => ({
        planning: { ...state.planning, ...updates }
      })),

      updateRide: (id, updates) => {
        const state = get();
        const oldRide = state.rides.find(r => r.id === id);
        if (!oldRide) return;

        const newRide = { ...oldRide, ...updates };
        
        // Recalculate derived fields
        const kmTotal = newRide.telemetry.kmTotal;
        const operationalCost = kmTotal * state.getCostPerKm();
        const maintReserve = kmTotal * state.getMaintReservePerKm();
        
        const cardFeePercent = newRide.paymentMethod === 'debit' ? state.financialConfig?.cardFeeDebit : (newRide.paymentMethod === 'credit' ? state.financialConfig?.cardFeeCredit : 0);
        newRide.fee_gateway = newRide.valueGross * ((cardFeePercent || 0) / 100);
        newRide.cardFeeValue = newRide.fee_gateway;
        newRide.fee_platform = newRide.valueGross * (newRide.feePercent / 100);
        newRide.feeValue = newRide.fee_platform;
        newRide.valueNet = newRide.valueGross - newRide.fee_platform - newRide.fee_gateway;
        
        const netProfit = newRide.valueGross - newRide.fee_platform - newRide.fee_gateway - operationalCost - maintReserve;
        
        // Re-calculate subsistence distribution for the new ride
        const todayStr = new Date().toDateString();
        const otherRides = state.rides.filter(r => r.id !== id && new Date(r.timestamp).toDateString() === todayStr);
        const subsistenceReservedOthers = otherRides.reduce((sum, r) => sum + (r.reservesApplied.amortization || 0), 0); 
        
        const dailySubsistence = state.user?.subsistenceValue || 0;
        const subsistenceNeeded = Math.max(0, dailySubsistence - subsistenceReservedOthers);
        const subsistenceToReserve = Math.min(Math.max(0, netProfit), subsistenceNeeded);
        const remainingForMeta = netProfit - subsistenceToReserve;

        newRide.valuePocket = Math.max(0, netProfit);
        newRide.valueOperational = operationalCost + maintReserve;
        newRide.reservesApplied = {
          salaryFixed: Math.max(0, remainingForMeta),
          fuel: operationalCost,
          maintenance: maintReserve,
          amortization: subsistenceToReserve,
        };

        // Reverse old impact
        get().applyFinancialImpact({
          combustivel: -(oldRide.reservesApplied.fuel || 0),
          manutencao: -(oldRide.reservesApplied.maintenance || 0),
          subsistenceReserve: -(oldRide.reservesApplied.amortization || 0),
          metaSobrevivencia: -(oldRide.reservesApplied.salaryFixed || 0)
        });

        // Apply new impact
        get().applyFinancialImpact({
          combustivel: newRide.reservesApplied.fuel,
          manutencao: newRide.reservesApplied.maintenance,
          subsistenceReserve: newRide.reservesApplied.amortization,
          metaSobrevivencia: newRide.reservesApplied.salaryFixed
        });

        set(state => ({
          rides: state.rides.map(r => r.id === id ? newRide : r)
        }));
      },

      updateFuelEntry: (id, updates) => {
        const state = get();
        const oldEntry = state.fuelEntries.find(f => f.id === id);
        if (!oldEntry) return;

        const newEntry = { ...oldEntry, ...updates };
        const deltaValue = newEntry.totalValue - oldEntry.totalValue;

        // If value increased, we spent more from fuel reserve
        get().applyFinancialImpact({
          combustivel: -deltaValue
        });

        set(state => ({
          fuelEntries: state.fuelEntries.map(f => f.id === id ? newEntry : f)
        }));
      },

      updateExpense: (id, updates) => {
        const state = get();
        const oldEntry = state.expenseEntries.find(e => e.id === id);
        if (!oldEntry) return;

        const newEntry = { ...oldEntry, ...updates };

        // Reverse old impact
        const oldDesc = oldEntry.description.toLowerCase();
        if (oldDesc.includes('almoço') || oldDesc.includes('refeição') || oldDesc.includes('comida')) {
          get().applyFinancialImpact({ subsistenceReserve: oldEntry.value });
        } else if (oldDesc.includes('manutenção') || oldDesc.includes('oficina') || oldDesc.includes('peça')) {
          get().applyFinancialImpact({ manutencao: oldEntry.value });
        } else if (oldDesc.includes('combustível') || oldDesc.includes('gasolina') || oldDesc.includes('etanol')) {
          get().applyFinancialImpact({ combustivel: oldEntry.value });
        } else {
          get().applyFinancialImpact({ metaSobrevivencia: oldEntry.value });
        }

        // Apply new impact
        const newDesc = newEntry.description.toLowerCase();
        if (newDesc.includes('almoço') || newDesc.includes('refeição') || newDesc.includes('comida')) {
          get().applyFinancialImpact({ subsistenceReserve: -newEntry.value });
        } else if (newDesc.includes('manutenção') || newDesc.includes('oficina') || newDesc.includes('peça')) {
          get().applyFinancialImpact({ manutencao: -newEntry.value });
        } else if (newDesc.includes('combustível') || newDesc.includes('gasolina') || newDesc.includes('etanol')) {
          get().applyFinancialImpact({ combustivel: -newEntry.value });
        } else {
          get().applyFinancialImpact({ metaSobrevivencia: -newEntry.value });
        }

        set(state => ({
          expenseEntries: state.expenseEntries.map(e => e.id === id ? newEntry : e)
        }));
      },

      getCostPerKm: () => {
        const fuelStore = useFuelStore.getState();
        const kmL = Math.max(0.1, fuelStore.medioKmL || 10);
        return fuelStore.precoAtual / kmL;
      },
      
      getMaintReservePerKm: () => {
        const plans = get().maintenancePlans || [];
        if (plans.length === 0) return 0;
        return plans.reduce((acc, plan) => {
          const interval = Math.max(1, plan.intervalKm);
          return acc + (plan.estimatedValue / interval);
        }, 0);
      },

      getMetaDiariaReal: () => {
        const state = get();
        const { planning, fixedCosts, transportApps, selectedAppId, deficitAcumulado, financialConfig } = state;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayZero = new Date(currentYear, currentMonth, now.getDate());

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const remainingDaysInMonth = Math.max(1, daysInMonth - now.getDate() + 1);

        // 1. Salário Pretendido (Mensal / dias do mês)
        const salarioMeta = Math.abs(Number(planning.monthlySalaryTarget)) || 0;
        const diasMes = Math.abs(Number(planning.daysCycle)) || 30;
        const lucroLimpoDiario = salarioMeta / diasMes;

        // 2. Gastos Fixos Fracionados (Lógica de Vencimento)
        // G_fd = Sum(Valor Total do Gasto / (Data de Vencimento - Data Atual))
        const custoFixoDiario = fixedCosts.reduce((acc, cost) => {
          const valor = Math.abs(Number(cost.valor));
          const diaVencimento = cost.diaVencimento;
          
          let dueDate = new Date(currentYear, currentMonth, diaVencimento);
          if (dueDate < todayZero) {
            // Se já passou este mês, é para o próximo mês
            dueDate = new Date(currentYear, currentMonth + 1, diaVencimento);
          }
          
          const diffDays = Math.max(1, Math.round((dueDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24)));
          
          return acc + (valor / diffDays);
        }, 0);

        // 3. Subsistência
        const subsistence = state.user?.subsistenceValue || 0;

        // 4. Gastos Variáveis baseados no KM (Combustível + Manutenção)
        const kmDiariosAlvo = financialConfig?.kmDiariosAlvo || 200;
        const custoCombustivelPorKm = state.getCostPerKm();
        const custoManutencaoPorKm = state.getMaintReservePerKm();
        const custoOperacionalDiario = kmDiariosAlvo * (custoCombustivelPorKm + custoManutencaoPorKm);

        // 5. SOMA DAS NECESSIDADES LÍQUIDAS
        const necessidadeLiquidaTotal = lucroLimpoDiario + custoFixoDiario + subsistence + custoOperacionalDiario;
        
        // 6. COMPENSAÇÃO DE TAXAS (MARKUP)
        const currentApp = transportApps.find(a => a.id === selectedAppId);
        const taxaAppPercentual = currentApp ? Math.abs(Number(currentApp.feePercent)) / 100 : 0.25;
        const fatorTaxa = (1 - taxaAppPercentual) > 0 ? (1 - taxaAppPercentual) : 0.75;
        
        // 7. AMORTIZAÇÃO DO DÉFICIT NA META
        const deficitDiario = deficitAcumulado / remainingDaysInMonth;

        const resultadoFinal = (necessidadeLiquidaTotal / fatorTaxa) + (deficitDiario / fatorTaxa);
        
        return Number(Math.max(0, resultadoFinal).toFixed(2));
      },

      getLucroReal: (faturamentoBruto, kmRodados) => {
        const custoOperacional = kmRodados * get().getCostPerKm();
        return faturamentoBruto - custoOperacional;
      },

      getNetProfitStats: () => {
        const state = get();
        const todayStr = new Date().toDateString();
        const todayRides = state.rides.filter(r => new Date(r.timestamp).toDateString() === todayStr);
        
        const faturamentoBruto = todayRides.reduce((s, r) => s + (r.valueGross || 0), 0);
        const totalFees = todayRides.reduce((s, r) => s + (r.feeValue || 0) + (r.cardFeeValue || 0), 0);
        const kmTotal = Math.max(0, state.currentOdo - (state.dayStartOdo || state.currentOdo));
        
        const operationalCost = kmTotal * get().getCostPerKm();
        const maintReserve = kmTotal * get().getMaintReservePerKm();
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayZero = new Date(currentYear, currentMonth, now.getDate());

        const dailyFixedCost = state.fixedCosts.reduce((acc, cost) => {
          const valor = Math.abs(Number(cost.valor));
          const diaVencimento = cost.diaVencimento;
          
          let dueDate = new Date(currentYear, currentMonth, diaVencimento);
          if (dueDate < todayZero) {
            dueDate = new Date(currentYear, currentMonth + 1, diaVencimento);
          }
          
          const diffDays = Math.max(1, Math.round((dueDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24)));
          return acc + (valor / diffDays);
        }, 0);
        
        const todaysExpenses = state.expenseEntries
          .filter(e => new Date(e.dueDate || e.date).toDateString() === todayStr && e.category !== 'Combustível' && e.category !== 'Manutenção')
          .reduce((s, e) => s + (e.value || 0), 0);
        
        const rawLucroReal = faturamentoBruto - totalFees - operationalCost - maintReserve - dailyFixedCost - todaysExpenses;
        const lucroRealAtual = Math.max(0, Number(rawLucroReal.toFixed(2)));
        const faturamentoAlvo = get().getMetaDiariaReal();
        const progressoMeta = faturamentoAlvo > 0 ? (faturamentoBruto / faturamentoAlvo) * 100 : 0;
        
        return {
          faturamentoBruto,
          lucroRealAtual,
          pilarX: lucroRealAtual,
          pilarY: operationalCost + maintReserve + totalFees,
          pilarB: dailyFixedCost + todaysExpenses,
          faturamentoAlvo,
          progressoMeta
        };
      },

      getDailyReports: () => {
        const state = get();
        const resetHour = state.financialConfig?.dailyResetHour || 0;
        const reportsMap = new Map<string, DailyReport>();

        // Helper to get business day and range
        const getShiftBusinessDay = (dateStr: string) => {
          const d = new Date(dateStr);
          const hour = d.getHours();
          const businessDate = new Date(d);
          if (hour < resetHour) {
            businessDate.setDate(businessDate.getDate() - 1);
          }
          businessDate.setHours(resetHour, 0, 0, 0);
          
          const startDate = new Date(businessDate);
          const endDate = new Date(businessDate);
          endDate.setDate(endDate.getDate() + 1);
          
          return {
            id: businessDate.toISOString().split('T')[0],
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          };
        };

        // Processar Turnos
        state.shifts.forEach(shift => {
          if (!shift.endOdo || !shift.summary) return;
          
          const { id: businessDayId, startDate, endDate } = getShiftBusinessDay(shift.startTime);
          
          if (!reportsMap.has(businessDayId)) {
            reportsMap.set(businessDayId, {
              date: businessDayId,
              startDate,
              endDate,
              kmTotal: 0,
              kmProductive: 0,
              kmEmpty: 0,
              ridesCount: 0,
              grossValue: 0,
              netValue: 0,
              totalReservar: 0,
              reserves: {
                salary: 0,
                salaryAndFixed: 0,
                fixedCosts: 0,
                fixedCostsDetail: [],
                fuel: 0,
                maintenance: 0,
                maintenanceDetail: [],
                amortization: 0,
                dailyExpenses: 0,
                expenses: 0,
                appFees: 0,
                cardFees: 0,
                surplusReserve: 0
              },
              paymentMethods: { cash: 0, pix: 0, debit: 0, credit: 0 },
              cashToPixTransfers: 0,
              kmPerApp: {}
            });
          }

          const report = reportsMap.get(businessDayId)!;
          report.kmTotal += (shift.endOdo - shift.startOdo);
          report.grossValue += shift.summary.brutoTotal;
          report.netValue += shift.summary.liquidoMao;
          report.totalReservar += shift.summary.totalReservar;
          report.cashToPixTransfers = (report.cashToPixTransfers || 0) + (shift.summary.cashToPixTransfers || 0);
          
          // Accumulate reserves
          report.reserves.salary += (shift.summary.reserves.salary || 0);
          report.reserves.salaryAndFixed += (shift.summary.reserves.salaryAndFixed || 0);
          report.reserves.fixedCosts += (shift.summary.reserves.fixedCosts || 0);
          report.reserves.fuel += (shift.summary.reserves.fuel || 0);
          report.reserves.maintenance += (shift.summary.reserves.maintenance || 0);
          report.reserves.amortization += (shift.summary.reserves.amortization || 0);
          report.reserves.expenses += (shift.summary.reserves.expenses || 0);
          report.reserves.dailyExpenses += (shift.summary.reserves.expenses || 0);
          report.reserves.appFees += (shift.summary.reserves.appFees || 0);
          report.reserves.cardFees += (shift.summary.reserves.cardFees || 0);
          report.reserves.surplusReserve += (shift.summary.reserves.surplusReserve || 0);

          // Merge details
          if (shift.summary.reserves.maintenanceDetail) {
            shift.summary.reserves.maintenanceDetail.forEach(d => {
              const existing = report.reserves.maintenanceDetail!.find(ed => ed.name === d.name);
              if (existing) existing.value += d.value;
              else report.reserves.maintenanceDetail!.push({ ...d });
            });
          }
          if (shift.summary.reserves.fixedCostsDetail) {
            shift.summary.reserves.fixedCostsDetail.forEach(d => {
              const existing = report.reserves.fixedCostsDetail!.find(ed => ed.name === d.name);
              if (existing) existing.value += d.value;
              else report.reserves.fixedCostsDetail!.push({ ...d });
            });
          }

          // Accumulate payment methods
          if (shift.summary.paymentMethods) {
            report.paymentMethods!.cash += (shift.summary.paymentMethods.cash || 0);
            report.paymentMethods!.pix += (shift.summary.paymentMethods.pix || 0);
            report.paymentMethods!.debit += (shift.summary.paymentMethods.debit || 0);
            report.paymentMethods!.credit += (shift.summary.paymentMethods.credit || 0);
          }
        });

        // Processar Corridas
        state.rides.forEach(ride => {
          const { id: businessDayId } = getShiftBusinessDay(ride.startTime);
          if (!reportsMap.has(businessDayId)) return;
          
          const report = reportsMap.get(businessDayId)!;
          report.ridesCount += 1;
          report.kmProductive += ride.telemetry.kmProductive;
          
          if (ride.appName) {
            report.kmPerApp![ride.appName] = (report.kmPerApp![ride.appName] || 0) + ride.telemetry.kmTotal;
          }
        });

        // Ajustar KM Vazio
        reportsMap.forEach(report => {
          report.kmEmpty = Math.max(0, report.kmTotal - report.kmProductive);
        });

        return Array.from(reportsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getTotalBalances: () => {
        const state = get();
        
        let totalCash = 0;
        let totalPix = 0;
        let totalCard = 0;

        // 1. Ganhos Brutos por método (de todas as corridas)
        state.rides.forEach(r => {
          if (r.paymentMethod === 'cash') totalCash += r.valueGross;
          else if (r.paymentMethod === 'pix') totalPix += r.valueGross;
          else if (r.paymentMethod === 'debit' || r.paymentMethod === 'credit') totalCard += r.valueGross;
        });

        // 2. Descontar Abastecimentos
        state.fuelEntries.forEach(f => {
          if (f.paymentMethod === 'cash') totalCash -= f.totalValue;
          else if (f.paymentMethod === 'pix') totalPix -= f.totalValue;
          else if (f.paymentMethod === 'debit') totalCard -= f.totalValue;
        });

        // 3. Descontar Gastos (Fixos e Diários)
        state.expenseEntries.forEach(e => {
          if (e.paymentMethod === 'cash') totalCash -= e.value;
          else if (e.paymentMethod === 'pix') totalPix -= e.value;
          else if (e.paymentMethod === 'debit' || e.paymentMethod === 'credit') totalCard -= e.value;
        });

        // 4. Descontar Manutenção (Se houver reserva sendo descontada do lucro real, 
        // mas aqui o usuário quer o "montante total" em dinheiro. 
        // Geralmente a manutenção é uma reserva "virtual" até ser gasta.
        // Se o usuário quer descontar a manutenção do montante, 
        // subtraímos a reserva atual de manutenção do saldo total (proporcionalmente ou do Pix/Cash)
        // Para simplificar e ser fiel ao "descontar manutenção", vamos tirar dos saldos.
        const totalMaintReserve = state.reservasAtuais.manutencao + state.saldosAcumulados.manutencao;
        // Distribuímos o desconto da manutenção: primeiro do Pix, depois do Cash
        if (totalPix >= totalMaintReserve) {
          totalPix -= totalMaintReserve;
        } else {
          const remaining = totalMaintReserve - totalPix;
          totalPix = 0;
          totalCash = Math.max(0, totalCash - remaining);
        }

        // 5. Aplicar Transferências de Dinheiro para Pix (Depósitos)
        state.shifts.forEach(s => {
          const transfer = s.cashToPixTransfers || 0;
          totalCash -= transfer;
          totalPix += transfer;
        });
        if (state.activeShift) {
          const transfer = state.activeShift.cashToPixTransfers || 0;
          totalCash -= transfer;
          totalPix += transfer;
        }

        return { cash: Math.max(0, totalCash), pix: Math.max(0, totalPix), card: Math.max(0, totalCard) };
      },

      getMonthlyReport: () => {
        const state = get();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filtra relatórios do mês atual
        const monthlyReports = state.getDailyReports().filter(r => {
          const d = new Date(r.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        if (monthlyReports.length === 0) return null;

        const totalGross = monthlyReports.reduce((acc, r) => acc + r.grossValue, 0);
        
        // O lucro líquido real acumulado deve ser a soma de tudo que foi reservado para salário, custos fixos e o excedente
        // Nota: r.netValue já inclui o salaryReserved (liquidoMao = salaryReserved + surplus)
        const totalNet = monthlyReports.reduce((acc, r) => {
          const fixed = r.reserves?.fixedCosts || 0;
          const pocket = r.netValue || 0; // salaryReserved + surplus
          return acc + fixed + pocket;
        }, 0);
        
        // Meta mensal = Salário Pretendido + Custos Fixos Totais (do mês inteiro)
        const monthlySalaryTarget = state.planning.monthlySalaryTarget || 0;
        const totalFixedCosts = state.fixedCosts.reduce((acc, c) => acc + (c.valor || 0), 0);
        const totalGoal = monthlySalaryTarget + totalFixedCosts;
        
        const surplus = totalNet - totalGoal;
        
        // Monthly Fuel Data
        const monthlyFuelEntries = state.fuelEntries.filter(f => {
          const d = new Date(f.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        
        const totalLiters = monthlyFuelEntries.reduce((acc, f) => acc + (f.liters || 0), 0);
        const totalFuelCost = monthlyFuelEntries.reduce((acc, f) => acc + (f.totalValue || 0), 0);
        const fuelByPayment = monthlyFuelEntries.reduce((acc, f) => {
          const method = f.paymentMethod || 'cash';
          acc[method] = (acc[method] || 0) + (f.totalValue || 0);
          return acc;
        }, {} as { [key: string]: number });

        // Calculate Average Consumption
        // km rodados no mês = currentOdo - odo no início do mês
        // Precisamos do odo no início do mês. Como não temos um histórico de odo por mês,
        // vamos usar o total de km dos relatórios diários do mês.
        const totalKmMonth = monthlyReports.reduce((acc, r) => acc + r.kmTotal, 0);
        const avgConsumption = totalLiters > 0 ? totalKmMonth / totalLiters : 0;
        
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        return {
          goal: totalGoal,
          gross: totalGross,
          net: totalNet,
          surplus: surplus,
          isGoalMet: totalNet >= totalGoal && totalGoal > 0, 
          monthName: monthNames[currentMonth],
          totalLiters,
          totalFuelCost,
          fuelByPayment,
          avgConsumption
        };
      },

      // ... existing actions ...
      updatePreferences: (updates) => set(state => ({
        preferences: { ...state.preferences, ...updates }
      })),

      completeSetup: (u, v) => {
        const initialOdo = parseFloat(v.initialOdo?.toString() || '0');
        useFuelStore.getState().setInitialConsumption(v.estimatedKmL || 10, 5.80);
        set({ 
          user: { ...u, subsistenceValue: u.subsistenceValue || 20 }, 
          vehicle: v, 
          isSetupComplete: true, 
          currentOdo: initialOdo, 
          lastClosedOdo: initialOdo,
          lastRideEndOdo: initialOdo,
          dayStartOdo: initialOdo,
          planning: {
            monthlySalaryTarget: u.salaryExpectation,
            monthlyFixedCosts: u.fixedCosts,
            daysCycle: u.workingDays
          }
        });
      },

      incrementOdo: (distance) => {
        if (distance <= 0) return;
        const d = parseFloat(distance.toString());
        useFuelStore.getState().consumirKm(d);
        
        set(state => {
          const newOdo = state.currentOdo + d;
          const newPending = state.pendingKmDeduction + d;
          const appId = state.selectedAppId || 'particular';
          const currentAppKm = state.kmPerApp?.[appId] || 0;
          
          return { 
            currentOdo: newOdo, 
            pendingKmDeduction: newPending,
            kmPerApp: {
              ...(state.kmPerApp || {}),
              [appId]: currentAppKm + d
            }
          };
        });

        const state = get();
        if (state.rideStage === 'idle') {
          const operationalCost = d * get().getCostPerKm();
          const maintReserve = d * get().getMaintReservePerKm();
          get().applyFinancialImpact({
            combustivel: operationalCost,
            manutencao: maintReserve,
            metaSobrevivencia: -(operationalCost + maintReserve)
          });
        }
      },

      syncOdometer: (odo) => {
        const targetOdo = parseFloat(odo.toString());
        const state = get();
        const diff = targetOdo - state.currentOdo;
        
        if ((state.dayStartOdo === 0 || !state.dayStartOdo) && targetOdo > 0) {
          set({ dayStartOdo: targetOdo });
        }

        if (diff > 0) {
          get().incrementOdo(diff);
        } else if (diff < 0) {
          // Ajuste para menos: removemos a diferença do app selecionado e do pendente
          const absDiff = Math.abs(diff);
          const appId = state.selectedAppId || 'particular';
          const currentAppKm = state.kmPerApp?.[appId] || 0;
          
          set({ 
            currentOdo: targetOdo,
            pendingKmDeduction: Math.max(0, state.pendingKmDeduction - absDiff),
            kmPerApp: {
              ...(state.kmPerApp || {}),
              [appId]: Math.max(0, currentAppKm - absDiff)
            }
          });
        }
      },

      addFuel: (f) => {
        // Primeiro registra no FuelStore
        useFuelStore.getState().onAbastece(f);

        if (f.isFullTank) {
          // Se o tanque está cheio, a dívida de combustível é zerada.
          // Pegamos o estado MAIS RECENTE após o onAbastece ter rodado
          const currentState = get();
          const totalReservaCombustivel = currentState.reservasAtuais.combustivel + currentState.saldosAcumulados.combustivel;
          const excessoReserva = Math.max(0, totalReservaCombustivel - f.totalValue);
          
          set(state => ({
            fuelEntries: [f, ...state.fuelEntries],
            pendingKmDeduction: 0,
            reservasAtuais: {
              ...state.reservasAtuais,
              combustivel: 0,
              metaSobrevivencia: state.reservasAtuais.metaSobrevivencia + excessoReserva
            },
            saldosAcumulados: {
              ...state.saldosAcumulados,
              combustivel: 0
            }
          }));
        } else {
          const currentState = get();
          let valueLeft = f.totalValue;
          const subResAcc = Math.min(valueLeft, currentState.reservasAtuais.combustivel);
          valueLeft -= subResAcc;
          const subSafe = Math.min(valueLeft, currentState.saldosAcumulados.combustivel);
          valueLeft -= subSafe;

          const kmPaid = f.totalValue / Math.max(0.1, get().getCostPerKm());

          set(state => ({ 
            fuelEntries: [f, ...state.fuelEntries],
            pendingKmDeduction: Math.max(0, state.pendingKmDeduction - kmPaid)
          }));
          
          get().applyFinancialImpact({
            combustivel: -subResAcc,
            saldosCombustivel: -subSafe
          });
        }
      },

      applyFinancialImpact: (impact) => set(state => {
        let newCombustivel = state.reservasAtuais.combustivel + (impact.combustivel || 0);
        let newManutencao = state.reservasAtuais.manutencao + (impact.manutencao || 0);
        let newMetaSobrevivencia = state.reservasAtuais.metaSobrevivencia + (impact.metaSobrevivencia || 0);
        let newSurplusReserve = state.reservasAtuais.surplusReserve + (impact.surplusReserve || 0);
        let newSubsistenceReserve = state.reservasAtuais.subsistenceReserve + (impact.subsistenceReserve || 0);
        let newAmortization = state.reservasAtuais.amortization + (impact.amortization || 0);

        let newSaldosCombustivel = state.saldosAcumulados.combustivel + (impact.saldosCombustivel || 0);
        let newSaldosManutencao = state.saldosAcumulados.manutencao + (impact.saldosManutencao || 0);
        let newSaldosSurplus = state.saldosAcumulados.surplusReserve + (impact.saldosSurplus || 0);

        let deficitDelta = 0;
        let currentDeficit = state.deficitAcumulado;

        // Helper to apply impact and handle deficit
        const processImpact = (val: number, isAmortization = false) => {
          let res = val;
          if (res < 0) {
            deficitDelta += Math.abs(res);
            res = 0;
          } else if (res > 0 && currentDeficit > 0) {
            const pay = Math.min(res, currentDeficit);
            currentDeficit -= pay;
            deficitDelta -= pay;
            res -= pay;
            if (!isAmortization) {
              newAmortization += pay;
            }
          }
          return res;
        };

        newCombustivel = processImpact(newCombustivel);
        newManutencao = processImpact(newManutencao);
        newMetaSobrevivencia = processImpact(newMetaSobrevivencia);
        newSurplusReserve = processImpact(newSurplusReserve);
        newSubsistenceReserve = processImpact(newSubsistenceReserve);
        
        newSaldosCombustivel = processImpact(newSaldosCombustivel);
        newSaldosManutencao = processImpact(newSaldosManutencao);
        newSaldosSurplus = processImpact(newSaldosSurplus);

        return {
          reservasAtuais: {
            ...state.reservasAtuais,
            combustivel: newCombustivel,
            manutencao: newManutencao,
            metaSobrevivencia: newMetaSobrevivencia,
            surplusReserve: newSurplusReserve,
            subsistenceReserve: newSubsistenceReserve,
            amortization: newAmortization
          },
          saldosAcumulados: {
            ...state.saldosAcumulados,
            combustivel: newSaldosCombustivel,
            manutencao: newSaldosManutencao,
            surplusReserve: newSaldosSurplus
          },
          deficitAcumulado: Math.max(0, state.deficitAcumulado + deficitDelta)
        };
      }),

      addRide: (rideData: Ride, manualOdo?: number) => {
        const state = get();
        const kmTotal = rideData.telemetry.kmTotal;
        const finalOdo = manualOdo !== undefined ? manualOdo : ((state.rideAcceptedOdo || state.lastRideEndOdo || state.currentOdo) + kmTotal);
        
        get().syncOdometer(finalOdo);
        
        const operationalCost = kmTotal * get().getCostPerKm();
        const maintReserve = kmTotal * get().getMaintReservePerKm();
        
        // Transparent Fees
        const cardFeePercent = rideData.paymentMethod === 'debit' ? state.financialConfig?.cardFeeDebit : (rideData.paymentMethod === 'credit' ? state.financialConfig?.cardFeeCredit : 0);
        const fee_gateway = rideData.valueGross * ((cardFeePercent || 0) / 100);
        const fee_platform = rideData.valueGross * (rideData.feePercent / 100);
        
        // Net profit is Gross - App Fee - Card Fee - Fuel - Maintenance
        const netProfit = rideData.valueGross - fee_platform - fee_gateway - operationalCost - maintReserve;

        // Distribute netProfit: Subsistence first, then the rest to metaSobrevivencia
        const todayStr = new Date().toDateString();
        const todayRides = state.rides.filter(r => new Date(r.timestamp).toDateString() === todayStr);
        const subsistenceReservedToday = todayRides.reduce((sum, r) => sum + (r.reservesApplied.amortization || 0), 0); 
        
        const dailySubsistence = state.user?.subsistenceValue || 0;
        const subsistenceNeeded = Math.max(0, dailySubsistence - subsistenceReservedToday);
        const subsistenceToReserve = Math.min(Math.max(0, netProfit), subsistenceNeeded);
        const remainingForMeta = netProfit - subsistenceToReserve;

        const newRide: Ride = {
          ...rideData,
          feeValue: fee_platform,
          fee_platform,
          fee_gateway,
          cardFeeValue: fee_gateway,
          valueNet: rideData.valueGross - fee_platform - fee_gateway,
          valuePocket: Math.max(0, netProfit),
          valueOperational: operationalCost + maintReserve,
          reservesApplied: {
            salaryFixed: Math.max(0, remainingForMeta),
            fuel: operationalCost,
            maintenance: maintReserve,
            amortization: subsistenceToReserve, 
          }
        };

        set(state => ({ 
          rides: [newRide, ...state.rides], 
          rideStage: 'idle',
          lastRideEndOdo: finalOdo,
          rideAcceptedOdo: undefined,
          rideAcceptedTime: undefined,
          rideBoardingOdo: undefined
        }));

        get().applyFinancialImpact({
          combustivel: operationalCost,
          manutencao: maintReserve,
          subsistenceReserve: subsistenceToReserve,
          metaSobrevivencia: remainingForMeta
        });
      },

      startShift: (odo, appId) => {
        const state = get();
        const startOdo = parseFloat(odo.toString());
        const kmParticular = Math.max(0, startOdo - state.lastClosedOdo);
        
        if (kmParticular > 0) {
           get().syncOdometer(startOdo);
        }

        set(state => ({
          activeShift: { 
            id: crypto.randomUUID(), 
            date: new Date().toISOString(), 
            startTime: new Date().toISOString(), 
            startOdo: startOdo, 
            isActive: true,
            kmParticular: kmParticular
          },
          selectedAppId: appId,
          currentOdo: startOdo,
          lastRideEndOdo: startOdo,
          rideStage: 'idle',
          pendingKmDeduction: state.pendingKmDeduction 
        }));
      },

      updateRideStage: (stage) => {
        const state = get();
        const nowOdo = state.currentOdo;
        const nowTime = new Date().toISOString();
        if (stage === 'accepted') set({ rideAcceptedOdo: nowOdo, rideAcceptedTime: nowTime, rideStage: 'accepted' });
        else if (stage === 'boarding') set({ rideBoardingOdo: nowOdo, rideStage: 'boarding' });
        else if (stage === 'idle') set({ rideStage: 'idle', rideAcceptedOdo: undefined, rideAcceptedTime: undefined, rideBoardingOdo: undefined });
        else set({ rideStage: stage as any });
      },

      endShift: (endOdo, endTime) => {
        const state = get();
        const shift = state.activeShift;
        if (!shift) return;
        const realEndOdo = parseFloat(endOdo.toString());
        
        const diff = realEndOdo - state.currentOdo;
        if (diff !== 0) {
           get().syncOdometer(realEndOdo); 
        }

        const todaysRides = state.rides.filter(r => r.shiftId === shift.id);
        const finalEndTime = endTime || new Date().toISOString();
        const todaysExpenses = state.expenseEntries.filter(e => {
          const expTime = new Date(e.dueDate || e.date).getTime();
          const startTime = new Date(shift.startTime).getTime();
          const endTimeMs = new Date(finalEndTime).getTime();
          return expTime >= startTime && expTime <= endTimeMs && e.category !== 'Combustível' && e.category !== 'Manutenção';
        });

        const kmTotalShift = Math.max(0, realEndOdo - shift.startOdo);

        let brutoTotal = 0;
        let appFees = 0;
        let cardFees = 0;
        const paymentMethods = { cash: 0, pix: 0, debit: 0, credit: 0 };

        todaysRides.forEach(r => {
          brutoTotal += r.valueGross;
          appFees += r.fee_platform || r.feeValue;
          cardFees += r.fee_gateway || r.cardFeeValue || 0;
          if (r.paymentMethod) {
            paymentMethods[r.paymentMethod] += r.valueGross;
          }
        });

        let remainingGross = brutoTotal - appFees - cardFees;

        // 1. Fuel & Maintenance (Priority 1) - Consolidated by KM
        const fuelCost = kmTotalShift * get().getCostPerKm();
        const maintenanceCost = kmTotalShift * get().getMaintReservePerKm();

        const maintenanceDetail: { name: string, value: number }[] = [];
        state.maintenancePlans.forEach(plan => {
          const costPerKm = plan.estimatedValue / plan.intervalKm;
          const costForShift = costPerKm * kmTotalShift;
          maintenanceDetail.push({ name: plan.item, value: costForShift });
        });

        const fuelReserved = Math.min(Math.max(0, remainingGross), fuelCost);
        remainingGross -= fuelReserved;
        
        const maintenanceReserved = Math.min(Math.max(0, remainingGross), maintenanceCost);
        remainingGross -= maintenanceReserved;

        // 2. Desired Salary (Priority 2)
        const daysCycle = state.planning?.daysCycle || 30;
        const dailySalaryTarget = (state.planning?.monthlySalaryTarget || 0) / daysCycle;
        const salaryReserved = Math.min(Math.max(0, remainingGross), dailySalaryTarget);
        remainingGross -= salaryReserved;

        // 2.5 Subsistence
        const dailySubsistence = state.user?.subsistenceValue || 0;
        const subsistenceReserved = Math.min(Math.max(0, remainingGross), dailySubsistence);
        remainingGross -= subsistenceReserved;

        // 3. Fixed Costs (Priority 3)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayZero = new Date(currentYear, currentMonth, now.getDate());

        const fixedCostsDetail: { name: string, value: number }[] = [];
        let fixedCostsReserved = 0;
        let custoFixoDiarioTotal = 0;

        state.fixedCosts.forEach(cost => {
          const valor = Math.abs(Number(cost.valor));
          const diaVencimento = cost.diaVencimento;
          let dueDate = new Date(currentYear, currentMonth, diaVencimento);
          if (dueDate < todayZero) {
            dueDate = new Date(currentYear, currentMonth + 1, diaVencimento);
          }
          const diffDays = Math.max(1, Math.round((dueDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24)));
          const dailyCost = valor / diffDays;
          custoFixoDiarioTotal += dailyCost;

          const reservedForThis = Math.min(Math.max(0, remainingGross), dailyCost);
          fixedCostsReserved += reservedForThis;
          fixedCostsDetail.push({ name: cost.nome, value: reservedForThis });
          remainingGross -= reservedForThis;
        });

        // 4. Unexpected Expenses (Priority 4)
        const unexpectedExpenses = todaysExpenses.reduce((sum, e) => sum + (e.value || 0), 0);
        const unexpectedReserved = Math.min(Math.max(0, remainingGross), unexpectedExpenses);
        remainingGross -= unexpectedReserved;

        // 5. Deficit Amortization
        const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const diasRestantes = Math.max(1, totalDaysInMonth - now.getDate() + 1);
        const parcelaAmortizacaoHoje = state.deficitAcumulado / diasRestantes;

        const dailyTarget = dailySalaryTarget + custoFixoDiarioTotal + unexpectedExpenses + parcelaAmortizacaoHoje + dailySubsistence + fuelCost + maintenanceCost;
        const totalReservedForTargets = salaryReserved + fixedCostsReserved + unexpectedReserved + subsistenceReserved + fuelReserved + maintenanceReserved;
        
        let newDeficitAcumulado = state.deficitAcumulado;
        if (totalReservedForTargets < dailyTarget) {
            const shortfall = dailyTarget - totalReservedForTargets;
            newDeficitAcumulado = state.deficitAcumulado - parcelaAmortizacaoHoje + shortfall;
        } else {
            const surplus = remainingGross;
            newDeficitAcumulado = Math.max(0, state.deficitAcumulado - parcelaAmortizacaoHoje - surplus);
            remainingGross = Math.max(0, surplus - (state.deficitAcumulado - parcelaAmortizacaoHoje));
        }
        
        const amortization = state.deficitAcumulado - newDeficitAcumulado;
        const surplusSuggestion = remainingGross > 0 ? Number((remainingGross * 0.1).toFixed(2)) : 0;

        const totalReservar = fuelReserved + maintenanceReserved + appFees + cardFees + unexpectedReserved + fixedCostsReserved;

        const summary: ShiftSummary = {
          brutoTotal,
          reserves: {
            salary: salaryReserved + subsistenceReserved,
            salaryAndFixed: salaryReserved + subsistenceReserved + fixedCostsReserved,
            fixedCosts: fixedCostsReserved,
            fixedCostsDetail,
            expenses: unexpectedReserved,
            fuel: fuelReserved,
            maintenance: maintenanceReserved,
            maintenanceDetail,
            depreciation: 0,
            appFees,
            cardFees,
            fee_platform: appFees,
            fee_gateway: cardFees,
            amortization,
            surplusReserve: remainingGross
          },
          totalReservar,
          paymentMethods,
          cashToPixTransfers: shift.cashToPixTransfers || 0,
          totalDeficitToAmortize: newDeficitAcumulado,
          liquidoMao: salaryReserved + subsistenceReserved + remainingGross,
          surplusSuggestion
        };

        set(state => ({
          activeShift: undefined,
          lastClosedOdo: realEndOdo,
          dayStartOdo: realEndOdo,
          lastRideEndOdo: state.rideStage === 'idle' ? realEndOdo : state.lastRideEndOdo,
          lastShiftSummary: summary,
          deficitAcumulado: newDeficitAcumulado,
          shifts: [{ ...shift, endTime: finalEndTime, endOdo: realEndOdo, isActive: false, summary }, ...state.shifts],
          kmPerApp: {}
        }));
      },

      clearSummary: () => set({ lastShiftSummary: null }),
      
      confirmSurplusReservation: (amount) => set(state => ({
        saldosAcumulados: {
          ...state.saldosAcumulados,
          surplusReserve: (state.saldosAcumulados.surplusReserve || 0) + amount
        },
        surplusAppliedToday: true,
        lastShiftSummary: null
      })),

      transferCashToPix: (amount) => {
        set(state => {
          if (!state.activeShift) return state;
          const currentTransfers = state.activeShift.cashToPixTransfers || 0;
          return {
            activeShift: {
              ...state.activeShift,
              cashToPixTransfers: currentTransfers + amount
            }
          };
        });
      },

      performMaintenance: (planId) => {
        const state = get();
        const plan = state.maintenancePlans.find(p => p.id === planId);
        if (!plan) return;

        // Calculate actualReserved
        const totalPool = (state.reservasAtuais?.manutencao || 0) + (state.saldosAcumulados?.manutencao || 0);
        
        const plansWithNeeds = state.maintenancePlans.map(p => {
          const kmRodado = Math.max(0, state.currentOdo - p.lastDoneOdo);
          const need = kmRodado * (p.estimatedValue / Math.max(1, p.intervalKm));
          return { ...p, need, kmRodado };
        });

        const totalNeed = plansWithNeeds.reduce((acc, p) => acc + p.need, 0);
        const totalRate = state.maintenancePlans.reduce((acc, p) => acc + (p.estimatedValue / Math.max(1, p.intervalKm)), 0);

        const p = plansWithNeeds.find(p => p.id === planId)!;
        const rate = (p.estimatedValue / Math.max(1, p.intervalKm));

        let actualReserved = 0;
        if (totalNeed > 0) {
          actualReserved = (p.need / totalNeed) * totalPool;
        } else if (totalRate > 0) {
          actualReserved = (rate / totalRate) * totalPool;
        }

        set(state => ({
          maintenancePlans: state.maintenancePlans.map(p => 
            p.id === planId ? { ...p, lastDoneOdo: state.currentOdo } : p
          )
        }));

        get().applyFinancialImpact({
          manutencao: -actualReserved
        });
      },

      updateTransaction: (id, updates) => {
        const state = get();
        const ride = state.rides.find(r => r.id === id);
        if (ride) {
          get().updateRide(id, updates);
          return;
        }
        const expense = state.expenseEntries.find(e => e.id === id);
        if (expense) {
          get().updateExpense(id, updates);
          return;
        }
      },

      confirmPayment: (id) => set(state => {
        const expense = state.expenseEntries.find(e => e.id === id);
        if (!expense) return state;

        if (expense.type === 'fixed') {
          const newDueDate = new Date(expense.dueDate!);
          newDueDate.setMonth(newDueDate.getMonth() + 1);
          return {
            expenseEntries: state.expenseEntries.map(e => 
              e.id === id ? { ...e, dueDate: newDueDate.toISOString() } : e
            )
          };
        } else {
          return {
            expenseEntries: state.expenseEntries.filter(e => e.id !== id)
          };
        }
      }),
      addExpense: (e) => {
        const state = get();
        set(s => ({ 
          expenseEntries: [e, ...s.expenseEntries]
        }));
        
        const desc = e.description.toLowerCase();
        
        // Gastos Inesperados (Saída Imediata)
        // Lançamentos na categoria "Gastos" devem ser subtraídos imediatamente do montante do expediente atual.
        // Importante: Este gasto nunca pode subtrair o valor reservado para combustível.
        
        if (desc.includes('almoço') || desc.includes('refeição') || desc.includes('comida')) {
          get().applyFinancialImpact({ subsistenceReserve: -e.value });
        } else if (desc.includes('manutenção') || desc.includes('oficina') || desc.includes('peça')) {
          get().applyFinancialImpact({ manutencao: -e.value });
        } else if (desc.includes('combustível') || desc.includes('gasolina') || desc.includes('etanol')) {
          get().applyFinancialImpact({ combustivel: -e.value });
        } else {
          // Gasto Inesperado
          // Verificamos o lucro atual do turno ou saldo disponível
          const availableProfit = state.reservasAtuais.metaSobrevivencia;
          
          if (e.value > availableProfit) {
            // Se o gasto exceder o lucro, a diferença deve ser amortizada na meta dos dias seguintes.
            const shortfall = e.value - availableProfit;
            get().applyFinancialImpact({ metaSobrevivencia: -availableProfit });
            set(s => ({ deficitAcumulado: s.deficitAcumulado + shortfall }));
          } else {
            get().applyFinancialImpact({ metaSobrevivencia: -e.value });
          }
        }
      },
      deleteExpense: (id) => {
        const state = get();
        const expense = state.expenseEntries.find(e => e.id === id);
        if (expense) {
          const desc = expense.description.toLowerCase();
          if (desc.includes('almoço') || desc.includes('refeição') || desc.includes('comida')) {
            get().applyFinancialImpact({ subsistenceReserve: expense.value });
          } else if (desc.includes('manutenção') || desc.includes('oficina') || desc.includes('peça')) {
            get().applyFinancialImpact({ manutencao: expense.value });
          } else if (desc.includes('combustível') || desc.includes('gasolina') || desc.includes('etanol')) {
            get().applyFinancialImpact({ combustivel: expense.value });
          } else {
            get().applyFinancialImpact({ metaSobrevivencia: expense.value });
          }
        }
        set(state => ({ 
          expenseEntries: state.expenseEntries.filter(e => e.id !== id)
        }));
      },
      addMaintenancePlan: (p) => set(o => ({ maintenancePlans: [...o.maintenancePlans, p] })),
      deleteMaintenancePlan: (id) => set(p => ({ maintenancePlans: p.maintenancePlans.filter(e => e.id !== id) })),
      updateMaintenancePlan: (id, updates) => set(state => ({
        maintenancePlans: state.maintenancePlans.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      addFixedCost: (p) => set(o => ({ fixedCosts: [...o.fixedCosts, p] })),
      deleteFixedCost: (id) => set(o => ({ fixedCosts: o.fixedCosts.filter(x => x.id !== id) })),
      setFixedCosts: (list) => set({ fixedCosts: list }),
      addTransportApp: (a) => set(prev => {
        const exists = prev.transportApps.some(app => app.name.toLowerCase().trim() === a.name.toLowerCase().trim());
        if (exists) return prev;
        return { transportApps: [...prev.transportApps, a], selectedAppId: a.id };
      }), 
      addStation: (name) => {
        const s = { id: crypto.randomUUID(), name };
        set(prev => ({ stations: [...prev.stations, s] }));
        return s;
      },
      selectApp: (id) => set({ selectedAppId: id }),
      syncFuelReserve: () => {
        const state = get();
        const currentCostPerKm = get().getCostPerKm();
        const expectedReserve = state.pendingKmDeduction * currentCostPerKm;
        const currentReserve = state.reservasAtuais.combustivel + state.saldosAcumulados.combustivel;
        
        const diff = expectedReserve - currentReserve;
        if (Math.abs(diff) > 0.01) {
          if (diff > 0) {
            get().applyFinancialImpact({
              combustivel: diff,
              metaSobrevivencia: -diff
            });
          } else {
            let toRemove = Math.abs(diff);
            const fromRes = Math.min(toRemove, state.reservasAtuais.combustivel);
            toRemove -= fromRes;
            const fromSafe = Math.min(toRemove, state.saldosAcumulados.combustivel);
            
            get().applyFinancialImpact({
              combustivel: -fromRes,
              saldosCombustivel: -fromSafe,
              metaSobrevivencia: fromRes + fromSafe
            });
          }
        }
      },
      updateVehicle: (updates) => {
        set(s => ({ vehicle: s.vehicle ? {...s.vehicle, ...updates} : updates as any }));
        
        // Sincroniza com o FuelStore se houver mudanças de preço ou consumo
        const fuelStore = useFuelStore.getState();
        const state = get();
        const v = state.vehicle;
        
        if (v) {
          const currentFuelType = v.fuelType || 'Gasolina';
          const price = currentFuelType === 'Gasolina' ? v.lastPricePerLiter : v.lastPriceEth;
          const kmL = currentFuelType === 'Gasolina' ? v.estimatedKmLGas : v.estimatedKmlEth;
          
          // Só chama se houver mudança real para evitar loop infinito
          if (price && kmL && (fuelStore.precoAtual !== price || fuelStore.medioKmL !== kmL || fuelStore.tipoAtual !== currentFuelType)) {
            fuelStore.setManualConfig(kmL, price, currentFuelType as any);
          }
        }

        get().syncFuelReserve();
      },
      updateProfile: (updates) => set(s => ({ user: s.user ? {...s.user, ...updates} : updates as any })),
      updateFinancialConfig: (updates) => set(s => ({ financialConfig: s.financialConfig ? {...s.financialConfig, ...updates} : updates as any })),
      setCalculatorState: (calc) => set({ calculatorState: calc }),
      resetApp: () => { Preferences.clear(); window.location.reload(); }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({ 
        isSetupComplete: state.isSetupComplete, user: state.user, vehicle: state.vehicle, currentOdo: state.currentOdo, lastClosedOdo: state.lastClosedOdo,
        rides: state.rides, dailyReports: state.dailyReports, maintenancePlans: state.maintenancePlans,
        fuelEntries: state.fuelEntries, transportApps: state.transportApps, financialConfig: state.financialConfig, activeShift: state.activeShift,
        selectedAppId: state.selectedAppId, rideStage: state.rideStage, rideAcceptedOdo: state.rideAcceptedOdo, rideAcceptedTime: state.rideAcceptedTime, rideBoardingOdo: state.rideBoardingOdo,
        lastRideEndOdo: state.lastRideEndOdo, lastShiftSummary: state.lastShiftSummary, surplusAppliedToday: state.surplusAppliedToday,
        reservasAtuais: state.reservasAtuais, saldosAcumulados: state.saldosAcumulados, fuelCredit: state.fuelCredit, expenseEntries: state.expenseEntries,
        pendingKmDeduction: state.pendingKmDeduction, calculatorState: state.calculatorState, preferences: state.preferences,
        stations: state.stations,
        planning: state.planning,
        fixedCosts: state.fixedCosts,
        dayStartOdo: state.dayStartOdo,
        kmPerApp: state.kmPerApp,
        initialOdoAtRegistration: state.initialOdoAtRegistration,
        deficitAcumulado: state.deficitAcumulado,
        shifts: state.shifts
      })
    }
  )
);
