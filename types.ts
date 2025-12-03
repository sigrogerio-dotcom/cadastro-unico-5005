
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
  windstormOrImpact: number; // Impacto de Veículos or Vendaval
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

export interface Person {
  id: string;
  type: PersonType | string;
  name: string; // PF: Nome Completo | PJ: Razão Social
  email: string;
  phone: string;
  cpfCnpj: string;
  rgIe: string;
  profession: string; // PF: Profissão | PJ: Ramo de Atividade (optional)
  civilStatus: string; // PF only
  dateOfBirth: string; // PF: Nascimento | PJ: Abertura
  
  // PJ Specific - Representative/Partner (Sócio)
  representativeName?: string;
  representativeCpf?: string;
  representativeRg?: string;
  representativeProfession?: string;
  representativeCivilStatus?: string;
  representativeAddress: Address; // Structured address for partner

  // Spouse / Cônjuge (Linked to Person for PF, or Representative for PJ)
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
  
  // Landlord specific (Structured Bank Details)
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

export interface LeaseState {
  // Step 1: Parties
  landlords: Person[];
  tenants: Person[];
  
  // Step 2: Negotiation & Config
  guaranteeType: GuaranteeType | string;
  guarantors: Person[]; // Depends on guaranteeType
  
  // Specific Guarantee Fields
  cautionValue?: number; // For Caução
  insuranceCompany?: string; // For Seguro Fiança
  insurancePolicy?: string; // For Seguro Fiança
  capitalizationValue?: number; // For Título de Capitalização

  // Brokerage / Admin
  realtorName: string; // Corretor
  captorName: string; // Captador
  partnershipInternal: boolean;
  partnershipInternalName: string; // Name of internal partner
  partnershipExternal: boolean;
  partnershipExternalName: string; // Name of external partner/agency
  adminFee: number;
  declaresIR: boolean;
  
  // Step 3: Financials & Insurance
  propertyAddress: Address; // Changed from string to Address
  rentValue: number;
  condoValue: number;
  iptuValue: number;
  
  // Contract Dates
  contractStartDate: string;
  rentDueDay: number;
  
  // Utilities included in rent?
  includeWater: boolean;
  includeElectricity: boolean;
  includeGas: boolean;
  includeIptuInRent: boolean;
  includeCondo: boolean;
  includeCleaning: boolean;
  includeOther: boolean;
  otherExpenseDescription: string;
  
  insuranceType: PropertyType | string;
  insuranceCoverage: number | string;
  
  observations: string;
  
  // Files (General/Legacy)
  uploadedFiles: string[];
  
  // Property Specific Docs
  propertyUploadedFiles: string[];
}
