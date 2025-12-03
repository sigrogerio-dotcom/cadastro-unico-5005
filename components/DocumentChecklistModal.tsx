
import React from 'react';
import { PersonType } from '../types';
import { DOCS_PF, DOCS_PF_SPOUSE, DOCS_PJ, DOCS_GUARANTOR_EXTRA, DOCS_PROPERTY } from '../constants';
import { X, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: 'Locatário' | 'Locador' | 'Fiador' | 'Imóvel';
  personType?: PersonType;
  isMarried?: boolean;
}

export const DocumentChecklistModal: React.FC<Props> = ({ isOpen, onClose, role, personType, isMarried }) => {
  if (!isOpen) return null;

  const getDocs = () => {
    if (role === 'Imóvel') {
      return [...DOCS_PROPERTY];
    }

    // Default to PF list if personType is undefined (safety check), though it should be passed
    let docs = (personType === PersonType.PF || !personType) ? [...DOCS_PF] : [...DOCS_PJ];
    
    if (isMarried) {
      docs = [...docs, ...DOCS_PF_SPOUSE];
    }
    
    if (role === 'Fiador') {
      docs = [...docs, "--- Documentos do Fiador ---", ...DOCS_GUARANTOR_EXTRA];
    }
    
    return docs;
  };

  const docsList = getDocs();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="bg-brand-blue p-4 flex justify-between items-center border-b border-brand-blue">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentação: {role}
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
           {role !== 'Imóvel' && (
             <div className="mb-4 text-sm text-gray-500 font-medium bg-gray-50 p-2 rounded border border-gray-100 flex justify-between">
                <span>Tipo: <span className="text-brand-blue font-bold">{personType}</span></span>
                {isMarried && <span className="text-brand-red font-semibold">Casado(a)</span>}
             </div>
           )}
           
           <ul className="space-y-3">
            {docsList.map((doc, idx) => (
              <li key={idx} className={`text-sm ${doc.startsWith("---") ? "font-bold text-brand-blue mt-4 border-b border-gray-200 pb-1" : "text-gray-700 flex items-start gap-2"}`}>
                {!doc.startsWith("---") && <span className="text-brand-red font-bold mt-0.5">•</span>}
                {doc}
              </li>
            ))}
           </ul>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex justify-end">
           <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm font-semibold transition-colors">
             Fechar
           </button>
        </div>
      </div>
    </div>
  );
};
