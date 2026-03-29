
import { GoogleGenAI, Type } from "@google/genai";

export const getVehicleSpecs = async (brand: string, model: string, year: string, engine: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{ 
          text: `Forneça as especificações técnicas para o veículo: ${brand} ${model} ${year} ${engine}. 
          Preciso dos valores médios no Brasil para: 
          1. Capacidade do tanque (litros)
          2. Consumo médio na gasolina (km/l)
          3. Consumo médio no etanol (km/l)
          4. Intervalo de troca de óleo (km)
          5. Intervalo de troca de correia dentada (km - se não tiver correia dentada, use 0).
          Retorne apenas o JSON.` 
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tankCapacity: { type: Type.NUMBER },
            avgConsumptionGas: { type: Type.NUMBER },
            avgConsumptionEth: { type: Type.NUMBER },
            oilInterval: { type: Type.NUMBER },
            beltInterval: { type: Type.NUMBER }
          },
          required: ["tankCapacity", "avgConsumptionGas", "avgConsumptionEth", "oilInterval"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Vehicle Specs Error:", error);
    return null;
  }
};

export const getMaintenanceEstimates = async (model: string, year: number) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{ 
          text: `Forneça uma estimativa de custos de manutenção e intervalos para um veículo ${model} ano ${year} usado para trabalho profissional (Uber/99) no Brasil. Retorne valores aproximados em Reais (BRL).` 
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedCostPerKm: { type: Type.NUMBER, description: "Custo de manutenção em R$ por quilômetro." },
            oilChangeIntervalKm: { type: Type.NUMBER, description: "Intervalo recomendado para troca de óleo em km." },
            tireReplacementIntervalKm: { type: Type.NUMBER, description: "Vida útil estimada dos pneus em km." },
            annualCostEstimate: { type: Type.NUMBER, description: "Custo anual total estimado de manutenção." },
            tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dicas para reduzir custos de manutenção." }
          },
          required: ["estimatedCostPerKm", "oilChangeIntervalKm", "annualCostEstimate"],
          propertyOrdering: ["estimatedCostPerKm", "oilChangeIntervalKm", "tireReplacementIntervalKm", "annualCostEstimate", "tips"]
        }
      }
    });

    const text = response.text?.trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Maintenance Error:", error);
    return null;
  }
};

export const getFinancialAdvice = async (stats: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{
          text: `Analise estes dados financeiros de um motorista de aplicativo brasileiro: ${JSON.stringify(stats)}. 
          Os valores estão em Reais (BRL). 
          Forneça 3 dicas curtas, práticas e diretas para melhorar a rentabilidade ou reduzir gastos específicos.`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título curto da dica (máx 30 caracteres)." },
              advice: { type: Type.STRING, description: "Explicação prática e direta (máx 150 caracteres)." }
            },
            required: ["title", "advice"],
            propertyOrdering: ["title", "advice"]
          }
        }
      }
    });

    const text = response.text?.trim();
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Financial Error:", error);
    return [];
  }
};

export const auditFinancials = async (inputData: any, calculatedResults: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{ 
          text: `Você é um auditor financeiro para motoristas de aplicativo. 
          Dados de entrada: ${JSON.stringify(inputData)}
          Resultados calculados pelo sistema: ${JSON.stringify(calculatedResults)}
          
          Sua tarefa:
          1. Verifique se as reservas de combustível e manutenção condizem com a quilometragem e consumo.
          2. Verifique se a meta de sobrevivência e custos fixos estão sendo amortizados corretamente.
          3. Identifique discrepâncias matemáticas.
          4. Se encontrar erro, retorne os valores corrigidos para 'amortizationFund' e 'reservasAtuais'.
          
          Retorne apenas o JSON com as correções sugeridas ou um objeto vazio se estiver tudo correto.` 
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasDiscrepancy: { type: Type.BOOLEAN },
            suggestedAdjustments: {
              type: Type.OBJECT,
              properties: {
                amortizationFund: { type: Type.NUMBER },
                reservasAtuais: {
                  type: Type.OBJECT,
                  properties: {
                    combustivel: { type: Type.NUMBER },
                    manutencao: { type: Type.NUMBER },
                    metaSobrevivencia: { type: Type.NUMBER },
                    amortization: { type: Type.NUMBER }
                  }
                }
              }
            },
            reason: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text?.trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Audit Error:", error);
    return null;
  }
};
