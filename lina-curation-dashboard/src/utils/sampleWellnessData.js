/**
 * Dados de exemplo para testar o layout de wellness insights
 * Simula os dados que viriam do Supabase na tabela lina_news
 * 
 * ESTRUTURA ESPERADA:
 * - wellness_data: JSON com insights de wellness
 * - entities_data: JSON com entidades principais e complementares
 * - link: URL direta da fonte
 */

export const sampleWellnessNewsItem = {
  id: 1,
  title: "Vacinas de Herpes e VSR Seriam Aliadas Contra Demência Aponta Estudo",
  link: "https://www1.folha.uol.com.br/equilibrioesaude/2025/08/vacinas-de-herpes-e-vsr-seriam-aliadas-contra-demencia-aponta-estudo.shtml",
  created_at: "2025-08-11T16:01:00Z",
  
  // Dados de wellness estruturados - EXATAMENTE como especificado
  wellness_data: JSON.stringify({
    wellness_focus: {
      topline_summary: "A study from Oxford shows that vaccines for VZV and VSR, featuring the AS01 adjuvant, reduce dementia risk by minimizing amyloid plaques in the brain, advancing preventive health measures for longevity.",
      categoria_wellness: "Longevity Science"
    },
    key_wellness_entities: [
      {
        nome: "AS01 Adjuvante",
        tipo: "Adjuvante Vacinal",
        descricao_wellness: "Componente que potencializa resposta imune",
        relevancia: "Alta - essencial para eficácia das vacinas"
      },
      {
        nome: "VZV Vaccine",
        tipo: "Vacina",
        descricao_wellness: "Previne varicela e herpes zoster",
        relevancia: "Média - uma das doenças-alvo"
      },
      {
        nome: "VSR Vaccine",
        tipo: "Vacina",
        descricao_wellness: "Previne infecções respiratórias",
        relevancia: "Média - uma das doenças-alvo"
      }
    ],
    relevance_market_trends: {
      relevancia_mercado: "This research emphasizes how vaccine adjuvants can extend beyond infection prevention to influence cognitive health and aging.",
      tendencias_observadas: "Immunological interventions are increasingly targeted for neurodegenerative prevention in the wellness sector.",
      impacto_futuro: "Such findings may drive more integrated health tech solutions for anti-aging. Future innovations could personalize vaccines for enhanced longevity outcomes."
    },
    metadata: {
      nivel_relevancia_wellness: "high",
      subsetores_impactados: "Longevity Science, Medical Innovation",
      oportunidades_identificadas: "This opens avenues for investment in adjuvant technologies and vaccine development for brain health. Partnerships in biotechnology could accelerate anti-dementia products"
    }
  }),
  
  // Dados de entidades estruturados - EXATAMENTE como especificado
  entities_data: JSON.stringify({
    entidade_principal: {
      nome: "AS01 Adjuvante",
      o_que_e: "Adjuvante vacinal que estimula resposta imune",
      relevancia_noticia: "Componente chave das vacinas estudadas",
      contexto_essencial: "Tecnologia que potencializa eficácia vacinal"
    },
    entidades_complementares: [
      {
        nome: "Varicela-Zóster",
        o_que_e: "Vírus causador de varicela e herpes zoster",
        papel_noticia: "Uma das doenças-alvo das vacinas estudadas"
      },
      {
        nome: "Universidade de Oxford",
        o_que_e: "Instituição de pesquisa líder mundial",
        papel_noticia: "Responsável pelo estudo sobre vacinas e demência"
      },
      {
        nome: "NPJ Vaccine",
        o_que_e: "Jornal científico especializado em vacinas",
        papel_noticia: "Publicou o estudo sobre vacinas e demência"
      },
      {
        nome: "TriNetx",
        o_que_e: "Plataforma de dados de saúde",
        papel_noticia: "Forneceu dados para análise do estudo"
      },
      {
        nome: "Livia Almeida",
        o_que_e: "Pesquisadora em imunologia",
        papel_noticia: "Autora principal do estudo"
      }
    ],
    resumo_analise: {
      total_entidades_identificadas: "6",
      setor_foco: "Saúde Preventiva",
      tipo_noticia: "Pesquisa Científica"
    }
  }),
  
  // Dados estruturados existentes (mantidos para compatibilidade)
  structured_summary: JSON.stringify({
    motivo_ou_consequencia: "A pesquisa demonstra que vacinas existentes podem ter benefícios inesperados na prevenção de demência, abrindo novas possibilidades para intervenções preventivas em saúde cognitiva.",
    quem: ["AS01 Adjuvante", "Varicela-Zóster", "Universidade de Oxford", "NPJ Vaccine", "TriNetx", "Livia Almeida"],
    resumo_vetorial: "Estudo da Universidade de Oxford revela que vacinas contra herpes e VSR, quando combinadas com o adjuvante AS01, podem reduzir significativamente o risco de demência ao minimizar placas amiloides no cérebro. Esta descoberta representa um avanço importante na medicina preventiva para longevidade, sugerindo que intervenções imunológicas podem ter aplicações mais amplas do que inicialmente previsto."
  })
};

/**
 * Função para gerar dados de teste aleatórios seguindo a estrutura exata
 */
export const generateRandomWellnessData = () => {
  const wellnessCategories = [
    "Longevity Science",
    "Mental Health",
    "Nutrition Science",
    "Fitness Technology",
    "Sleep Optimization",
    "Stress Management"
  ];
  
  const marketTrends = [
    "Growing investment in preventive health technologies",
    "Increasing focus on personalized wellness solutions",
    "Rising demand for evidence-based wellness products",
    "Expansion of digital health platforms",
    "Integration of AI in wellness applications"
  ];
  
  const futureImpacts = [
    "May revolutionize preventive healthcare approaches",
    "Could lead to personalized wellness protocols",
    "Potential to reduce healthcare costs long-term",
    "May accelerate drug discovery processes",
    "Could improve quality of life for aging populations"
  ];
  
  return {
    wellness_focus: {
      topline_summary: "A breakthrough study demonstrates significant improvements in wellness outcomes through innovative intervention strategies.",
      categoria_wellness: wellnessCategories[Math.floor(Math.random() * wellnessCategories.length)]
    },
    key_wellness_entities: [
      {
        nome: "Sample Entity 1",
        tipo: "Type A",
        descricao_wellness: "Description of wellness impact",
        relevancia: "High relevance"
      }
    ],
    relevance_market_trends: {
      relevancia_mercado: marketTrends[Math.floor(Math.random() * marketTrends.length)],
      tendencias_observadas: "Sample trend observation",
      impacto_futuro: futureImpacts[Math.floor(Math.random() * futureImpacts.length)]
    },
    metadata: {
      nivel_relevancia_wellness: "high",
      subsetores_impactados: "Wellness Technology, Health Innovation, Preventive Medicine",
      oportunidades_identificadas: "This creates opportunities for new product development and market expansion in the wellness sector."
    }
  };
};

/**
 * Função para testar se os dados estão no formato correto
 */
export const validateWellnessDataStructure = (data) => {
  try {
    const wellnessData = JSON.parse(data.wellness_data);
    const entitiesData = JSON.parse(data.entities_data);
    
    const requiredFields = {
      wellness_focus: ['topline_summary', 'categoria_wellness'],
      relevance_market_trends: ['relevancia_mercado', 'impacto_futuro'],
      metadata: ['subsetores_impactados', 'oportunidades_identificadas']
    };
    
    const missingFields = [];
    
    Object.entries(requiredFields).forEach(([section, fields]) => {
      fields.forEach(field => {
        if (!wellnessData[section]?.[field]) {
          missingFields.push(`${section}.${field}`);
        }
      });
    });
    
    if (missingFields.length > 0) {
      console.warn('Campos ausentes no wellness_data:', missingFields);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao validar estrutura de dados:', error);
    return false;
  }
}; 