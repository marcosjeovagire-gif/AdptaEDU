# AdaptaEdu Escolar – Aprimoramento Arquitetural, Dashboard Analítico e Motor Pedagógico Integrado

Plano completo de engenharia e UX/UI para a consolidação do AdaptaEdu Escolar: integração das observações do Profissional de Apoio ao gerador de atividades, renderização visual com Letra Bastão e Lexend, implementação do DashboardView com Recharts (seletor de datas e agrupamento por turma com exportação em PDF), refinamento da autenticação e reforço de segurança e acessibilidade WCAG 2.2.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Confirmadas com o Usuário:**
> - **Intervalo de Datas Padrão no DashboardView**: Inicialização com o **mês atual**, fornecendo seletor flexível para períodos personalizados (bimestre, trimestre ou intervalo customizado via inputs de data) antes da geração do relatório PDF.
> - **Agrupamento por Turma**: Filtro interativo no DashboardView permitindo visualizar e exportar o progresso educacional consolidado por sala de aula ou turma individual, atendendo tanto a coordenação quanto o professor regente.
> - **Integração do Profissional de Apoio**: O diário de bordo e os registros diários de mediação do profissional de apoio alimentam automaticamente o gerador pedagógico, calibrando tempo estimado, suporte visual e adaptações motoras/cognitivas.
> - **Tipografia e Acessibilidade Visual**: Quando indicado no PEI ou selecionado manualmente (`formatoLetra === 'bastao'`), todas as atividades são renderizadas em Caixa Alta (`uppercase`), com a tipografia acessível `Lexend`, espaçamento aprimorado (`tracking-wider`) e pistas visuais contextuais (sem placeholders robóticos).
> - **Tela de Acesso e Autenticação**: Preservação estrita das proporções da identidade visual oficial, cartão com largura calibrada (460px–520px no desktop e 92%–96% no mobile), validação restrita de e-mail institucional e enforcement de menor privilégio.

---

### 1. Visão Geral e Conceito

- **O que faz**: Consolida o ecossistema educacional inclusivo da escola, unindo os três perfis operacionais (Coordenação, Professor e Apoio). Oferece um novo painel analítico (`DashboardView`) com gráficos em tempo real (`recharts`) sobre a conclusão de atividades adaptadas, filtros temporais e por turma, exportação de relatórios em PDF com alta fidelidade gráfica, além de fechar o ciclo pedagógico onde os relatórios do Profissional de Apoio orientam diretamente o gerador de atividades alinhadas à Matriz SEDUC-GO 2026.
- **Público-Alvo**:
  - *Professores Regentes e de AEE*: Acompanhamento rápido do engajamento em sala de aula, geração de atividades com letra bastão e suporte visual sob medida.
  - *Coordenação Pedagógica*: Supervisão do progresso por turma, auditoria de cobertura dos PEIs e emissão de relatórios oficiais para a regional de ensino.
  - *Profissionais de Apoio Escolar*: Registro diário de mediação e autonomia que impacta diretamente na preparação das próximas aulas.
- **Valor Principal**: Elimina a fragmentação de informações entre o apoio e o corpo docente, garante conformidade com as diretrizes da Educação Especial e disponibiliza métricas claras de evolução do estudante com privacidade e segurança de dados.

---

### 2. Experiência do Usuário e Design Visual

#### Fluxos Principais do Usuário

1. **Acesso Seguro e Perfil Autorizado (`LoginView`)**:
   - Card centralizado com proporções estritas: 460px a 520px no desktop e 92% a 96% no celular.
   - Preservação intacta da marca *AdaptaEdu Escolar*, dos logotipos institucionais e do selo *Ambiente Escolar Oficial*.
   - Validação de e-mail institucional normalizado, checagem de autorização prévia pelo banco e feedback claro e humanizado (sem códigos técnicos como `auth/user-not-found`).

2. **Dashboard de Aprendizagem e Engajamento (`DashboardView`)**:
   - Localizado com destaque na área do professor (comutável via abas e cards de visão rápida).
   - **Métricas Visuais com Recharts**:
     - *Gráfico de Barras / Áreas*: Conclusão de atividades adaptadas ao longo do tempo.
     - *Gráfico Radial / Donut*: Nível de engajamento e taxa de autonomia (baseada nos dados do apoio).
     - *Distribuição por Disciplina*: Percentual de atividades alinhadas ao PEI por componente curricular.
   - **Controles de Filtragem e Agrupamento**:
     - *Seletor de Datas*: Atalhos rápidos (Mês Atual [Padrão], Bimestre Letivo, Últimos 30 Dias, Personalizado com `Data Inicial` e `Data Final`).
     - *Filtro por Turma*: Selecionador de sala (`Todas as Turmas`, `6º Ano A`, `7º Ano B`, etc.) que recalcula instantaneamente os gráficos e a lista analítica de estudantes.
   - **Exportação em PDF Detalhado**:
     - Botão de exportação que compila o cabeçalho escolar oficial, sumário executivo, gráficos renderizados e tabela detalhada de estudantes filtrados pelo período e turma selecionados.

3. **Geração de Atividades com Apoio Integrado e Letra Bastão**:
   - Ao selecionar um estudante, o sistema resgata os últimos registros do Profissional de Apoio e o PEI homologado.
   - Caso o estudante possua indicação (TEA, DI, baixa visão ou dificuldade motora) ou haja registro de sobrecarga recente:
     - O gerador pré-configura a modalidade para **Letra Bastão** (`Lexend`, `uppercase`, `tracking-wider`).
     - Inclui imagens e matriz de desenho com pistas concretas, eliminando textos genéricos.
     - Um card informativo exibe: *"Recomendações do Apoio aplicadas: Redução de distratores e tipografia ampliada"*.

#### Identidade Visual e Acessibilidade (WCAG 2.2)

- **Paleta de Cores**: Esmeralda institucional (`emerald-700`, `emerald-600`), ardósia neutra (`slate-900`, `slate-700`, `slate-100`) e toques de suporte (`amber-600` para alertas pedagógicos, `blue-600` para coordenação).
- **Tipografia**: `Lexend` prioritária em todo o módulo de atividades adaptadas e folhas A4, proporcionando espaçamento intra e inter-caracteres ideal para dislexia e TEA.
- **Disciplina Anti-Slop**: Zero pílulas estáticas redundantes; metadados exibidos com separadores tipográficos sutis (`·`, `•`); controles funcionais com estados táteis (`hover`, `focus-visible`, `active`).
- **Responsividade Total**: Layout fluido que se acomoda de 320px até 1920px, transformando tabelas em cards de leitura confortável em telas móveis.

---

### 3. Decisões Técnicas e Arquitetura

- **Decisão 1: Componente Dedicado `DashboardView`**:
  - *Abordagem*: Criar `src/components/professor/DashboardView.tsx` e integrá-lo à navegação do `ProfessorView` e `CoordenacaoView`, utilizando componentes responsivos do `recharts` (`ResponsiveContainer`, `BarChart`, `PieChart`, `XAxis`, `Tooltip`).
  - *Por que*: Centraliza o rastreamento pedagógico em um único módulo de alta performance sem sobrecarregar a tela de criação de atividades.
  
- **Decisão 2: Motor de Exportação PDF Consolidado por Período e Turma**:
  - *Abordagem*: Extensão do serviço de PDF em `src/services/dashboardExportService.ts` utilizando `jspdf` e `html2canvas`, com formatação limpa no padrão da SEDUC-GO (cabeçalho, logo institucional, métricas consolidadas e assinaturas).
  - *Por que*: Permite que professores compartilhem relatórios físicos ou digitais com a coordenação e conselho de classe com paginação correta e sem cortes de layout.

- **Decisão 3: Integração Direta Apoio-Atividade no `activityGenerator.ts` e `peiService.ts`**:
  - *Abordagem*: O helper `buildActivityContext` e a função `gerarAtividadeEstruturada` recebem `registrosApoio` recentes do estudante e extraem necessidades (ex.: nível de cansaço, tempo de foco, suporte para escrita).
  - *Por que*: Fecha a lacuna histórica onde o diário do apoio ficava isolado do planejamento didático do professor.

- **Decisão 4: Fortalecimento da Autenticação e Segurança Firestore**:
  - *Abordagem*: Validação estrita de autorização em `authService.ts` e auditoria das regras de segurança em `firestore.rules`, garantindo que usuários só acessem dados dos estudantes vinculados ao seu papel e escola.

---

### 4. Diagrama de Arquitetura e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ADAPTAEDU ESCOLAR                                       │
│                                                                                        │
│   ┌────────────────────┐     ┌─────────────────────┐     ┌─────────────────────────┐   │
│   │   COORDENAÇÃO      │     │     PROFESSOR       │     │  PROFISSIONAL DE APOIO  │   │
│   │ • Auditoria & PEI  │     │ • Atividades & PEI  │     │ • Diário de Bordo       │   │
│   │ • Visão por Turma  │     │ • Letra Bastão A4   │     │ • Mediação & Rotina     │   │
│   └─────────┬──────────┘     └──────────┬──────────┘     └────────────┬────────────┘   │
└─────────────┼───────────────────────────┼─────────────────────────────┼────────────────┘
              │                           │                             │
              ▼                           ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE ESTADO & SERVIÇOS INTEGRADORES                        │
│                                                                                        │
│   • peiService.ts           ──► formatoLetra ('bastao'|'cursiva') + Diretrizes SEDUC   │
│   • activityGenerator.ts    ──► Integra diário do Apoio + Matriz Curricular 2026       │
│   • dashboardService.ts     ──► Agrupamento por turma + filtros de período             │
│   • authService.ts          ──► Menor privilégio + validação estrita de perfil         │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      DASHBOARDVIEW & MOTOR DE EXPORTAÇÃO PDF                           │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Controles Interativos:                                                         │   │
│   │ [ Intervalo de Datas: Mês Atual | Bimestre | Personalizado ]                   │   │
│   │ [ Filtrar Turma: Todas | 6º Ano A | 7º Ano B | ... ]                           │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                 ┌─────────────────────────┴─────────────────────────┐                  │
│                 ▼                                                   ▼                  │
│   ┌───────────────────────────┐                       ┌────────────────────────────┐   │
│   │   RECHARTS INTERATIVO     │                       │     EXPORTAÇÃO EM PDF      │   │
│   │ • Conclusão de Atividades │                       │ • Cabeçalho Oficial SEDUC  │   │
│   │ • Engajamento por Aluno   │                       │ • Resumo por Sala / Período│   │
│   │ • Cobertura Curricular    │                       │ • Relatório Compartilhável │   │
│   └───────────────────────────┘                       └────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Plano de Execução Detalhado

1. **Desenvolvimento do `DashboardView.tsx`**:
   - Criação do componente em `src/components/professor/DashboardView.tsx`.
   - Adição de gráficos com `recharts` (progresso de conclusão, engajamento médio, distribuição por disciplina).
   - Implementação do seletor de intervalo de datas (com valor default no mês vigente e inputs para data inicial e final).
   - Implementação do seletor/filtro por turma com recálculo dinâmico das métricas e lista analítica de estudantes.

2. **Serviço de Exportação em PDF do Dashboard (`src/services/dashboardExportService.ts`)**:
   - Função `exportarRelatorioProgressoPdf` que recebe os dados filtrados (turma, intervalo de datas e estudantes).
   - Formatação estética e institucional com tabela de desempenho, taxas de conclusão e espaço para parecer pedagógico.

3. **Integração no `ProfessorView.tsx`**:
   - Adicionar a aba/visão `'dashboard'` no fluxo principal do professor para alternar rapidamente entre o Dashboard Analítico, a Lista de Atividades e a Geração de Novas Folhas A4.
   - Disponibilizar atalho para emissão rápida do relatório para a coordenação.

4. **Integração do Apoio ao Gerador de Atividades (`src/utils/activityGenerator.ts` & `peiService.ts`)**:
   - Conectar as anotações do Profissional de Apoio (`registrosApoio`) aos parâmetros de geração (`ajusteRelatoApoio`), calibrando instruções simples, pausas e suporte visual reforçado.
   - Garantir que a opção `formatoLetra === 'bastao'` aplique `font-['Lexend'] uppercase tracking-wider` na folha e elimine quaisquer placeholders robóticos.

5. **Auditoria da Tela de Login e Segurança (`src/components/LoginView.tsx` & `src/server/authService.ts`)**:
   - Calibrar o tamanho do container (máx 520px no desktop e 94% no mobile).
   - Validar mensagens de retorno para que não exibam strings cruas de erro.
   - Assegurar bloqueio imediato caso o perfil solicitado não coincida com os privilégios cadastrados.

6. **Validação, Performance e Otimizações Realizadas**:
   - Checar compilação com `compile_applet` e análise estática com `lint_applet` (ambos concluídos com 0 erros).
   - **Otimização de Renderização com `React.memo` e `useMemo`**:
     - `ProfessorView.tsx`: Estados derivados (`estudantesAutorizados`, `estudanteSelecionado`, `perfilAutorizado`, `serieEstudante`, `habilidadeSelecionada`, `minhasAtividades`) memoizados com `useMemo`. Componentes `AtividadeMiniCard` e `QuestaoRevisaoItem` memoizados com `React.memo` e handlers estabilizados com `useCallback`.
     - `CoordenacaoView.tsx`: 7 filtros inline de usuários consolidados em um único `metricasUsuarios` O(n). Métricas gerais de estudantes e caches de contagem (`contagemAlunosPorSerie`, `contagemAlunosPorTurma`, `metricasEstudantes`) memoizados com `useMemo`, eliminando chamadas repetidas de `.filter()` dentro dos `<select>` e cards.
     - Linhas da tabela de estudantes de turmas extraídas para o componente dedicado `EstudanteTableRow` memoizado com `React.memo`, com callbacks estabilizadas via `useCallback` (`handleSelecionarFotoEstudante`, `handleVerFichaEstudante`, `handleDispararCriarPei`, `handleAbrirPdiEstudante`, `handleBaixarRelatorioConsolidado`, `handleEditarEstudante`).
   - Garantir acessibilidade WCAG e fluidez mobile-first sem qualquer quebra de funcionalidade escolar ou pedagógica.
