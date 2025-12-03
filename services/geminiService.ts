
import { GoogleGenAI } from "@google/genai";
import { LeaseState, InsuranceData } from '../types';

export const generateLeaseSummary = async (
  data: LeaseState, 
  insuranceData: InsuranceData | undefined
): Promise<string> => {
  if (!process.env.API_KEY) {
    console.error("API Key not found");
    return "Error: API Key missing. Please set process.env.API_KEY.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a professional real estate assistant for '5005 Imóveis'. 
    Your task is to take a JSON object representing lease data (LeaseState) and generate a strictly formatted text summary for the Legal Department in Portuguese.
    
    The output must strictly follow this structure:
    
    HEADER:
    5005 IMÓVEIS - RESUMO LOCAÇÃO
    Imóvel: [Format the 'propertyAddress' object here: Street, Number - Complement - Neighborhood, City/State - CEP]
    
    ADMINISTRATIVE:
    - Declaration to IR: [Yes/No]
    - Administration Fee: [Value]%
    - Realtor: [Name] | Captor: [Name]
    - Partnership Internal: [Yes/No] [If Yes: Name of Partner]
    - Partnership External: [Yes/No] [If Yes: Name of Agency/Partner]
    
    GUARANTEE:
    - Type: [Guarantee Type]
    - Details: 
      [If Caução: Value R$ ...]
      [If Seguro Fiança: Insurer Name & Policy/Contract Number]
      [If Título Capitalização: Value R$ ...]
      [If Fiador: See below]
    
    INSURANCE (Format as a clean table-like list):
    - Type: [Insurance Type]
    - Coverage: R$ [Value]
    [List specific coverages: Incendio, Perda Aluguel, etc.]
    - Monthly Premium: R$ [Value]
    - Annual Premium: R$ [Value]

    FINANCIALS:
    - Rent: R$ [Value]
    - Condo: R$ [Value]
    - IPTU: R$ [Value]
    - Included in Rent: [List items: Water, Electricity, Gas, IPTU, Condominio, Limpeza. If 'Other' is checked, include the specific description provided in 'otherExpenseDescription']
    
    DATES & OBS:
    - Contract Start Date: [contractStartDate]
    - Rent Due Day: Day [rentDueDay]
    - Observations: [Observations text from user]
    
    PARTIES (Iterate through all lists):
    
    LOCADOR(ES):
    [For each landlord: 
     Name (or Razão Social), CPF/CNPJ, RG/IE, Civil Status/Type. 
     If PJ: List Representative Name, CPF, RG, Profession, Civil Status.
     Representative Address: [Full address including street, number, complement, neighborhood, city, state, cep].
     Address. Email, Phone.
     BANKING DETAILS: 
     Bank: [bankName]
     Ag: [bankAgency] | CC: [bankAccount] | PIX: [pixKey]
     Beneficiary: [If isBeneficiarySelf is true, write "O Próprio"; ELSE write the beneficiaryName]
     If married (or Representative is married), include Spouse info]
    
    LOCATÁRIO(S):
    [For each tenant: Name/Razão Social, CPF/CNPJ, RG/IE, Type. 
     If PJ: List Representative Name, CPF, RG.
     Representative Address: [Full address including street, number, complement, neighborhood, city, state, cep].
     Address. Email, Phone.
     If married (or Representative is married), include Spouse info]
    
    FIADOR(ES) (If applicable):
    [For each guarantor: Name/Razão Social, CPF/CNPJ. Address. Property of Guarantee info (Matricula/Address). Spouse info.]
    
    Maintain professional formatting. Use 'R$' for currency.
  `;

  const prompt = `
    Generate the "RESUMO LOCAÇÃO" based on this data:
    
    Data: ${JSON.stringify(data, null, 2)}
    
    Calculated Insurance: ${JSON.stringify(insuranceData, null, 2)}
    
    Ensure all Landlords, Tenants, and Guarantors are listed explicitly. 
    If a person is a PJ (Pessoa Jurídica), make sure to explicitly list their "Representative" details (Name, CPF, RG, Address) next to the Company Name.
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

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate summary via AI. Please try again.";
  }
};
