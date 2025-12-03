
import React, { useState, useMemo, useRef } from 'react';
import { 
  PersonType, GuaranteeType, PropertyType, LeaseState, InsuranceData, Person, ExpenseStatus, Representative 
} from './types';
import { INSURANCE_TABLE } from './constants';
import { PersonForm } from './components/PersonForm';
import { DocumentChecklistModal } from './components/DocumentChecklistModal';
import { generateLeaseSummary } from './services/geminiService';
import { fetchAddressByCep } from './services/cepService';
import { 
  Building, User, FileCheck, Calculator, ArrowRight, ArrowLeft, Loader2, Plus, Users, MapPin, CalendarDays, FileText, Paperclip, Upload, Printer, Trash2
} from 'lucide-react';

const createEmptyRepresentative = (): Representative => ({
  id: crypto.randomUUID(),
  name: '',
  cpf: '',
  rg: '',
  profession: '',
  civilStatus: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', cep: '' },
  isMarried: false,
  spouseName: '', spouseCpf: '', spouseRg: '', spouseProfession: '', spousePhone: '', spouseEmail: '', spouseBirthDate: ''
});

const createEmptyPerson = (type: PersonType | string = PersonType.PF): Person => ({
  id: crypto.randomUUID(),
  type,
  name: '',
  email: '',
  phone: '',
  cpfCnpj: '',
  rgIe: '',
  profession: '',
  civilStatus: '',
  dateOfBirth: '',
  
  // PJ Representatives List
  representatives: [createEmptyRepresentative()],

  isMarried: false,
  spouseName: '',
  spouseCpf: '',
  spouseRg: '',
  spouseProfession: '',
  spousePhone: '',
  spouseEmail: '',
  spouseBirthDate: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: ''
  },
  dependents: '',
  // Bank Details
  bankName: '',
  bankAgency: '',
  bankAccount: '',
  pixKey: '',
  isBeneficiarySelf: true,
  beneficiaryName: '',
  // Guarantor
  guaranteePropertyAddress: '',
  guaranteePropertyMatricula: '',
  guaranteePropertyIptu: '',
  // Docs
  uploadedFiles: [],
  spouseUploadedFiles: []
});

const INITIAL_STATE: LeaseState = {
  guaranteeType: '',
  landlords: [createEmptyPerson(PersonType.PF)],
  tenants: [createEmptyPerson(PersonType.PF)],
  guarantors: [],
  realtorName: '',
  captorName: '',
  partnershipInternal: false,
  partnershipInternalName: '',
  partnershipExternal: false,
  partnershipExternalName: '',
  adminFee: 5,
  declaresIR: false,
  propertyAddress: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: ''
  },
  rentValue: 0,
  condoValue: 0,
  iptuValue: 0,
  contractStartDate: '',
  rentDueDay: 0,
  contractReadjustment: '', 
  
  // Expenses defaults
  expenseWater: 'A Parte',
  expenseElectricity: 'A Parte',
  expenseGas: 'A Parte',
  expenseIptu: 'A Parte',
  expenseCondo: 'A Parte',
  expenseCleaning: 'Não Aplicável',
  expenseOther: 'Não Aplicável',
  otherExpenseDescription: '',
  
  insuranceType: '',
  insuranceCoverage: '',
  observations: '',
  uploadedFiles: [],
  propertyUploadedFiles: [],
  cautionValue: 0,
  insuranceCompany: '',
  insurancePolicy: '',
  capitalizationValue: 0
};

// Simple formatter component to handle bold text (**text**)
const FormattedSummary: React.FC<{ text: string, id: string }> = ({ text, id }) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return (
    <div id={id} className="font-mono text-sm text-gray-800 bg-white p-8 rounded border-l-4 border-l-brand-blue overflow-x-auto whitespace-pre-wrap border border-brand-blue shadow-sm">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={i} className="min-h-[1.2em]">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-brand-blue font-bold">{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper for Currency
const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const parseCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return Number(digits) / 100;
};

function App() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<LeaseState>(INITIAL_STATE);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPropertyCep, setLoadingPropertyCep] = useState(false);
  const [showPropertyDocsModal, setShowPropertyDocsModal] = useState(false);
  
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(INITIAL_STATE.tenants[0].id);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let finalValue: string | boolean | number = value;

    if (type === 'checkbox') {
      finalValue = checked;
    } else if (type === 'radio') {
      finalValue = value;
    } else if (type === 'text' || type === 'textarea') {
      if (name.toLowerCase().includes('email')) {
        finalValue = value.toLowerCase();
      } else {
        finalValue = value.toUpperCase();
      }
    }

    if (name.startsWith('propertyAddress.')) {
      const field = name.split('.')[1];
      setData(prev => ({
        ...prev,
        propertyAddress: { ...prev.propertyAddress, [field]: finalValue }
      }));
    } else {
      setData(prev => ({
        ...prev,
        [name]: finalValue
      }));
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseCurrency(value);
    
    setData(prev => ({
      ...prev,
      [name]: numericValue
    }));
  };

  const handlePropertyCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      setLoadingPropertyCep(true);
      const addrData = await fetchAddressByCep(cleanCep);
      
      if (addrData) {
        setData(prev => ({
          ...prev,
          propertyAddress: {
            ...prev.propertyAddress,
            street: addrData.logradouro.toUpperCase(),
            neighborhood: addrData.bairro.toUpperCase(),
            city: addrData.localidade.toUpperCase(),
            state: addrData.uf.toUpperCase(),
            cep: cep
          }
        }));
      } else {
        alert("CEP não encontrado.");
      }
      setLoadingPropertyCep(false);
    }
  };

  const addPerson = (listKey: 'landlords' | 'tenants' | 'guarantors') => {
    const newPerson = createEmptyPerson();
    setData(prev => ({
      ...prev,
      [listKey]: [...prev[listKey], newPerson]
    }));
    setExpandedPersonId(newPerson.id);
  };

  const removePerson = (listKey: 'landlords' | 'tenants' | 'guarantors', id: string) => {
    setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].filter(p => p.id !== id)
    }));
  };

  const updatePerson = (listKey: 'landlords' | 'tenants' | 'guarantors', id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(p => {
        if (p.id !== id) return p;
        if (field === 'address') return { ...p, address: value };
        // If field is 'representatives', value is the entire new array
        if (field === 'representatives') return { ...p, representatives: value };
        return { ...p, [field]: value };
      })
    }));
  };

  const handleAddRepresentative = (listKey: 'landlords' | 'tenants' | 'guarantors', personId: string) => {
    const newRep = createEmptyRepresentative();
    setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(p => {
        if (p.id !== personId) return p;
        return { ...p, representatives: [...p.representatives, newRep] };
      })
    }));
  };

  const handleRemoveRepresentative = (listKey: 'landlords' | 'tenants' | 'guarantors', personId: string, repId: string) => {
     setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(p => {
        if (p.id !== personId) return p;
        return { ...p, representatives: p.representatives.filter(r => r.id !== repId) };
      })
    }));
  };

  const handlePersonFileUpload = (
    listKey: 'landlords' | 'tenants' | 'guarantors', 
    id: string, 
    files: FileList | null, 
    isSpouse: boolean
  ) => {
    if (!files) return;
    const fileNames = Array.from(files).map((f: File) => f.name);
    
    setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(p => {
        if (p.id !== id) return p;
        if (isSpouse) {
          return { ...p, spouseUploadedFiles: [...p.spouseUploadedFiles, ...fileNames] };
        } else {
          return { ...p, uploadedFiles: [...p.uploadedFiles, ...fileNames] };
        }
      })
    }));
  };

  const handleRemovePersonFile = (
    listKey: 'landlords' | 'tenants' | 'guarantors',
    id: string,
    fileName: string,
    isSpouse: boolean
  ) => {
    setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(p => {
        if (p.id !== id) return p;
        if (isSpouse) {
          return { ...p, spouseUploadedFiles: p.spouseUploadedFiles.filter(f => f !== fileName) };
        } else {
          return { ...p, uploadedFiles: p.uploadedFiles.filter(f => f !== fileName) };
        }
      })
    }));
  };

  const handlePropertyFileUpload = (files: FileList | null) => {
    if (!files) return;
    const fileNames = Array.from(files).map((f: File) => f.name);
    setData(prev => ({
      ...prev,
      propertyUploadedFiles: [...prev.propertyUploadedFiles, ...fileNames]
    }));
  };

  const handleRemovePropertyFile = (fileName: string) => {
    setData(prev => ({
      ...prev,
      propertyUploadedFiles: prev.propertyUploadedFiles.filter(f => f !== fileName)
    }));
  };

  const selectedInsuranceData = useMemo<InsuranceData | undefined>(() => {
    if (!data.insuranceType) return undefined;
    const table = INSURANCE_TABLE[data.insuranceType as PropertyType];
    return table?.find(row => row.coverage == data.insuranceCoverage);
  }, [data.insuranceType, data.insuranceCoverage]);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    const result = await generateLeaseSummary(data, selectedInsuranceData);
    setGeneratedSummary(result);
    setIsGenerating(false);
  };

  const handlePrint = () => {
    const summaryElement = document.getElementById('generated-summary');
    if (!summaryElement) return;

    const printWindow = window.open('', '', 'width=900,height=700');
    if (printWindow) {
      // Create a simplified version of the summary for printing (converting custom markdown to HTML)
      let content = generatedSummary
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\n/g, '<br>'); // New lines

      printWindow.document.write(`
        <html>
          <head>
            <title>Resumo Locação - 5005 Imóveis</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
              h1 { color: #002F6C; font-size: 24px; border-bottom: 2px solid #E30613; padding-bottom: 10px; margin-bottom: 20px; }
              strong { color: #002F6C; }
              .content { font-family: monospace; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>5005 IMÓVEIS - RESUMO EXECUTIVO</h1>
            <div class="content">${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSummary);
    alert('Resumo copiado!');
  };

  const ExpenseRow = ({ label, name, value }: { label: string, name: keyof LeaseState, value: ExpenseStatus }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-brand-blue/20 last:border-0 gap-2">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        {['Inclusa', 'Não Aplicável', 'A Parte'].map((option) => (
          <label key={option} className="flex items-center gap-1.5 cursor-pointer">
             <input 
               type="radio" 
               name={name} 
               value={option}
               checked={value === option}
               onChange={handleInputChange}
               className="w-4 h-4 text-brand-blue border-brand-blue focus:ring-brand-blue"
             />
             <span className="text-xs font-medium text-gray-600">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const StepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors shadow-sm ${step >= num ? 'bg-brand-blue text-white ring-2 ring-brand-blue ring-offset-2' : 'bg-gray-200 text-gray-500'}`}>
              {num}
            </div>
            {num < 4 && (
              <div className={`w-16 h-1 ${step > num ? 'bg-brand-blue' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12 bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-10 border-b-4 border-brand-red">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-brand-blue tracking-tight">5005 IMÓVEIS</h1>
          </div>
          <div className="hidden md:block text-xs text-brand-blue font-bold tracking-widest uppercase border-l-2 border-brand-red pl-3">
             Gestão de Contratos
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex-grow w-full">
        <StepIndicator />

        {/* STEP 1: PARTIES (LOCADORES E LOCATÁRIOS) */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
             <div className="bg-white p-6 rounded-lg shadow-sm border border-l-4 border-brand-blue border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <Users className="w-5 h-5 text-brand-red" />
                   Dados das Partes
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                   Preencha as informações dos proprietários e inquilinos. Selecione Pessoa Física ou Jurídica para ver os campos específicos.
                </p>
             </div>

             <div className="space-y-6">
                {/* Landlords */}
                <div>
                   <div className="flex justify-between items-center mb-2 px-1">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                         <div className="w-1 h-6 bg-brand-red rounded-full"></div>
                         Locadores (Proprietários)
                      </h3>
                      <button onClick={() => addPerson('landlords')} className="text-sm bg-brand-blue text-white px-4 py-1.5 rounded-full flex items-center gap-1 hover:bg-blue-900 transition-colors shadow-sm border border-brand-blue">
                         <Plus className="w-4 h-4" /> Adicionar
                      </button>
                   </div>
                   {data.landlords.map((p, idx) => (
                      <PersonForm 
                        key={p.id} role="Locador" person={p} index={idx} 
                        isExpanded={expandedPersonId === p.id}
                        onToggleExpand={() => setExpandedPersonId(expandedPersonId === p.id ? null : p.id)}
                        onUpdate={(id, field, val) => updatePerson('landlords', id, field, val)} 
                        onRemove={(id) => removePerson('landlords', id)}
                        onUpload={(id, files, isSpouse) => handlePersonFileUpload('landlords', id, files, isSpouse)}
                        onRemoveFile={(id, file, isSpouse) => handleRemovePersonFile('landlords', id, file, isSpouse)}
                        onAddRepresentative={(id) => handleAddRepresentative('landlords', id)}
                        onRemoveRepresentative={(id, repId) => handleRemoveRepresentative('landlords', id, repId)}
                      />
                   ))}
                </div>

                {/* Tenants */}
                <div>
                   <div className="flex justify-between items-center mb-2 px-1">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                         <div className="w-1 h-6 bg-brand-blue rounded-full"></div>
                         Locatários (Inquilinos)
                      </h3>
                      <button onClick={() => addPerson('tenants')} className="text-sm bg-brand-blue text-white px-4 py-1.5 rounded-full flex items-center gap-1 hover:bg-blue-900 transition-colors shadow-sm border border-brand-blue">
                         <Plus className="w-4 h-4" /> Adicionar
                      </button>
                   </div>
                   {data.tenants.map((p, idx) => (
                      <PersonForm 
                        key={p.id} role="Locatário" person={p} index={idx} 
                        isExpanded={expandedPersonId === p.id}
                        onToggleExpand={() => setExpandedPersonId(expandedPersonId === p.id ? null : p.id)}
                        onUpdate={(id, field, val) => updatePerson('tenants', id, field, val)} 
                        onRemove={(id) => removePerson('tenants', id)}
                        onUpload={(id, files, isSpouse) => handlePersonFileUpload('tenants', id, files, isSpouse)}
                        onRemoveFile={(id, file, isSpouse) => handleRemovePersonFile('tenants', id, file, isSpouse)}
                        onAddRepresentative={(id) => handleAddRepresentative('tenants', id)}
                        onRemoveRepresentative={(id, repId) => handleRemoveRepresentative('tenants', id, repId)}
                      />
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* STEP 2: NEGOTIATION */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-l-4 border-brand-blue h-full border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-brand-blue flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-brand-red" />
                Dados da Negociação
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Garantia</label>
                  <select 
                    name="guaranteeType" 
                    value={data.guaranteeType} 
                    onChange={handleInputChange}
                    className="w-full border-brand-blue border rounded-md p-2 focus:ring-2 focus:ring-brand-blue outline-none bg-gray-50 text-brand-blue"
                  >
                    <option value="">Selecione...</option>
                    {Object.values(GuaranteeType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {data.guaranteeType === GuaranteeType.CAUCAO && (
                  <div className="animate-fade-in bg-gray-50 p-3 rounded border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Caução (R$)</label>
                      <input 
                        type="text" 
                        name="cautionValue" 
                        value={formatCurrency(data.cautionValue)} 
                        onChange={handleCurrencyChange} 
                        className="w-full border border-brand-blue p-2 rounded focus:border-brand-blue outline-none bg-white text-brand-blue"
                      />
                  </div>
                )}

                {data.guaranteeType === GuaranteeType.SEGURO_FIANCA && (
                    <div className="animate-fade-in bg-gray-50 p-3 rounded border border-gray-200 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seguradora</label>
                        <input 
                          name="insuranceCompany" 
                          value={data.insuranceCompany} 
                          onChange={handleInputChange} 
                          className="w-full border border-brand-blue p-2 rounded focus:border-brand-blue outline-none bg-white text-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nº Apólice / Contrato</label>
                        <input 
                          name="insurancePolicy" 
                          value={data.insurancePolicy} 
                          onChange={handleInputChange} 
                          className="w-full border border-brand-blue p-2 rounded focus:border-brand-blue outline-none bg-white text-brand-blue"
                        />
                      </div>
                    </div>
                )}

                {data.guaranteeType === GuaranteeType.TITULO && (
                  <div className="animate-fade-in bg-gray-50 p-3 rounded border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Título (R$)</label>
                      <input 
                        type="text" 
                        name="capitalizationValue" 
                        value={formatCurrency(data.capitalizationValue)} 
                        onChange={handleCurrencyChange} 
                        className="w-full border border-brand-blue p-2 rounded focus:border-brand-blue outline-none bg-white text-brand-blue"
                      />
                  </div>
                )}

                {data.guaranteeType === GuaranteeType.FIADOR && (
                  <div className="text-sm text-gray-600 p-4 bg-yellow-50 rounded border border-yellow-100">
                      <strong className="text-brand-red">Atenção:</strong> Adicione os dados do fiador abaixo.
                  </div>
                )}
              </div>
            </div>

            {/* Guarantors List - Only visible if Fiador */}
            {data.guaranteeType === GuaranteeType.FIADOR && (
               <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                     <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
                        Fiadores
                     </h3>
                     <button onClick={() => addPerson('guarantors')} className="text-sm bg-brand-blue text-white px-4 py-1.5 rounded-full flex items-center gap-1 hover:bg-blue-900 transition-colors shadow-sm border border-brand-blue">
                        <Plus className="w-4 h-4" /> Adicionar
                     </button>
                  </div>
                  {data.guarantors.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-800 flex items-center justify-center">
                       Nenhum fiador adicionado. Clique em "Adicionar" para incluir.
                    </div>
                  )}
                  {data.guarantors.map((p, idx) => (
                     <PersonForm 
                       key={p.id} role="Fiador" person={p} index={idx} 
                       isExpanded={expandedPersonId === p.id}
                       onToggleExpand={() => setExpandedPersonId(expandedPersonId === p.id ? null : p.id)}
                       onUpdate={(id, field, val) => updatePerson('guarantors', id, field, val)} 
                       onRemove={(id) => removePerson('guarantors', id)} 
                       onUpload={(id, files, isSpouse) => handlePersonFileUpload('guarantors', id, files, isSpouse)}
                       onRemoveFile={(id, file, isSpouse) => handleRemovePersonFile('guarantors', id, file, isSpouse)}
                       onAddRepresentative={(id) => handleAddRepresentative('guarantors', id)}
                       onRemoveRepresentative={(id, repId) => handleRemoveRepresentative('guarantors', id, repId)}
                     />
                  ))}
               </div>
            )}

            {/* Brokerage Info */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-t-4 border-t-brand-blue border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-brand-blue flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-red" />
                  Administração & Parcerias
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Corretor (Atendimento)</label>
                      <input name="realtorName" value={data.realtorName} onChange={handleInputChange} className="border border-brand-blue p-2 rounded w-full focus:border-brand-blue outline-none bg-white text-brand-blue" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Captador (Imóvel)</label>
                      <input name="captorName" value={data.captorName} onChange={handleInputChange} className="border border-brand-blue p-2 rounded w-full focus:border-brand-blue outline-none bg-white text-brand-blue" />
                   </div>
                   
                   <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-100 md:col-span-2">
                      <div className="flex flex-col gap-2">
                         <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input type="checkbox" name="partnershipInternal" checked={data.partnershipInternal} onChange={handleInputChange} className="rounded border-brand-blue text-brand-blue focus:ring-brand-blue" />
                            Parceria Interna
                         </label>
                         {data.partnershipInternal && (
                            <input 
                              placeholder="Nome do Corretor (Parceria)" 
                              name="partnershipInternalName" 
                              value={data.partnershipInternalName} 
                              onChange={handleInputChange} 
                              className="ml-6 border border-brand-blue p-2 rounded text-sm w-11/12 focus:border-brand-blue outline-none bg-white text-brand-blue animate-fade-in" 
                            />
                         )}
                      </div>

                      <div className="flex flex-col gap-2 border-t border-gray-200 pt-2">
                         <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                            <input type="checkbox" name="partnershipExternal" checked={data.partnershipExternal} onChange={handleInputChange} className="rounded border-brand-blue text-brand-blue focus:ring-brand-blue" />
                            Parceria Externa
                         </label>
                         {data.partnershipExternal && (
                            <input 
                              placeholder="Imobiliária / Corretor Externo" 
                              name="partnershipExternalName" 
                              value={data.partnershipExternalName} 
                              onChange={handleInputChange} 
                              className="ml-6 border border-brand-blue p-2 rounded text-sm w-11/12 focus:border-brand-blue outline-none bg-white text-brand-blue animate-fade-in" 
                            />
                         )}
                      </div>
                   </div>

                   <div className="flex gap-4 items-center bg-gray-50 p-2 rounded md:col-span-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Taxa Adm (%):</label>
                        <input type="number" name="adminFee" value={data.adminFee} onChange={handleInputChange} className="border border-brand-blue p-1 rounded w-16 text-center bg-white text-brand-blue" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 border-l pl-4 border-gray-300">
                        <input type="checkbox" name="declaresIR" checked={data.declaresIR} onChange={handleInputChange} className="rounded border-brand-blue text-brand-blue" />
                        Declarar no IR
                      </label>
                   </div>
                </div>
            </div>

          </div>
        )}

        {/* STEP 3: FINANCIALS & INSURANCE */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-t-4 border-t-brand-blue h-fit border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-brand-blue flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-brand-red" /> Dados do Imovel Locado
                  </h2>
                  <button 
                    onClick={() => setShowPropertyDocsModal(true)}
                    className="flex items-center gap-1 text-xs font-semibold bg-white border border-brand-blue text-brand-blue px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="w-3 h-3" /> Documentos
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Endereço do Imóvel
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-1 relative">
                        <input 
                          placeholder="CEP" 
                          name="propertyAddress.cep" 
                          value={data.propertyAddress.cep} 
                          onChange={handleInputChange}
                          onBlur={handlePropertyCepBlur}
                          className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" 
                        />
                        {loadingPropertyCep && <Loader2 className="w-4 h-4 absolute right-2 top-2.5 animate-spin text-brand-blue" />}
                      </div>
                      <div className="md:col-span-3">
                        <input placeholder="Rua" name="propertyAddress.street" value={data.propertyAddress.street} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      </div>
                      <div>
                        <input placeholder="Número" name="propertyAddress.number" value={data.propertyAddress.number} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      </div>
                      <div>
                        <input placeholder="Complemento" name="propertyAddress.complement" value={data.propertyAddress.complement} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      </div>
                      <div>
                        <input placeholder="Bairro" name="propertyAddress.neighborhood" value={data.propertyAddress.neighborhood} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      </div>
                      <div>
                        <input placeholder="Cidade" name="propertyAddress.city" value={data.propertyAddress.city} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      </div>
                      <div>
                        <input placeholder="UF" name="propertyAddress.state" value={data.propertyAddress.state} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 pt-2 border-t border-gray-100">
                    <div>
                       <label className="block text-sm text-gray-600 mb-1 font-semibold flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-brand-red" /> Início do Contrato
                       </label>
                       <input type="date" name="contractStartDate" value={data.contractStartDate} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded-md focus:border-brand-blue outline-none bg-white text-brand-blue text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm text-gray-600 mb-1 font-semibold flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-brand-red" /> Dia do Vencimento
                       </label>
                       <input type="number" min="1" max="31" placeholder="Dia (ex: 5)" name="rentDueDay" value={data.rentDueDay || ''} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded-md focus:border-brand-blue outline-none bg-white text-brand-blue text-sm" />
                    </div>
                  </div>

                  {/* Contract Readjustment */}
                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                     <label className="block text-sm text-gray-600 mb-1 font-semibold">Índice de Reajuste do Contrato</label>
                     <select name="contractReadjustment" value={data.contractReadjustment} onChange={handleInputChange} className="w-full border border-brand-blue p-2 rounded focus:border-brand-blue outline-none bg-white text-brand-blue text-sm">
                       <option value="">Selecione...</option>
                       <option value="IGPM">IGPM (FGV)</option>
                       <option value="IPCA">IPCA (IBGE)</option>
                       <option value="IVAR">IVAR (FGV)</option>
                       <option value="INPC">INPC</option>
                       <option value="IPC">IPC</option>
                     </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                       <label className="block text-sm text-gray-600 mb-1 font-semibold">Aluguel (R$)</label>
                       <input 
                         type="text" 
                         name="rentValue" 
                         value={formatCurrency(data.rentValue)} 
                         onChange={handleCurrencyChange} 
                         className="w-full border border-brand-blue p-2 rounded-md focus:border-brand-blue outline-none bg-white text-brand-blue" 
                       />
                    </div>
                    <div>
                       <label className="block text-sm text-gray-600 mb-1 font-semibold">Condomínio</label>
                       <input 
                         type="text" 
                         name="condoValue" 
                         value={formatCurrency(data.condoValue)} 
                         onChange={handleCurrencyChange} 
                         className="w-full border border-brand-blue p-2 rounded-md focus:border-brand-blue outline-none bg-white text-brand-blue" 
                       />
                    </div>
                    <div>
                       <label className="block text-sm text-gray-600 mb-1 font-semibold">IPTU</label>
                       <input 
                         type="text" 
                         name="iptuValue" 
                         value={formatCurrency(data.iptuValue)} 
                         onChange={handleCurrencyChange} 
                         className="w-full border border-brand-blue p-2 rounded-md focus:border-brand-blue outline-none bg-white text-brand-blue" 
                       />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 mb-3 uppercase">DESPESAS DE CONSUMO</label>
                    <div className="flex flex-col gap-2">
                       <ExpenseRow label="Água" name="expenseWater" value={data.expenseWater} />
                       <ExpenseRow label="Luz" name="expenseElectricity" value={data.expenseElectricity} />
                       <ExpenseRow label="Gás" name="expenseGas" value={data.expenseGas} />
                       <ExpenseRow label="IPTU" name="expenseIptu" value={data.expenseIptu} />
                       <ExpenseRow label="Condomínio" name="expenseCondo" value={data.expenseCondo} />
                       <ExpenseRow label="Limpeza" name="expenseCleaning" value={data.expenseCleaning} />
                       
                       <div className="flex flex-col border-b border-gray-100 last:border-0 py-2">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                             <span className="text-sm font-bold text-gray-700">Outros</span>
                             <div className="flex items-center gap-3">
                                {['Inclusa', 'Não Aplicável', 'A Parte'].map((option) => (
                                  <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                                     <input 
                                       type="radio" 
                                       name="expenseOther" 
                                       value={option}
                                       checked={data.expenseOther === option}
                                       onChange={handleInputChange}
                                       className="w-4 h-4 text-brand-blue border-brand-blue focus:ring-brand-blue"
                                     />
                                     <span className="text-xs font-medium text-gray-600">{option}</span>
                                  </label>
                                ))}
                             </div>
                           </div>
                           
                           {data.expenseOther !== 'Não Aplicável' && (
                             <input 
                               name="otherExpenseDescription" 
                               value={data.otherExpenseDescription} 
                               onChange={handleInputChange} 
                               placeholder="Especifique a despesa..." 
                               className="w-full border border-brand-blue p-2 rounded-md focus:border-brand-blue outline-none bg-white text-brand-blue text-sm animate-fade-in" 
                             />
                           )}
                       </div>
                    </div>
                  </div>
                  
                  {/* Property Documents Upload */}
                  <div className="flex flex-col animate-fade-in border-t pt-4 border-dashed border-gray-200">
                      <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                         <Paperclip className="w-3 h-3" /> Arquivos do Imóvel
                      </h4>
                      <label className="flex flex-col items-center justify-center w-full h-12 border border-brand-blue border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                         <div className="flex items-center gap-2 text-gray-500">
                            <Upload className="w-4 h-4" />
                            <span className="text-xs font-medium">Anexar Arquivos (IPTU, Contas, etc)</span>
                         </div>
                         <input type="file" multiple className="hidden" onChange={(e) => handlePropertyFileUpload(e.target.files)} />
                      </label>
                      {data.propertyUploadedFiles?.length > 0 && (
                         <ul className="mt-2 space-y-1">
                            {data.propertyUploadedFiles.map((file, i) => (
                               <li key={i} className="text-xs text-blue-600 flex items-center justify-between gap-1 truncate bg-blue-50 p-1 rounded">
                                  <div className="flex items-center gap-1 overflow-hidden">
                                     <Paperclip className="w-3 h-3 flex-shrink-0" /> {file}
                                  </div>
                                  <button onClick={() => handleRemovePropertyFile(file)} className="text-red-500 hover:text-red-700">
                                     <Trash2 className="w-3 h-3" />
                                  </button>
                               </li>
                            ))}
                         </ul>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1 font-semibold">Observações do Contrato</label>
                    <textarea name="observations" value={data.observations} onChange={handleInputChange} placeholder="Ex: O primeiro aluguel será pago integral..." className="w-full border border-brand-blue p-2 rounded-md h-24 focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                </div>
              </div>

              {/* Insurance Calculator */}
              <div className="bg-white p-6 rounded-lg border border-brand-red border-t-4 h-fit shadow-md border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-brand-red">Cálculo de Seguro</h2>
                <div className="space-y-4 mb-6">
                   <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Tipo de Imóvel</label>
                      <select name="insuranceType" value={data.insuranceType} onChange={handleInputChange} className="w-full border-brand-blue border rounded-md p-2 focus:ring-1 focus:ring-brand-red outline-none bg-gray-50 text-brand-blue">
                         <option value="">Selecione...</option>
                         {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Valor Cobertura (Imóvel)</label>
                      <select name="insuranceCoverage" value={data.insuranceCoverage} onChange={handleInputChange} className="w-full border-brand-blue border rounded-md p-2 focus:ring-1 focus:ring-brand-red outline-none bg-gray-50 text-brand-blue">
                        <option value="">Selecione...</option>
                        {INSURANCE_TABLE[data.insuranceType as PropertyType]?.map((row) => (
                           <option key={row.coverage} value={row.coverage}>R$ {row.coverage.toLocaleString('pt-BR')}</option>
                        ))}
                      </select>
                   </div>
                </div>

                {selectedInsuranceData ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm">
                    <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Coberturas Calculadas</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-gray-600">
                      <span>Incêndio/Raio:</span><span className="text-right font-medium">R$ {selectedInsuranceData.fire.toLocaleString('pt-BR')}</span>
                      <span>Perda Aluguel:</span><span className="text-right font-medium">R$ {selectedInsuranceData.rentLoss.toLocaleString('pt-BR')}</span>
                      <span>Resp. Civil:</span><span className="text-right font-medium">R$ {selectedInsuranceData.civilLiability.toLocaleString('pt-BR')}</span>
                      <span>Vendaval:</span><span className="text-right font-medium">R$ {selectedInsuranceData.windstormOrImpact.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-300 flex justify-between items-center">
                       <span className="font-bold text-gray-800">Prêmio Mensal:</span>
                       <span className="text-xl font-extrabold text-brand-red">R$ {selectedInsuranceData.monthlyPremium.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                     <div className="flex justify-between items-center mt-1">
                       <span className="text-xs text-gray-500">Prêmio Anual:</span>
                       <span className="text-xs text-gray-500">R$ {selectedInsuranceData.annualPremium.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">Selecione o tipo e valor para calcular.</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* STEP 4: SUMMARY */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 text-center">
                <FileCheck className="w-16 h-16 text-brand-blue mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-brand-blue mb-2">Tudo pronto!</h2>
                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                  Clique abaixo para gerar o resumo oficial para o jurídico da <span className="font-bold text-brand-red">5005 Imóveis</span>.
                </p>
                
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isGenerating}
                  className="bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 mx-auto disabled:opacity-50 border border-brand-red"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Gerando com IA...</>
                  ) : (
                    <><Building className="w-5 h-5" /> Gerar Resumo Executivo</>
                  )}
                </button>
             </div>

             {generatedSummary && (
               <div className="bg-gray-50 p-6 rounded-lg border border-gray-300 relative shadow-sm">
                 <div className="flex justify-between items-center mb-4 border-b pb-2">
                   <h3 className="font-bold text-brand-blue uppercase tracking-wide">Resumo Gerado</h3>
                   <div className="flex gap-2">
                     <button onClick={handlePrint} className="flex items-center gap-1 text-xs bg-white border border-brand-blue text-brand-blue px-3 py-1 rounded hover:bg-blue-50 font-medium">
                       <Printer className="w-3 h-3" /> Imprimir
                     </button>
                     <button onClick={copyToClipboard} className="flex items-center gap-1 text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 font-medium text-gray-700">
                       Copiar
                     </button>
                   </div>
                 </div>
                 <FormattedSummary id="generated-summary" text={generatedSummary} />
               </div>
             )}
          </div>
        )}

        {/* NAVIGATION BUTTONS */}
        <div className="flex justify-between mt-10 max-w-4xl mx-auto">
          <button 
            onClick={() => setStep(s => Math.max(1, s - 1))}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors border border-brand-blue text-brand-blue hover:bg-blue-50 ${step === 1 ? 'invisible' : 'bg-white'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          {step < 4 ? (
            <button 
              onClick={() => setStep(s => Math.min(4, s + 1))}
              className="flex items-center gap-2 px-6 py-2 bg-brand-blue hover:bg-blue-900 text-white rounded-lg font-medium shadow-md transition-all border border-brand-blue"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </main>

      <footer className="bg-brand-blue text-white py-6 mt-8 border-t-4 border-brand-red">
         <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-center md:items-start">
               <span className="font-bold text-lg">5005 Imóveis</span>
               <span className="text-xs opacity-75">CRECI 32043 J</span>
            </div>
            <div className="text-xs text-center md:text-right opacity-70">
               <p>&copy; {new Date().getFullYear()} 5005 Imóveis. Todos os direitos reservados.</p>
               <p className="mt-1">Rogério Nascimento</p>
            </div>
         </div>
      </footer>
      
      {/* Property Docs Modal */}
      <DocumentChecklistModal 
         isOpen={showPropertyDocsModal}
         onClose={() => setShowPropertyDocsModal(false)}
         role="Imóvel"
      />
    </div>
  );
}

export default App;
