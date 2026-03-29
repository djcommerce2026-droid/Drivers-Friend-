
export type TabType = 'rides' | 'fuel' | 'expenses' | 'maintenance' | 'financial' | 'reports' | 'settings';

export interface DailyReport {
  date: string;
  startDate?: string;
  endDate?: string;
  kmTotal: number;
  kmProductive: number;
  kmEmpty: number;
  ridesCount: number;
  grossValue: number;
  netValue: number; // Lucro no bolso real (Pocket)
  totalReservar: number;
  fuelSpent?: number;
  reserves: {
    salaryAndFixed: number;
    fixedCosts?: number;
    salary?: number;
    fuel: number;
    maintenance: number;
    maintenanceDetail?: { name: string, value: number }[];
    fixedCostsDetail?: { name: string, value: number }[];
    appFeesDetail?: { name: string, value: number }[];
    cardFeesDetail?: { name: string, value: number }[];
    dailyExpenses: number;
    expenses?: number;
    appFees: number;
    cardFees: number;
    amortization?: number;
    surplusReserve: number;
  };
  paymentMethods?: {
    cash: number;
    debit: number;
    credit: number;
    pix: number;
  };
  cashToPixTransfers?: number;
  kmPerApp?: { [appId: string]: number };
}

export interface Vehicle {
  brand: string;
  model: string;
  year: number;
  engine?: string;
  hp: number;
  tankCapacity: number;
  estimatedKmL: number; 
  estimatedKmLGas?: number;
  estimatedKmlEth?: number;
  lastPricePerLiter?: number;
  lastPriceEth?: number;
  plate?: string;
  initialOdo?: number;
  oilChangeInterval?: number;
  beltChangeInterval?: number;
  maintenancePreset?: any[];
}

export interface UserProfile {
  name: string;
  salaryExpectation: number;
  fixedCosts: number;
  workingDays: number;
  dailyGoal: number;
  subsistenceValue: number; // Valor diário fixo para almoço/subsistência
  salaryDay: number; // Dia de recebimento do salário
  phone?: string;
  platform?: string;
  photo?: string;
  googleMapsKey?: string;
}

export interface FinancialConfig {
  metaBaseDiaria: number;
  diasUteisMes: number;
  kmDiariosAlvo: number;
  excluirFinaisSemana: boolean;
  deficitsAcumulados: number; 
  lastResetDate: string;      
  mesAtual: string;           
  fuelAmortizationDaily: number;
  surplusAmortization: number; 
  dailyExpenseRate: number;
  cardFeeDebit: number;
  cardFeeCredit: number;
  dailyResetHour: number; // 0-23
}

export interface Station {
  id: string;
  name: string;
  fuelsSupported?: ('Gasolina' | 'Etanol' | 'Diesel')[];
}

export interface TransportApp {
  id: string;
  name: string;
  feePercent: number;
  isFixedPrice: boolean;
  fixedPriceValue?: number;
}

export interface Ride {
  id: string;
  timestamp: string;
  startTime: string; 
  endTime: string;   
  appName: string;
  appId: string;
  valueGross: number;
  feePercent: number;
  feeValue: number; // fee_platform
  fee_platform: number;
  fee_gateway: number;
  valueNet: number; 
  valuePocket: number; 
  valueOperational: number;
  reservesApplied: {
    salaryFixed: number;
    fuel: number;
    maintenance: number;
    maintenanceDetail?: { name: string, value: number }[];
    amortization: number;
    dailyExpense?: number;
    depreciation?: number;
    surplusReserve?: number;
  };
  telemetry: {
    kmEmpty: number;
    kmDisplacement: number;
    kmProductive: number;
    kmTotal: number;
  };
  snapshot: {
    fuelPrice: number;
    avgConsumption: number;
    fuelRate: number;
    maintRate: number;
  };
  paymentMethod: 'cash' | 'debit' | 'credit' | 'pix';
  cardFeeValue: number;
  shiftId: string;
}

export interface Shift {
  id: string;
  date: string; 
  startTime: string;
  endTime?: string;
  startOdo: number;
  endOdo?: number;
  isActive: boolean;
  isTrackingGPS?: boolean;
  trackedDistance?: number;
  lastPosition?: { lat: number; lng: number; timestamp: number };
  kmParticular?: number;
  cashToPixTransfers?: number;
  summary?: ShiftSummary;
}

export interface FuelEntry {
  id: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalValue: number;
  odometer: number;
  stationId: string;
  stationName: string;
  fuelType: 'Gasolina' | 'Etanol' | 'Diesel';
  isFullTank: boolean;
  paymentMethod: 'cash' | 'debit' | 'pix';
}

export interface ExpenseEntry {
  id: string;
  date: string;
  dueDate?: string;
  description: string;
  value: number;
  category: string;
  type: 'fixed' | 'variable'; // Added type
  paymentMethod?: 'cash' | 'debit' | 'credit' | 'pix';
}

export interface MaintenancePlan {
  id: string;
  item: string;
  intervalKm: number;
  lastDoneOdo: number;
  estimatedValue: number;
  alarmBeforeKm: number;
}

export type Maintenance = MaintenancePlan;

export interface Planning {
  monthlySalaryTarget: number;
  monthlyFixedCosts: number;
  daysCycle: number;
}

export interface UserPreferences {
  fontSize: 'small' | 'medium' | 'large';
  zoomLevel: number;
  showMap: boolean;
  cardLayout: 'default' | 'compact';
}

export interface Conta {
  nome: string;
  valor: number;
  diaVencimento: number; // 1 a 31
  isFixa: boolean;
}

export interface AjustesUsuario {
  salarioPretendido: number;
  diaRecebimentoSalario: number;
  custoManutencaoPorKm: number;
  custoCombustivelPorKm: number;
}

export interface FixedCost {
  id: string;
  nome: string;
  valor: number;
  diaVencimento: number; // 1 a 31
  isFixa: boolean;
}

export interface VariableRate {
  combustivel: number;
  manutencao: number;
  depreciacao: number;
}

export interface UserGoals {
  salarioPretendido: number;
  diasTrabalhoSemana: number;
}

export interface DynamicDashboardData {
  metaHoje: number;
  pilarX: number;
  pilarY: number;
  pilarB: number;
  breakEvenDay: number;
  custoRealKM: number;
  proximoVencimento: {
    nome: string;
    valor: number;
    diasRestantes: number;
  } | null;
  deficitAcumulado: number;
}

export interface ShiftSummary {
  brutoTotal: number;
  reserves: {
    salary: number;
    salaryAndFixed: number;
    fixedCosts: number;
    expenses: number;
    fuel: number;
    maintenance: number;
    maintenanceDetail?: { name: string, value: number }[];
    depreciation: number;
    appFees: number; // fee_platform
    cardFees: number; // fee_gateway
    fee_platform: number;
    fee_gateway: number;
    amortization: number;
    fixedCostsDetail?: { name: string, value: number }[];
    surplusReserve?: number;
  };
  totalReservar: number;
  paymentMethods: {
    cash: number;
    pix: number;
    debit: number;
    credit: number;
  };
  cashToPixTransfers?: number;
  totalDeficitToAmortize: number;
  liquidoMao: number;
  surplusSuggestion: number;
}

export interface AppState {
  user?: UserProfile;
  vehicle?: Vehicle;
  isSetupComplete: boolean;
  activeShift?: Shift;
  isTrackingGPS?: boolean;
  isWakeLockActive?: boolean;
  currentOdo: number;
  initialOdoAtRegistration: number;
  rideAcceptedOdo?: number;
  rideAcceptedTime?: string;
  rideBoardingOdo?: number;
  lastRideEndOdo?: number;
  rideStage: 'idle' | 'accepted' | 'boarding';
  transportApps: TransportApp[];
  stations: Station[];
  selectedAppId?: string;
  financialConfig?: FinancialConfig;
  lastActiveDate?: string;
  dailyReports?: DailyReport[];
  fuelCredit: number;
  dayStartOdo?: number; // Added to track KM from app open
  fixedCosts: FixedCost[]; // Added
  deficitAcumulado: number; // Added for redistribution
  saldosAcumulados: {
    combustivel: number;
    manutencao: number;
    survival: number;
    surplusReserve: number;
  };
  reservasAtuais: {
    combustivel: number;
    manutencao: number;
    metaSobrevivencia: number;
    amortization: number;
    subsistenceReserve: number;
    surplusReserve: number;
  };
  calculatorState?: {
    prices: { gas: string; eth: string };
    consumption: { gas: string; eth: string };
  };
  preferences: UserPreferences;
  kmPerApp: { [appId: string]: number };
}
