
export enum PersonType {
  PF = 'Pessoa Física',
  PJ = 'Pessoa Jurídica'
}

export enum GuaranteeType {
  FIADOR = 'Fiador',
  SEGURO_FIANCA = 'Seguro Fiança',
  CAUCAO = 'Caução',
  TITULO = 'Título de Capitalização',
  SEM_GARANTIA = 'Sem Garantia'
}

export enum PropertyType {
  APARTAMENTO = 'Apartamento',
  RESIDENCIA_ALVENARIA = 'Residência Alvenaria',
  COMERCIO_SERVICOS = 'Comércio & Serviços',
  CONSULTORIO_ESCRITORIO = 'Consultório & Escritório'
}

export interface InsuranceData {
  coverage: number;
  fire: number;
  rentLoss: number;
  civilLiability: number;
  windstormOrImpact: number; 
  monthlyPremium: number;
  annualPremium: number;
}

export interface Address {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export interface Representative {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  profession: string;
  civilStatus: string;
  address: Address;
  // Spouse of Representative
  isMarried: boolean;
  spouseName: string;
  spouseCpf: string;
  spouseRg: string;
  spouseProfession: string;
  spousePhone: string;
  spouseEmail: string;
  spouseBirthDate: string;
}

export interface Person {
  id: string;
  type: PersonType | string;
  name: string; // PF: Nome Completo | PJ: Razão Social
  email: string;
  phone: string;
  cpfCnpj: string;
  rgIe: string;
  profession: string; // PF: Profissão | PJ: Ramo de Atividade
  civilStatus: string; // PF only
  dateOfBirth: string; // PF: Nascimento | PJ: Abertura
  
  // PJ Specific - List of Representatives
  representatives: Representative[];

  // Spouse / Cônjuge (For PF Only - PJ handled inside Representative)
  isMarried: boolean;
  spouseName: string;
  spouseCpf: string;
  spouseRg: string;
  spouseProfession: string;
  spousePhone: string;
  spouseEmail: string;
  spouseBirthDate: string;

  // Address (Person or Company)
  address: Address;
  
  // Extras
  dependents: string;
  
  // Landlord specific
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  pixKey: string;
  isBeneficiarySelf: boolean;
  beneficiaryName: string;
  
  // Guarantor specific
  guaranteePropertyAddress: string;
  guaranteePropertyMatricula: string;
  guaranteePropertyIptu: string;

  // Documents
  uploadedFiles: string[];
  spouseUploadedFiles: string[];
}

export type ExpenseStatus = 'Inclusa' | 'Não Aplicável' | 'A Parte';

export interface LeaseState {
  // Step 1: Parties
  landlords: Person[];
  tenants: Person[];
  
  // Step 2: Negotiation & Config
  guaranteeType: GuaranteeType | string;
  guarantors: Person[]; 
  
  cautionValue?: number; 
  insuranceCompany?: string; 
  insurancePolicy?: string; 
  capitalizationValue?: number; 

  // Brokerage / Admin
  realtorName: string; 
  captorName: string; 
  partnershipInternal: boolean;
  partnershipInternalName: string; 
  partnershipExternal: boolean;
  partnershipExternalName: string; 
  adminFee: number;
  noAdmin: boolean; // New field for "Sem ADM"
  declaresIR: boolean;
  
  // Step 3: Financials & Insurance
  propertyAddress: Address; 
  rentValue: number;
  condoValue: number;
  iptuValue: number;
  
  // Contract Dates & Adjustments
  contractStartDate: string;
  rentDueDay: number;
  contractReadjustment: string; // New Field: IPCA, IGPM, etc.
  
  // Utilities Status
  expenseWater: ExpenseStatus;
  expenseElectricity: ExpenseStatus;
  expenseGas: ExpenseStatus;
  expenseIptu: ExpenseStatus;
  expenseCondo: ExpenseStatus;
  expenseCleaning: ExpenseStatus;
  expenseOther: ExpenseStatus;
  otherExpenseDescription: string;
  
  insuranceType: PropertyType | string;
  insuranceCoverage: number | string;
  
  observations: string;
  
  // Files
  uploadedFiles: string[]; // General (Legacy)
  propertyUploadedFiles: string[];
}
