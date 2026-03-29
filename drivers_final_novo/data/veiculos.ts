
export const VEICULOS_DATA: Record<string, any> = {
  "fiat": {
    "argo": {
      "2022/2023": {
        "1.0 Firefly": {
          "items": [
            { "item": "Troca de Óleo (0W20) e Filtro", "intervalKm": 10000, "estimatedValue": 350, "alarmBeforeKm": 1000 },
            { "item": "Filtro de Combustível", "intervalKm": 10000, "estimatedValue": 65, "alarmBeforeKm": 500 },
            { "item": "Filtro de Ar do Motor", "intervalKm": 20000, "estimatedValue": 85, "alarmBeforeKm": 1000 },
            { "item": "Velas de Ignição", "intervalKm": 40000, "estimatedValue": 220, "alarmBeforeKm": 2000 }
          ],
          "tankCapacity": 47,
          "estimatedKmL": 13.5
        },
        "1.3 Firefly": {
          "items": [
            { "item": "Troca de Óleo (0W20) e Filtro", "intervalKm": 10000, "estimatedValue": 380, "alarmBeforeKm": 1000 },
            { "item": "Filtro de Ar e Combustível", "intervalKm": 15000, "estimatedValue": 150, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 47,
          "estimatedKmL": 12.8
        }
      }
    },
    "mobi": {
      "2022/2023": {
        "1.0 Fire": {
          "items": [
            { "item": "Óleo 5W30 e Filtro", "intervalKm": 10000, "estimatedValue": 280, "alarmBeforeKm": 1000 },
            { "item": "Filtro de Combustível", "intervalKm": 10000, "estimatedValue": 55, "alarmBeforeKm": 500 }
          ],
          "tankCapacity": 47,
          "estimatedKmL": 14.2
        }
      }
    }
  },
  "volkswagen": {
    "polo": {
      "2023/2024": {
        "1.0 MPI": {
          "items": [
            { "item": "Óleo 5W40 VW508 e Filtro", "intervalKm": 10000, "estimatedValue": 420, "alarmBeforeKm": 1000 },
            { "item": "Filtro de Ar e Cabine", "intervalKm": 20000, "estimatedValue": 180, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 52,
          "estimatedKmL": 13.8
        },
        "1.0 TSI (Turbo)": {
          "items": [
            { "item": "Óleo Sintético 5W40 e Filtro", "intervalKm": 10000, "estimatedValue": 480, "alarmBeforeKm": 1000 },
            { "item": "Velas de Iridium", "intervalKm": 40000, "estimatedValue": 550, "alarmBeforeKm": 2000 }
          ],
          "tankCapacity": 52,
          "estimatedKmL": 12.1
        }
      }
    },
    "gol": {
      "2021/2022": {
        "1.0 MPI": {
          "items": [
            { "item": "Óleo 5W40 e Filtro", "intervalKm": 10000, "estimatedValue": 320, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 55,
          "estimatedKmL": 13.3
        }
      }
    }
  },
  "chevrolet": {
    "onix": {
      "2023/2024": {
        "1.0 Aspirado": {
          "items": [
            { "item": "Óleo 5W30 Dexos1 e Filtro", "intervalKm": 10000, "estimatedValue": 360, "alarmBeforeKm": 1000 },
            { "item": "Filtro de Ar Condicionado", "intervalKm": 15000, "estimatedValue": 90, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 44,
          "estimatedKmL": 13.9
        },
        "1.0 Turbo": {
          "items": [
            { "item": "Óleo 5W30 Dexos1 e Filtro", "intervalKm": 10000, "estimatedValue": 390, "alarmBeforeKm": 1000 },
            { "item": "Correia Banhada a Óleo", "intervalKm": 120000, "estimatedValue": 1800, "alarmBeforeKm": 10000 }
          ],
          "tankCapacity": 44,
          "estimatedKmL": 11.8
        }
      }
    }
  },
  "hyundai": {
    "hb20": {
      "2023/2024": {
        "1.0 Aspirado": {
          "items": [
            { "item": "Óleo 5W30 e Filtro", "intervalKm": 10000, "estimatedValue": 410, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 50,
          "estimatedKmL": 13.2
        },
        "1.0 TGDI (Turbo)": {
          "items": [
            { "item": "Óleo Sintético e Filtro", "intervalKm": 10000, "estimatedValue": 450, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 50,
          "estimatedKmL": 12.2
        }
      }
    }
  },
  "toyota": {
    "corolla": {
      "2022/2023": {
        "2.0 Dynamic Force": {
          "items": [
            { "item": "Óleo 0W20 e Filtro", "intervalKm": 10000, "estimatedValue": 520, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 50,
          "estimatedKmL": 11.5
        }
      }
    },
    "yaris": {
      "2022/2023": {
        "1.5 Flex": {
          "items": [
            { "item": "Óleo 0W20 e Filtro", "intervalKm": 10000, "estimatedValue": 440, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 45,
          "estimatedKmL": 12.9
        }
      }
    }
  },
  "honda": {
    "city": {
      "2022/2023": {
        "1.5 i-VTEC": {
          "items": [
            { "item": "Óleo 0W20 e Filtro", "intervalKm": 10000, "estimatedValue": 480, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 44,
          "estimatedKmL": 13.1
        }
      }
    }
  },
  "nissan": {
    "versa": {
      "2022/2023": {
        "1.6 16V": {
          "items": [
            { "item": "Óleo 5W30 e Filtro", "intervalKm": 10000, "estimatedValue": 410, "alarmBeforeKm": 1000 }
          ],
          "tankCapacity": 41,
          "estimatedKmL": 12.5
        }
      }
    }
  }
};
