# Parâmetro formatoLetra ('bastao' ou 'cursiva') no peiService.ts e Geração de Atividades

Implementação do parâmetro formal `'formatoLetra'` (`'bastao'` | `'cursiva'`) no serviço pedagógico `peiService.ts` e no gerador de atividades, com detecção inteligente a partir do diagnóstico/laudo do estudante, garantindo fontes legíveis e Caixa Alta (Lexend) em conformidade com as diretrizes da Educação Especial da SEDUC-GO.

## Decisões Confirmadas com o Usuário

> [!IMPORTANT]
> **Definições Adotadas a partir das Respostas:**
> - **Critério de Seleção**: Detecção automática de necessidade de letra bastão a partir de termos-chave do laudo/CID (TEA, deficiência intelectual, motora, paralisia, disgrafia), com possibilidade de override manual pelo professor/coordenador.
> - **Apresentação Visual da Letra Bastão**: Renderização em **Caixa Alta (Uppercase)** utilizando tipografia de alta legibilidade (`Lexend`), maior espaçamento entre letras (`tracking-wide` / `letter-spacing`) e contraste adequado.
> - **Registro Metodológico no PEI**: O formato de letra recomendado será inserido formalmente na **Etapa 2 do SIAP (Metodologias e Recursos)** e na **Área Acadêmica** de todos os componentes curriculares do PEI.

---

## 1. Visão Geral e Conceito

- **O que faz**: Introduz no `peiService.ts` a capacidade de classificar e prescrever o `'formatoLetra'` adequado para o estudante. Essa informação orienta a geração do PEI (SIAP/SEDUC-GO) e é herdada automaticamente por qualquer atividade adaptada gerada para o aluno.
- **Público-Alvo**: Professores regentes, professores de AEE e profissionais de apoio escolar.
- **Valor Principal**: Elimina o risco de gerar atividades em letra cursiva para estudantes com dificuldades motoras ou de decodificação fonológica (como TEA e DI), automatizando a recomendação legal de acessibilidade pedagógica.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos Principais do Usuário

1. **Criação do PEI (`PeiGeneratorModal`)**:
   - Ao selecionar o estudante, o sistema analisa seu laudo médico e pré-seleciona `'formatoLetra'`:
     - Se o laudo contiver indicação para TEA, deficiência intelectual, disgrafia ou atraso motor: seleciona automaticamente **Letra Bastão (Caixa Alta)** com badge explicativo.
     - O professor pode alternar para **Letra Cursiva** caso haja indicação pedagógica contrária.
   - A IA da SEDUC-GO e os fallbacks incluem a diretriz metodológica explícita: `"Uso obrigatório de atividades em LETRA BASTÃO (Caixa Alta com fonte Lexend) para assegurar decodificação sem sobrecarga cognitiva"`.
2. **Geração de Atividades (`ProfessorView` e `activityGenerator`)**:
   - O gerador consulta o PEI e o laudo do estudante.
   - Caso `formatoLetra === 'bastao'`, a atividade é gerada com enunciados e alternativas integralmente em Caixa Alta, fonte `Lexend`, espaçamento aprimorado e ilustrações temáticas da Matriz SEDUC-GO 2026.
3. **Folha A4 Impressa e PDF (`A4SheetPreview` / `atividadeA4PdfService`)**:
   - Aplica classes tipográficas `font-['Lexend'] uppercase tracking-wider` na folha A4 e no documento PDF exportado.

---

## 3. Decisões Técnicas e Arquitetura

- **Detecção Semântica via Helper Reutilizável**: Criação da função `determinarFormatoLetraPorLaudo(laudoOuAluno, overrideManual?)` em `peiService.ts`.
- **Compatibilidade de Tipos**: Extensão dos tipos `PeiDocumento`, `PeiIdentificacao` e `ParametrosGeracaoAtividade` com a propriedade opcional `formatoLetra?: 'bastao' | 'cursiva'`.
- **Padrão de Fallback & IA**: Inclusão da regra no prompt da IA (`gerarSugestaoPeiComIa`) e no gerador determinístico offline (`gerarSugestaoPedagogicaSeducFallback`), garantindo funcionamento mesmo sem conexão com a internet.

---

## 4. Diagrama de Arquitetura e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DADOS DO ESTUDANTE                              │
│                                                                        │
│   • Laudo Médico / CID-10 (TEA, Deficiência Intelectual, Motora)       │
│   • Perfil Pedagógico & Recursos de Acessibilidade                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             peiService.ts: determinarFormatoLetraPorLaudo()            │
│                                                                        │
│   Termos identificados? ──► 'bastao' (Caixa Alta / Lexend)             │
│   Sem contraindicação?  ──► 'cursiva' (ou seleção manual)              │
└──────────────────┬────────────────────────────────┬────────────────────┘
                   │                                │
                   ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       PEI SEDUC-GO (SIAP)            │  │  GERAÇÃO DE ATIVIDADES       │
│                                      │  │  activityGenerator.ts       │
│ • Etapa 2: Metodologias acessíveis   │  │                              │
│   com recomendação de Letra Bastão   │  │ • formatoLetra: 'bastao'     │
│ • Área Acadêmica por disciplina      │  │ • usarCaixaAlta: true        │
│ • Homologação institucional          │  │ • Fonte Lexend + Pistas SVG  │
└──────────────────────────────────────┘  └──────────────┬───────────────┘
                                                         │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │      FOLHA A4 & PDF          │
                                          │ A4SheetPreview & PDF Service │
                                          └──────────────────────────────┘
```

---

## 5. Plano de Implementação por Etapas

1. **Atualização de Tipos (`src/types/index.ts`)**:
   - Adicionar `formatoLetra?: 'bastao' | 'cursiva'` às interfaces `PeiIdentificacao`, `PeiDocumento` e `AtividadeAdaptada`.

2. **Refatoração do `src/services/peiService.ts`**:
   - Implementar `determinarFormatoLetraPorLaudo(laudo: string, override?: 'bastao' | 'cursiva')`.
   - Adicionar o parâmetro `formatoLetra?: 'bastao' | 'cursiva'` em `gerarSugestaoPeiComIa` e atualizar prompts/fallbacks.
   - Adicionar função utilitária `gerarAtividadeAdaptadaPei` integrando o PEI com o gerador de atividades.

3. **Refinamento do `src/utils/activityGenerator.ts`**:
   - Aceitar `formatoLetra?: 'bastao' | 'cursiva'` em `ParametrosGeracaoAtividade`.
   - Garantir que `formatoLetra === 'bastao'` force `usarCaixaAlta = true` e estilo visual apropriado.

4. **Visualização em Folha A4 (`src/components/a4/A4SheetPreview.tsx` e `atividadeA4PdfService.ts`)**:
   - Garantir renderização com tipografia legível (`Lexend`), espaçamento ampliado e textos em caixa alta.

5. **Interface do Modal de Criação do PEI (`PeiGeneratorModal.tsx`)**:
   - Exibir o seletor com badge de auto-detecção `Formato de Letra: Bastão (Recomendado pelo Laudo) / Cursiva`.

6. **Validação Completa**:
   - Executar `lint_applet` e `compile_applet`.
