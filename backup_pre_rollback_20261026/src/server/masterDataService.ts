import { 
  Grade, 
  SchoolClass, 
  Estudante, 
  AuthorizedUser, 
  CurriculumMatrix, 
  CurriculumSkill, 
  ManagedFile, 
  DatabaseIntegrityIssue,
  PerfilPedagogico,
  DocumentoImportado
} from '../types';

export const SCHOOL_ID_PADRAO = 'olynto-pereira-castro';

/**
 * Normaliza nomes de turmas para evitar duplicações por espaçamento ou maiúsculas:
 * Ex: "7º ANO A", "7º Ano A", " 7º Ano A " -> "7º Ano A"
 */
export function normalizeClassName(rawName: string): string {
  if (!rawName) return '';
  const cleaned = rawName.trim().replace(/\s+/g, ' ');
  // Preserva padrão como 7º Ano A
  return cleaned
    .replace(/(\d+)\s*[ºo°ª]?\s*ano\s*([a-zA-Z])/i, '$1º Ano $2')
    .replace(/(\d+)\s*[ªa°º]?\s*s[eé]rie\s*([a-zA-Z])/i, '$1ª Série $2');
}

/**
 * Analisa os estudantes existentes e identifica suas turmas e séries
 * Estritamente a partir dos dados do PDF, SEM INVENTAR.
 */
export function analyzeImportedStudentClasses(students: Estudante[]): {
  turmasIdentificadas: {
    nomeNormalizado: string;
    serie: string;
    letra: string;
    turno: string;
    estudantesCount: number;
    estudantesIds: string[];
    nomesEstudantes: string[];
  }[];
  estudantesSemTurma: Estudante[];
  totalIdentificados: number;
} {
  const turmasMap = new Map<string, {
    nomeNormalizado: string;
    serie: string;
    letra: string;
    turno: string;
    estudantesCount: number;
    estudantesIds: string[];
    nomesEstudantes: string[];
  }>();

  const estudantesSemTurma: Estudante[] = [];

  for (const s of students) {
    const rawTurma = s.turma || '';
    if (!rawTurma || rawTurma.trim().toLowerCase() === 'não identificada' || rawTurma.trim().toLowerCase() === 'pendente') {
      estudantesSemTurma.push(s);
      continue;
    }

    const norm = normalizeClassName(rawTurma);
    const parts = norm.split(' ');
    // Ex: "7º", "Ano", "A"
    let serie = s.anoSerie || (parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0]);
    let letra = parts.length >= 3 ? parts[2].toUpperCase() : (parts.length === 2 ? parts[1].toUpperCase() : 'A');
    let turno = s.turno || 'Matutino';

    const existing = turmasMap.get(norm);
    if (existing) {
      existing.estudantesCount += 1;
      existing.estudantesIds.push(s.id);
      existing.nomesEstudantes.push(s.nome);
    } else {
      turmasMap.set(norm, {
        nomeNormalizado: norm,
        serie,
        letra,
        turno,
        estudantesCount: 1,
        estudantesIds: [s.id],
        nomesEstudantes: [s.nome],
      });
    }
  }

  return {
    turmasIdentificadas: Array.from(turmasMap.values()),
    estudantesSemTurma,
    totalIdentificados: students.length - estudantesSemTurma.length,
  };
}

/**
 * Criação formal de turmas e séries baseadas na revisão
 */
export function createClassesFromImport(params: {
  turmasAprovadas: {
    nomeNormalizado: string;
    serie: string;
    letra: string;
    turno: string;
    estudantesIds: string[];
  }[];
  existingClasses: SchoolClass[];
  existingGrades: Grade[];
  students: Estudante[];
}): {
  novasClasses: SchoolClass[];
  novasGrades: Grade[];
  estudantesAtualizados: Estudante[];
  criadasCount: number;
} {
  const { turmasAprovadas, existingClasses, existingGrades, students } = params;
  const classesMap = new Map<string, SchoolClass>(existingClasses.map(c => [c.name.toLowerCase(), c]));
  const gradesMap = new Map<string, Grade>(existingGrades.map(g => [g.name.toLowerCase(), g]));

  const novasGrades: Grade[] = [...existingGrades];
  const novasClasses: SchoolClass[] = [...existingClasses];
  const estudantesMap = new Map<string, Estudante>(students.map(s => [s.id, { ...s }]));

  let criadasCount = 0;

  for (const t of turmasAprovadas) {
    const keyGrade = t.serie.toLowerCase();
    let gradeObj = gradesMap.get(keyGrade);

    if (!gradeObj) {
      gradeObj = {
        id: `grade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        schoolId: SCHOOL_ID_PADRAO,
        name: t.serie,
        educationStage: t.serie.includes('Ensino Médio') || t.serie.includes('Série') ? 'Ensino Médio' : 'Ensino Fundamental II',
        order: novasGrades.length + 1,
        active: true,
      };
      gradesMap.set(keyGrade, gradeObj);
      novasGrades.push(gradeObj);
    }

    const keyClass = t.nomeNormalizado.toLowerCase();
    let classObj = classesMap.get(keyClass);

    if (!classObj) {
      classObj = {
        id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        schoolId: SCHOOL_ID_PADRAO,
        name: t.nomeNormalizado,
        gradeId: gradeObj.id,
        gradeName: gradeObj.name,
        classLetter: t.letra,
        shift: t.turno,
        academicYear: '2026',
        active: true,
        studentIds: [...t.estudantesIds],
        teacherIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      classesMap.set(keyClass, classObj);
      novasClasses.push(classObj);
      criadasCount++;
    } else {
      // Mescla estudantes sem duplicar
      const idsSet = new Set([...classObj.studentIds, ...t.estudantesIds]);
      classObj.studentIds = Array.from(idsSet);
      classObj.updatedAt = new Date().toISOString();
    }

    // Atualiza estudantes vinculados
    for (const sId of t.estudantesIds) {
      const student = estudantesMap.get(sId);
      if (student) {
        student.turma = t.nomeNormalizado;
        student.anoSerie = t.serie;
        student.turno = t.turno;
      }
    }
  }

  return {
    novasClasses,
    novasGrades,
    estudantesAtualizados: Array.from(estudantesMap.values()),
    criadasCount,
  };
}

/**
 * Verificação de Integridade das Bases (Seção 21)
 * Detecta inconsistências reais sem gerar alterações precipitadas
 */
export function verifyDatabaseIntegrity(data: {
  estudantes: Estudante[];
  turmas: SchoolClass[];
  professores: AuthorizedUser[];
  matrizes: CurriculumMatrix[];
  habilidades: CurriculumSkill[];
  perfis: PerfilPedagogico[];
  documentos: DocumentoImportado[];
}): DatabaseIntegrityIssue[] {
  const issues: DatabaseIntegrityIssue[] = [];

  // 1. Estudantes sem turma
  const semTurma = data.estudantes.filter(s => !s.turma || s.turma.trim() === '' || s.turma === 'Não identificada');
  if (semTurma.length > 0) {
    issues.push({
      id: 'issue-est-sem-turma',
      category: 'estudante',
      title: 'Estudantes sem turma atribuída',
      severity: 'alerta',
      count: semTurma.length,
      items: semTurma.slice(0, 10).map(s => ({ id: s.id, label: s.nome, details: `Matrícula: ${s.matricula}` })),
      suggestedAction: 'Reprocessar série e turma a partir do relatório oficial da escola.',
    });
  }

  // 2. Estudantes sem série
  const semSerie = data.estudantes.filter(s => !s.anoSerie || s.anoSerie.trim() === '');
  if (semSerie.length > 0) {
    issues.push({
      id: 'issue-est-sem-serie',
      category: 'estudante',
      title: 'Estudantes sem ano/série definido',
      severity: 'alerta',
      count: semSerie.length,
      items: semSerie.slice(0, 10).map(s => ({ id: s.id, label: s.nome, details: `Turma: ${s.turma || 'Sem turma'}` })),
      suggestedAction: 'Definir série correspondente na ficha do estudante ou criar turmas.',
    });
  }

  // 3. Estudantes sem perfil pedagógico
  const perfisEstudanteIds = new Set(data.perfis.map(p => p.estudanteId));
  const semPerfil = data.estudantes.filter(s => !perfisEstudanteIds.has(s.id) && !s.perfilPedagogicoId);
  if (semPerfil.length > 0) {
    issues.push({
      id: 'issue-est-sem-perfil',
      category: 'estudante',
      title: 'Estudantes sem Perfil Pedagógico cadastrado',
      severity: 'info',
      count: semPerfil.length,
      items: semPerfil.slice(0, 10).map(s => ({ id: s.id, label: s.nome, details: `Turma: ${s.turma}` })),
      suggestedAction: 'Cadastrar perfil pedagógico ou importar PEI do estudante.',
    });
  }

  // 4. Estudantes sem professor autorizado
  const semProf = data.estudantes.filter(s => !s.professoresAutorizadosIds || s.professoresAutorizadosIds.length === 0);
  if (semProf.length > 0) {
    issues.push({
      id: 'issue-est-sem-prof',
      category: 'estudante',
      title: 'Estudantes sem professores autorizados vinculados',
      severity: 'alerta',
      count: semProf.length,
      items: semProf.slice(0, 10).map(s => ({ id: s.id, label: s.nome, details: `Turma: ${s.turma}` })),
      suggestedAction: 'Vincular professores da turma ou disciplina aos estudantes.',
    });
  }

  // 5. Turmas sem professor
  const turmasSemProf = data.turmas.filter(t => !t.teacherIds || t.teacherIds.length === 0);
  if (turmasSemProf.length > 0) {
    issues.push({
      id: 'issue-turma-sem-prof',
      category: 'turma',
      title: 'Turmas sem nenhum professor vinculado',
      severity: 'info',
      count: turmasSemProf.length,
      items: turmasSemProf.map(t => ({ id: t.id, label: t.name, details: `Turno: ${t.shift}` })),
      suggestedAction: 'Vincular professores responsáveis pela turma.',
    });
  }

  // 6. Matrizes sem série definida
  const matrizesSemSerie = data.matrizes.filter(m => !m.grade || m.grade.trim() === '' || m.grade === 'Não identificado');
  if (matrizesSemSerie.length > 0) {
    issues.push({
      id: 'issue-matriz-sem-serie',
      category: 'matriz',
      title: 'Matrizes curriculares sem série identificada',
      severity: 'erro',
      count: matrizesSemSerie.length,
      items: matrizesSemSerie.map(m => ({ id: m.id, label: m.title, details: `Disciplina: ${m.subject}` })),
      suggestedAction: 'Definir a série da matriz para liberar o vínculo com habilidades.',
    });
  }

  // 7. Habilidades sem matriz vinculada
  const matrizIds = new Set(data.matrizes.map(m => m.id));
  const habSemMatriz = data.habilidades.filter(h => !matrizIds.has(h.matrixId));
  if (habSemMatriz.length > 0) {
    issues.push({
      id: 'issue-hab-sem-matriz',
      category: 'habilidade',
      title: 'Habilidades sem matriz curricular correspondente',
      severity: 'erro',
      count: habSemMatriz.length,
      items: habSemMatriz.slice(0, 10).map(h => ({ id: h.id, label: `${h.skillCode} - ${h.subject}`, details: `Série: ${h.grade}` })),
      suggestedAction: 'Associar habilidades a uma matriz aprovada.',
    });
  }

  return issues;
}

/**
 * Arquivos institucionais iniciais gerenciados
 */
export const ARQUIVOS_INICIAIS_GERENCIADOS: ManagedFile[] = [
  {
    id: 'file-professores-pdf',
    schoolId: SCHOOL_ID_PADRAO,
    nomeArquivo: 'Contato dos Professores - Atualizado.pdf',
    categoria: 'Lista de professores',
    dataEnvio: '2026-09-29T08:00:00.000Z',
    enviadoPor: 'Coordenação Pedagógica',
    tamanho: '248.5 KB',
    tipo: 'application/pdf',
    situacao: 'ativo',
    versao: 1,
    versoesAnteriores: [],
    nivelAcesso: 'coordenação',
  },
  {
    id: 'file-matriz-lp-7ano',
    schoolId: SCHOOL_ID_PADRAO,
    nomeArquivo: 'Matriz_Curricular_DCGO_Lingua_Portuguesa_7Ano.pdf',
    categoria: 'Matrizes curriculares',
    serie: '7º Ano',
    dataEnvio: '2026-09-29T08:15:00.000Z',
    enviadoPor: 'Coordenação Pedagógica',
    tamanho: '512.0 KB',
    tipo: 'application/pdf',
    situacao: 'ativo',
    versao: 1,
    versoesAnteriores: [],
    nivelAcesso: 'público_escolar',
  },
  {
    id: 'file-matriz-mat-7ano',
    schoolId: SCHOOL_ID_PADRAO,
    nomeArquivo: 'Matriz_Curricular_DCGO_Matematica_7Ano.pdf',
    categoria: 'Matrizes curriculares',
    serie: '7º Ano',
    dataEnvio: '2026-09-29T08:20:00.000Z',
    enviadoPor: 'Coordenação Pedagógica',
    tamanho: '488.2 KB',
    tipo: 'application/pdf',
    situacao: 'ativo',
    versao: 1,
    versoesAnteriores: [],
    nivelAcesso: 'público_escolar',
  }
];
