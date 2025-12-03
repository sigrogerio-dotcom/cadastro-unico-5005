
import React, { useState } from 'react';
import { Person, PersonType, Representative } from '../types';
import { BANKS_LIST } from '../constants';
import { fetchAddressByCep } from '../services/cepService';
import { DocumentChecklistModal } from './DocumentChecklistModal';
import { Trash2, User, ChevronDown, ChevronUp, Upload, Paperclip, Briefcase, Loader2, MapPin, FileText, Plus } from 'lucide-react';

interface Props {
  role: 'Locatário' | 'Locador' | 'Fiador';
  person: Person;
  index: number;
  onUpdate: (id: string, field: keyof Person | string, value: any) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpload?: (id: string, files: FileList | null, isSpouse: boolean) => void;
  onRemoveFile?: (id: string, fileName: string, isSpouse: boolean) => void;
  onAddRepresentative?: (id: string) => void;
  onRemoveRepresentative?: (id: string, repId: string) => void;
}

export const PersonForm: React.FC<Props> = ({ 
  role, person, index, onUpdate, onRemove, isExpanded, onToggleExpand, onUpload, onRemoveFile, onAddRepresentative, onRemoveRepresentative
}) => {
  
  const isPJ = person.type === PersonType.PJ;
  const [loadingCep, setLoadingCep] = useState<boolean>(false);
  const [loadingRepCep, setLoadingRepCep] = useState<string | null>(null); // Track specific rep loading
  const [showDocsModal, setShowDocsModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Automatic casing transformation
    let finalValue: string | boolean = value;

    if (type === 'checkbox') {
       finalValue = checked;
    } else if (e.target.tagName !== 'SELECT' && type !== 'date' && type !== 'number') {
       if (name.toLowerCase().includes('email')) {
         finalValue = value.toLowerCase();
       } else {
         finalValue = value.toUpperCase();
       }
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      onUpdate(person.id, parent, { ...person[parent as keyof Person] as any, [child]: finalValue });
    } else {
      onUpdate(person.id, name, finalValue);
    }
  };

  const handleRepChange = (repIndex: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    
    if (e.target.tagName !== 'SELECT' && type !== 'date' && type !== 'number' && !name.toLowerCase().includes('email')) {
      finalValue = value.toUpperCase();
    } else if (name.toLowerCase().includes('email')) {
      finalValue = value.toLowerCase();
    }

    const updatedReps = [...person.representatives];
    
    if (name.startsWith('address.')) {
      const addrField = name.split('.')[1];
      updatedReps[repIndex] = {
        ...updatedReps[repIndex],
        address: { ...updatedReps[repIndex].address, [addrField]: finalValue }
      };
    } else {
      updatedReps[repIndex] = { ...updatedReps[repIndex], [name]: finalValue };
    }
    
    onUpdate(person.id, 'representatives', updatedReps);
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>, addressType: 'address' | 'representativeAddress', repIndex?: number) => {
    const cep = e.target.value;
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      if (addressType === 'address') setLoadingCep(true);
      else if (repIndex !== undefined) setLoadingRepCep(repIndex.toString());

      const data = await fetchAddressByCep(cleanCep);

      if (data) {
        if (addressType === 'address') {
          const newAddress = {
            ...person.address,
            street: data.logradouro.toUpperCase(),
            neighborhood: data.bairro.toUpperCase(),
            city: data.localidade.toUpperCase(),
            state: data.uf.toUpperCase(),
            cep: cep
          };
          onUpdate(person.id, 'address', newAddress);
        } else if (repIndex !== undefined) {
           const updatedReps = [...person.representatives];
           updatedReps[repIndex].address = {
             ...updatedReps[repIndex].address,
             street: data.logradouro.toUpperCase(),
             neighborhood: data.bairro.toUpperCase(),
             city: data.localidade.toUpperCase(),
             state: data.uf.toUpperCase(),
             cep: cep
           };
           onUpdate(person.id, 'representatives', updatedReps);
        }
      } else {
        alert("CEP não encontrado.");
      }

      setLoadingCep(false);
      setLoadingRepCep(null);
    }
  };

  const getRoleColor = () => {
    switch(role) {
      case 'Locador': return 'text-brand-red';
      case 'Locatário': return 'text-brand-blue';
      case 'Fiador': return 'text-yellow-600';
      default: return 'text-gray-700';
    }
  };

  return (
    <>
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-4 transition-all hover:shadow-md border-brand-blue">
      <div 
        className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 border-b border-gray-100"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          {isPJ ? <Briefcase className={`w-5 h-5 ${getRoleColor()}`} /> : <User className={`w-5 h-5 ${getRoleColor()}`} />}
          <span className={`font-semibold ${getRoleColor()}`}>{role}</span>
          <span className="text-gray-600 text-sm">- {person.name || (isPJ ? 'Nova Empresa' : 'Novo Cadastro')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowDocsModal(true); }}
            className="flex items-center gap-1 text-xs font-semibold bg-white border border-brand-blue text-brand-blue px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
            title="Ver Documentação Necessária"
          >
            <FileText className="w-3 h-3" /> Documentação
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(person.id); }}
            className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 animate-fade-in bg-white">
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Tipo de Pessoa</label>
                <select name="type" value={person.type} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm bg-gray-50 focus:bg-white focus:border-brand-blue outline-none text-brand-blue font-semibold">
                  <option value="">Selecione...</option>
                  <option value={PersonType.PF}>Pessoa Física</option>
                  <option value={PersonType.PJ}>Pessoa Jurídica</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
               <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide border-b pb-1">
                 {isPJ ? 'Dados da Empresa' : 'Dados Pessoais'}
               </h4>
            </div>

            <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{isPJ ? 'Razão Social' : 'Nome Completo'}</label>
                <input name="name" value={person.name} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>

            <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{isPJ ? 'CNPJ' : 'CPF'}</label>
               <input name="cpfCnpj" value={person.cpfCnpj} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>
            <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{isPJ ? 'Inscrição Estadual' : 'RG'}</label>
               <input name="rgIe" value={person.rgIe} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>

            <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Email Principal</label>
               <input name="email" value={person.email} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>
            <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Telefone Principal</label>
               <input name="phone" value={person.phone} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>

            <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{isPJ ? 'Ramo de Atividade' : 'Profissão'}</label>
               <input name="profession" value={person.profession} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>

            {!isPJ && (
              <>
                <div>
                   <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Estado Civil</label>
                   <select name="civilStatus" value={person.civilStatus} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-gray-50 text-brand-blue">
                     <option value="">Selecione...</option>
                     <option value="Solteiro">Solteiro</option>
                     <option value="Casado">Casado</option>
                     <option value="Divorciado">Divorciado</option>
                     <option value="Viúvo">Viúvo</option>
                     <option value="União Estável">União Estável</option>
                     <option value="Separado">Separado</option>
                   </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Nº Dependentes</label>
                  <input name="dependents" value={person.dependents} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                </div>
              </>
            )}

            <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">{isPJ ? 'Data de Abertura' : 'Data de Nascimento'}</label>
               <input type="date" name="dateOfBirth" value={person.dateOfBirth} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
            </div>

            {/* Address */}
            <div className="md:col-span-2 mt-2 pt-2 border-t border-gray-100">
               <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {isPJ ? 'Endereço da Empresa' : 'Endereço Residencial'}
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-1 relative">
                    <input 
                      placeholder="CEP" 
                      name="address.cep" 
                      value={person.address.cep} 
                      onChange={handleChange} 
                      onBlur={(e) => handleCepBlur(e, 'address')}
                      className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" 
                    />
                    {loadingCep && <Loader2 className="w-4 h-4 absolute right-2 top-2.5 animate-spin text-brand-blue" />}
                  </div>
                  <div className="md:col-span-3">
                    <input placeholder="Rua" name="address.street" value={person.address.street} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                  <div>
                    <input placeholder="Número" name="address.number" value={person.address.number} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                  <div>
                    <input placeholder="Complemento" name="address.complement" value={person.address.complement} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                  <div>
                    <input placeholder="Bairro" name="address.neighborhood" value={person.address.neighborhood} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                  <div>
                    <input placeholder="Cidade" name="address.city" value={person.address.city} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                  <div>
                    <input placeholder="UF" name="address.state" value={person.address.state} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
               </div>
            </div>

            {/* SECTION: PJ REPRESENTATIVE / PARTNER (Loop for Multiple Reps) */}
            {isPJ && (
               <div className="md:col-span-2 mt-4 space-y-4">
                  {person.representatives.map((rep, idx) => (
                    <div key={rep.id} className="bg-gray-50 p-4 rounded-md border border-gray-200 relative">
                       <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2"><User className="w-4 h-4" /> Dados do Sócio / Representante #{idx + 1}</span>
                          {person.representatives.length > 1 && (
                            <button onClick={() => onRemoveRepresentative && onRemoveRepresentative(person.id, rep.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Excluir
                            </button>
                          )}
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                             <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo</label>
                             <input name="name" value={rep.name} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-gray-500 mb-1">CPF</label>
                             <input name="cpf" value={rep.cpf} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-gray-500 mb-1">RG</label>
                             <input name="rg" value={rep.rg} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-gray-500 mb-1">Profissão</label>
                             <input name="profession" value={rep.profession} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-gray-500 mb-1">Estado Civil</label>
                             <select name="civilStatus" value={rep.civilStatus} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue">
                                <option value="">Selecione...</option>
                                <option value="Solteiro">Solteiro</option>
                                <option value="Casado">Casado</option>
                                <option value="Divorciado">Divorciado</option>
                                <option value="Viúvo">Viúvo</option>
                                <option value="União Estável">União Estável</option>
                                <option value="Separado">Separado</option>
                             </select>
                          </div>
                          <div className="md:col-span-2 mt-2">
                             <label className="block text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                               <MapPin className="w-3 h-3" /> Endereço Residencial do Sócio
                             </label>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-1 relative">
                                   <input 
                                     placeholder="CEP" 
                                     name="address.cep" 
                                     value={rep.address.cep} 
                                     onChange={(e) => handleRepChange(idx, e)}
                                     onBlur={(e) => handleCepBlur(e, 'representativeAddress', idx)}
                                     className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" 
                                   />
                                   {loadingRepCep === idx.toString() && <Loader2 className="w-4 h-4 absolute right-2 top-2.5 animate-spin text-brand-blue" />}
                                </div>
                                <div className="md:col-span-3">
                                   <input placeholder="Rua" name="address.street" value={rep.address.street} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                                </div>
                                <div>
                                   <input placeholder="Número" name="address.number" value={rep.address.number} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                                </div>
                                <div>
                                   <input placeholder="Complemento" name="address.complement" value={rep.address.complement} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                                </div>
                                <div>
                                   <input placeholder="Bairro" name="address.neighborhood" value={rep.address.neighborhood} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                                </div>
                                <div>
                                   <input placeholder="Cidade" name="address.city" value={rep.address.city} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                                </div>
                                 <div>
                                   <input placeholder="UF" name="address.state" value={rep.address.state} onChange={(e) => handleRepChange(idx, e)} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => onAddRepresentative && onAddRepresentative(person.id)} 
                      className="text-xs flex items-center gap-1 bg-white border border-brand-blue text-brand-blue px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Outro Sócio
                    </button>
                  </div>
               </div>
            )}

            {/* SPOUSE INFO (For PF Only) - PJ Spouse logic removed for simplicity in multi-rep structure, or could be added inside rep map if critical */}
            {!isPJ && (
               <div className="md:col-span-2 mt-4 border-t pt-3 border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                     <input type="checkbox" name="isMarried" checked={person.isMarried} onChange={handleChange} className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue" />
                     <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                        Dados do Cônjuge
                     </span>
                  </label>
                  
                  {person.isMarried && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded border border-gray-100">
                     <input placeholder="Nome Cônjuge" name="spouseName" value={person.spouseName} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                     <input placeholder="CPF Cônjuge" name="spouseCpf" value={person.spouseCpf} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                     <input placeholder="RG Cônjuge" name="spouseRg" value={person.spouseRg} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                     <input placeholder="Profissão Cônjuge" name="spouseProfession" value={person.spouseProfession} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                     <input placeholder="Email Cônjuge" name="spouseEmail" value={person.spouseEmail} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                     <input placeholder="Telefone Cônjuge" name="spousePhone" value={person.spousePhone} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                  </div>
                  )}
               </div>
            )}

            {/* Role Specifics: BANK (Landlord) */}
            {role === 'Locador' && (
              <div className="md:col-span-2 mt-4 border-t pt-3 border-gray-100 bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  Dados Bancários (Para Pagamento)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Banco</label>
                      <input 
                        list="banks-list"
                        name="bankName" 
                        value={person.bankName} 
                        onChange={handleChange} 
                        className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" 
                        placeholder="Selecione ou digite o nome do Banco"
                      />
                      <datalist id="banks-list">
                        {BANKS_LIST.map((b) => (
                          <option key={b.code} value={`${b.code} - ${b.name}`} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Agência</label>
                      <input name="bankAgency" value={person.bankAgency} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Conta (com dígito)</label>
                      <input name="bankAccount" value={person.bankAccount} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Chave PIX</label>
                      <input name="pixKey" value={person.pixKey} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                    </div>
                    <div className="md:col-span-2 pt-2 border-t border-gray-200 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input type="checkbox" name="isBeneficiarySelf" checked={person.isBeneficiarySelf} onChange={handleChange} className="w-4 h-4 text-brand-blue rounded focus:ring-brand-blue" />
                          <span className="text-sm font-medium text-gray-700">O favorecido é o próprio locador?</span>
                      </label>
                      {!person.isBeneficiarySelf && (
                          <div className="animate-fade-in mt-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo do Favorecido</label>
                            <input name="beneficiaryName" value={person.beneficiaryName} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                          </div>
                      )}
                    </div>
                </div>
              </div>
            )}

            {role === 'Fiador' && (
              <div className="md:col-span-2 mt-4 border-t pt-3 border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Imóvel de Garantia</h4>
                <div className="grid grid-cols-1 gap-3">
                    <input placeholder="Endereço do Imóvel" name="guaranteePropertyAddress" value={person.guaranteePropertyAddress} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Número Matrícula" name="guaranteePropertyMatricula" value={person.guaranteePropertyMatricula} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                      <input placeholder="Cód. IPTU (Espelho)" name="guaranteePropertyIptu" value={person.guaranteePropertyIptu} onChange={handleChange} className="w-full border border-brand-blue p-2 rounded text-sm focus:border-brand-blue outline-none bg-white text-brand-blue" />
                    </div>
                </div>
              </div>
            )}

          </div>

          {/* DOCUMENT UPLOADS */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Main Person Docs */}
                <div className="flex flex-col">
                   <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> Documentos - {isPJ ? 'Empresa' : 'Titular'}
                   </h4>
                   <label className="flex flex-col items-center justify-center w-full h-12 border border-brand-blue border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500">
                         <Upload className="w-4 h-4" />
                         <span className="text-xs font-medium">Anexar Documentos</span>
                      </div>
                      <input type="file" multiple className="hidden" onChange={(e) => onUpload && onUpload(person.id, e.target.files, false)} />
                   </label>
                   {person.uploadedFiles?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                         {person.uploadedFiles.map((file, i) => (
                            <li key={i} className="text-xs text-blue-600 flex items-center justify-between gap-1 truncate bg-blue-50 p-1 rounded">
                               <div className="flex items-center gap-1 overflow-hidden">
                                  <Paperclip className="w-3 h-3 flex-shrink-0" /> {file}
                               </div>
                               <button onClick={() => onRemoveFile && onRemoveFile(person.id, file, false)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-3 h-3" />
                               </button>
                            </li>
                         ))}
                      </ul>
                   )}
                </div>

                {/* Spouse/Partner Docs (If Person Married or PJ Rep Docs) */}
                {(person.isMarried || isPJ) && (
                   <div className="flex flex-col animate-fade-in">
                      <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                         <Paperclip className="w-3 h-3" /> {isPJ ? 'Documentos - Sócios' : 'Documentos - Cônjuge'}
                      </h4>
                      <label className="flex flex-col items-center justify-center w-full h-12 border border-brand-blue border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                         <div className="flex items-center gap-2 text-gray-500">
                            <Upload className="w-4 h-4" />
                            <span className="text-xs font-medium">Anexar Documentos</span>
                         </div>
                         <input type="file" multiple className="hidden" onChange={(e) => onUpload && onUpload(person.id, e.target.files, true)} />
                      </label>
                      {person.spouseUploadedFiles?.length > 0 && (
                         <ul className="mt-2 space-y-1">
                            {person.spouseUploadedFiles.map((file, i) => (
                               <li key={i} className="text-xs text-blue-600 flex items-center justify-between gap-1 truncate bg-blue-50 p-1 rounded">
                                  <div className="flex items-center gap-1 overflow-hidden">
                                    <Paperclip className="w-3 h-3 flex-shrink-0" /> {file}
                                  </div>
                                  <button onClick={() => onRemoveFile && onRemoveFile(person.id, file, true)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                               </li>
                            ))}
                         </ul>
                      )}
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      <DocumentChecklistModal 
        isOpen={showDocsModal} 
        onClose={() => setShowDocsModal(false)} 
        role={role}
        personType={person.type as PersonType}
        isMarried={person.isMarried}
      />
    </div>
    </>
  );
};
