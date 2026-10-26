# AdaptaEdu Escolar - Prompt de Arquitetura Completa

Para recriar o aplicativo AdaptaEdu Escolar no GitHub Copilot ou em qualquer outra IA (como o Copilot Chat), você pode utilizar o prompt detalhado abaixo em inglês dos EUA (US English), projetado com precisão cirúrgica para que a IA gere a arquitetura completa do sistema.

## Prompt para Copiar e Colar (US English)

```plaintext
Act as a Principal Full-Stack Software Architect and Educational Technology Expert specializing in inclusive special education systems (SEDUC-GO standards). 

Your task is to build and generate the complete, production-ready web application named "AdaptaEdu Escolar" (Colégio Estadual Olynto Pereira de Castro). 

Here are the exact requirements and architecture:

1. TECH STACK & ARCHITECTURE:
- Frontend: React 19, TypeScript (strict mode), Tailwind CSS v4, Lucide React icons, Recharts for analytics dashboards, and jsPDF + html2canvas for certified A4 PDF generation.
- Backend: Node.js, Express, @google/genai (Gemini API SDK integration for pedagogical synthesis and customized activity generation).
- Storage & Sync: Offline-first architecture with IndexedDB caching, Cloud Firestore real-time listeners, and automated Google Drive synchronization for official educational documents and daily support logs.

2. CORE MODULES & WORKFLOWS:
- Secure Authentication & RBAC (Role-Based Access Control): Institutional login tailored for Coordination, Regular/AEE Teachers, and School Support Professionals (Profissional de Apoio Escolar) with strict email domain validation.
- DashboardView & Analytics: Interactive metrics, real-time charts using Recharts (activity completion rates, engagement levels, curriculum coverage), date range filters (defaulting to current month), and classroom/grade grouping with instant PDF report exports.
- Pedagogical Activity Generator: Integrates 3 mandatory sources (SEDUC-GO 2026 Curriculum Matrices, Teacher lesson plans, and Support Professional daily mediation logs). Features strict "Letra Bastão" visual rendering (Lexend font, uppercase, wide letter spacing) and bespoke SVG pedagogical illustrations for special education students (TEA, intellectual disability, motor barriers).
- Support Professional Daily Log (Diário de Bordo): Daily records of mediation, autonomy levels, and behavioral observations that directly calibrate subsequent adapted activities.
- Official PEI (Plano Educacional Individualizado): Conforming to SIAP/SEDUC-GO standards.

3. DELIVERABLES:
Generate the fully structured single-file or multi-file project code including server.ts, package.json, TypeScript types, Tailwind configuration, and core React components (LoginView, ProfessorView, CoordenacaoView, ProfissionalApoioView, DashboardView, A4SheetPreview) without mock placeholders or truncated logic. Ensure clean code, strict typing, and high accessibility (WCAG 2.2).
```

## Instruções de Uso
1. Abra o GitHub Copilot Chat ou seu ambiente de desenvolvimento.
2. Cole o bloco de texto acima.
3. A IA gerará a estrutura modular, serviços de API, regras de segurança e componentes visuais do AdaptaEdu Escolar.
