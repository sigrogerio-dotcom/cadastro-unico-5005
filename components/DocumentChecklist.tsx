
import React from 'react';
import { PersonType, GuaranteeType } from '../types';
import { DOCS_PF, DOCS_PF_SPOUSE, DOCS_PJ, DOCS_GUARANTOR_EXTRA } from '../constants';
import { CheckCircle2, FileText } from 'lucide-react';

interface Props {
  personType: PersonType;
  guaranteeType: GuaranteeType;
  isMarried: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFiles: string[];
}

export const DocumentChecklist: React.FC<Props> = ({ 
  personType, guaranteeType, isMarried, onUpload, uploadedFiles 
}) => {
  
  const getDocs = () => {
    let docs = personType === PersonType.PF ? [...DOCS_PF] : [...DOCS_PJ];
    
    if (isMarried) {
      docs = [...docs, ...DOCS_PF_SPOUSE];
    }
    
    if (guaranteeType === GuaranteeType.FIADOR) {
      docs = [...docs, "--- Documentos do Fiador ---", ...DOCS_PF, ...DOCS_GUARANTOR_EXTRA];
    }
    
    return docs;
  };

  const docsList = getDocs();

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-brand-red">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-brand-red" />
        Documentação Necessária
      </h3>
      
      <div className="mb-6">
        <ul className="space-y-2">
          {docsList.map((doc, idx) => (
            <li key={idx} className={`text-sm ${doc.startsWith("---") ? "font-bold text-brand-blue mt-4 uppercase tracking-wide border-b border-gray-200 pb-1" : "text-gray-600 flex items-start gap-2"}`}>
              {!doc.startsWith("---") && <span className="text-brand-red mt-0.5 font-bold">•</span>}
              {doc}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t pt-4">
         <label className="block text-sm font-medium text-gray-700 mb-2">Anexar Arquivos (PDF/Imagem)</label>
         <div className="flex items-center gap-4">
            <input 
              type="file" 
              multiple 
              onChange={onUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-brand-blue
                hover:file:bg-blue-100"
            />
         </div>
         {uploadedFiles.length > 0 && (
           <div className="mt-3">
             <p className="text-xs text-gray-500 font-semibold uppercase">Arquivos Anexados:</p>
             <ul className="mt-1 space-y-1">
               {uploadedFiles.map((file, i) => (
                 <li key={i} className="text-xs text-green-700 flex items-center gap-1">
                   <CheckCircle2 className="w-3 h-3" /> {file}
                 </li>
               ))}
             </ul>
           </div>
         )}
      </div>
    </div>
  );
};
