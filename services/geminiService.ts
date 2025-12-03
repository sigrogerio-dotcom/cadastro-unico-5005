
import { GoogleGenAI } from "@google/genai";
import { LeaseState, InsuranceData } from '../types';

export const generateLeaseSummary = async (
  data: LeaseState, 
  insuranceData: InsuranceData | undefined
): Promise<string> => {
  if (!process.env.API_KEY) {
    console.error("API Key not found");
    return "Erro: Chave de API não encontrada. Verifique process.env.API_KEY.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Você é um assistente imobiliário profissional da '5005 Imóveis'. 
    Sua tarefa é receber um objeto JSON com dados de locação (LeaseState) e gerar um resumo de texto estritamente formatado em PORTUGUÊS DO BRASIL para o departamento jurídico.
    
    REGRAS DE FORMATAÇÃO:
    - DATAS: Use formato DD/MM/AAAA (Ex: 01/05/2024).
    - VALORES MONETÁRIOS: Use formato R$ X.XXX,XX.
    - NEGRITO: Use asteriscos duplos (**Texto**) para títulos.

    A saída deve seguir estritamente esta estrutura:
    
    **5005 IMÓVEIS - RESUMO LOCAÇÃO**
    
    **DADOS DO IMÓVEL**: 
    [Formate o objeto 'propertyAddress' aqui: Rua, Número - Complemento - Bairro, Cidade/UF - CEP]
    
    **ADMINISTRAÇÃO & PARCERIAS**:
    - Declarar no IR: [Sim/Não]
    - Taxa Adm: [Se noAdmin for true: "Sem Administração" | Se false: Valor + "%"]
    - Corretor: [realtorName] | Captador: [captorName]
    - Parceria Interna: [Sim/Não] [Se Sim: Nome do Corretor]
    - Parceria Externa: [Sim/Não] [Se Sim: Imobiliária/Corretor]
    
    **DADOS DA GARANTIA**:
    - Tipo: [guaranteeType]
    - Detalhes: 
      [Se Caução: Valor R$ ...]
      [Se Seguro Fiança: Seguradora & Nº Apólice]
      [Se Título Capitalização: Valor R$ ...]
      [Se Fiador: "Ver dados dos fiadores abaixo"]
      [Se Sem Garantia: "Nenhuma garantia informada"]
    
    **SEGURO INCÊNDIO** (Liste como uma tabela limpa):
    - Tipo de Imóvel: [insuranceType]
    - Valor Cobertura: R$ [insuranceCoverage]
    [Liste coberturas calculadas se disponíveis: Incêndio, Perda Aluguel, etc.]
    - Prêmio Mensal: R$ [Valor]
    - Prêmio Anual: R$ [Valor]

    **DADOS FINANCEIROS**:
    - Aluguel: R$ [rentValue]
    - Condomínio: R$ [condoValue]
    - IPTU: R$ [iptuValue]
    - Despesas de Consumo:
      * Água: [expenseWater]
      * Luz: [expenseElectricity]
      * Gás: [expenseGas]
      * IPTU (Parcela): [expenseIptu]
      * Condomínio: [expenseCondo]
      * Limpeza: [expenseCleaning]
      * Outros: [expenseOther] [Se diferente de N/A, inclua: otherExpenseDescription]
    
    **DATAS E OBSERVAÇÕES**:
    - Data Início Contrato: [contractStartDate - formato DD/MM/AAAA]
    - Dia Vencimento Aluguel: Dia [rentDueDay]
    - Índice de Reajuste: [contractReadjustment]
    - Observações: [observations]
    
    **DADOS DAS PARTES** (Itere por todas as listas):
    
    **LOCADOR(ES)**:
    [Para cada locador: 
     Nome (ou Razão Social) | CPF/CNPJ: [Valor] | RG/IE: [Valor] | Estado Civil/Tipo
     Se PJ: Liste TODOS os Representantes Legais (Nome, CPF, RG, Profissão, Estado Civil, Endereço).
     Endereço Residencial/Empresa: [Endereço completo].
     Email: [email] | Telefone: [phone]
     **DADOS BANCÁRIOS**: 
     Banco: [bankName]
     Ag: [bankAgency] | CC: [bankAccount] | PIX: [pixKey]
     Favorecido: [Se isBeneficiarySelf for true, escreva "O Próprio"; CASO CONTRÁRIO escreva o beneficiaryName]
     Se casado (ou Representante casado), inclua dados do Cônjuge]
    
    **LOCATÁRIO(S)**:
    [Para cada locatário: 
     Nome (ou Razão Social) | CPF/CNPJ: [Valor] | RG/IE: [Valor] | Profissão | Estado Civil
     Se PJ: Liste TODOS os Representantes Legais (Nome, CPF, RG, Profissão, Estado Civil, Endereço).
     Endereço Residencial/Empresa: [Endereço completo].
     Email: [email] | Telefone: [phone]
     Se casado (ou Representante casado), inclua dados do Cônjuge]
    
    **FIADOR(ES)** (Se houver):
    [Para cada fiador: 
     Nome | CPF | Profissão | Estado Civil.
     Endereço Residencial: [Endereço completo].
     Imóvel de Garantia: [guaranteePropertyAddress] (Matrícula: [guaranteePropertyMatricula], IPTU: [guaranteePropertyIptu]).
     Se casado, inclua dados do Cônjuge.]

    **DOCUMENTAÇÃO ANEXADA** (Organizada por Pastas):
    
    📂 **PASTA IMÓVEL**
    [Liste os arquivos em 'propertyUploadedFiles'. Se vazio, indique "(Vazio)"]
    
    [Itere sobre Locadores, Locatários e Fiadores para listar seus arquivos]:
    📂 **PASTA [TIPO]: [NOME DA PESSOA]**
       - [Lista de 'uploadedFiles']
       [Se houver arquivos em 'spouseUploadedFiles']:
         ↳ 📂 **Subpasta Cônjuge ([Nome do Cônjuge])**: [Lista de 'spouseUploadedFiles']
    
    Mantenha a formatação profissional. Se um campo estiver vazio, indique como "Não informado".
  `;

  const prompt = `
    Gere o "RESUMO LOCAÇÃO" com base nestes dados:
    
    Dados do Contrato: ${JSON.stringify(data, null, 2)}
    
    Dados Calculados do Seguro: ${JSON.stringify(insuranceData, null, 2)}
    
    Certifique-se de listar todos os Locadores, Locatários e Fiadores explicitamente. 
    Se for Pessoa Jurídica (PJ), itere sobre o array 'representatives' e liste todos os sócios.
    Na seção de Documentação, crie uma estrutura visual de pastas (📂) agrupando os arquivos pelo nome da pessoa ou imóvel.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, 
      }
    });

    return response.text || "Nenhuma resposta gerada.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Falha ao gerar resumo via IA. Por favor, tente novamente.";
  }
};
