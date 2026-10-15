import { 
  Estudante, 
  AuthorizedUser, 
  CurriculumMatrix, 
  CurriculumSkill, 
  PerfilPedagogico, 
  EscolaConfig,
  ActivityContextValidation,
  HabilidadeAprovada
} from '../types';

/**
 * Serviço Central: pedagogicalContextService (Seções 17, 18, 19, 20)
 * Monta o contexto curricular e pedagógico rigorosamente validado antes da geração de atividades adaptadas.
 * Cruzamento das bases: estudante + turma + série + disciplina + matriz + habilidade + perfil pedagógico.
 */
export function buildActivityContext(params: {
  studentId: string;
  teacherId?: string;
  subject: string;
  skillId?: string;
  content: string;
  questionCount: number;
  questionTypes: string[];
  teacherObservation?: string;
  students: Estudante[];
  teachers: AuthorizedUser[];
  matrices: CurriculumMatrix[];
  skills: CurriculumSkill[];
  habilidadesLegadas?: HabilidadeAprovada[];
  profiles: PerfilPedagogico[];
  schoolConfig: EscolaConfig;
}): ActivityContextValidation {
  const {
    studentId,
    teacherId,
    subject,
    skillId,
    content,
    questionCount,
    questionTypes,
    students,
    teachers,
    matrices,
    skills,
    habilidadesLegadas = [],
    profiles,
    schoolConfig,
  } = params;

  const missingFields: string[] = [];
  const alerts: string[] = [];

  // 1. Localiza o Estudante
  const student = students.find(s => s.id === studentId);
  if (!student) {
    throw new Error('Estudante não localizado na base escolar.');
  }

  if (student.situacao === 'arquivado') {
    alerts.push('Atenção: O estudante está marcado como arquivado/inativo.');
  }

  // 2. Extrai Série e Turma
  const gradeName = student.anoSerie || student.turma?.split(' ')[0] || 'Série não identificada';
  const className = student.turma || 'Turma não atribuída';

  if (!student.anoSerie && !student.turma) {
    missingFields.push('Série ou turma do estudante não definida.');
  }

  // 3. Valida Professor
  if (teacherId) {
    const teacher = teachers.find(t => t.id === teacherId || t.uid === teacherId);
    if (teacher && !teacher.active) {
      alerts.push(`O professor ${teacher.name} está inativo.`);
    }
  }

  // 4. Valida Disciplina
  if (!subject || subject.trim() === '') {
    missingFields.push('Disciplina curricular obrigatória.');
  }

  // 5. Valida Conteúdo
  if (!content || content.trim() === '') {
    missingFields.push('Tema ou conteúdo da atividade obrigatório.');
  }

  // 6. Localiza e Valida Matriz Curricular
  const matrix = matrices.find(m => 
    m.active && 
    m.status === 'approved' &&
    m.subject.toLowerCase() === subject.toLowerCase() &&
    (m.grade.toLowerCase().includes(gradeName.toLowerCase()) || gradeName.toLowerCase().includes(m.grade.toLowerCase()))
  );

  if (!matrix) {
    alerts.push(`Não existe matriz curricular aprovada para ${subject} - ${gradeName}.`);
  }

  // 7. Localiza e Valida Habilidade
  let skill: CurriculumSkill | HabilidadeAprovada | undefined;
  if (skillId) {
    skill = skills.find(s => s.id === skillId || s.skillCode === skillId);
    if (!skill) {
      skill = habilidadesLegadas.find(h => h.id === skillId || h.codigo === skillId);
    }
  }

  if (!skill) {
    missingFields.push('Habilidade curricular aprovada obrigatória para compor a atividade.');
  } else {
    // Validação de correspondência estrita (Seção 18)
    const skillSubject = 'subject' in skill ? skill.subject : skill.disciplina;
    const skillGrade = 'grade' in skill ? skill.grade : skill.serie;

    if (skillSubject.toLowerCase() !== subject.toLowerCase()) {
      alerts.push(`Alerta de integridade: A habilidade ${'skillCode' in skill ? skill.skillCode : skill.codigo} pertence à disciplina ${skillSubject}, divergente de ${subject}.`);
    }

    if (gradeName !== 'Série não identificada' && !skillGrade.toLowerCase().includes(gradeName.toLowerCase()) && !gradeName.toLowerCase().includes(skillGrade.toLowerCase())) {
      alerts.push(`Alerta de integridade: A habilidade pertence a ${skillGrade}, divergente da série ${gradeName} do estudante.`);
    }
  }

  // 8. Localiza e Valida Perfil Pedagógico Autorizado
  const pedagogicalProfile = profiles.find(p => p.estudanteId === student.id || p.id === student.perfilPedagogicoId);
  const appliedStrategies: string[] = [];

  if (pedagogicalProfile) {
    if (pedagogicalProfile.estrategiasRecomendadas) {
      appliedStrategies.push(pedagogicalProfile.estrategiasRecomendadas);
    }
    if (pedagogicalProfile.recursosAcessibilidade) {
      appliedStrategies.push(pedagogicalProfile.recursosAcessibilidade);
    }
    if (pedagogicalProfile.necessidadeApoioVisual) {
      appliedStrategies.push('Apoio com recursos visuais e esquemas');
    }
    if (pedagogicalProfile.necessidadeInstrucoesCurtas) {
      appliedStrategies.push('Enunciados curtos e comandos fracionados');
    }
  } else {
    alerts.push('Estudante não possui perfil pedagógico cadastrado. Serão aplicadas adaptações universais de acessibilidade.');
  }

  const valid = missingFields.length === 0;

  return {
    valid,
    student,
    gradeName,
    className,
    subject,
    matrix,
    skill,
    pedagogicalProfile,
    appliedStrategies,
    questionCount: questionCount || 4,
    questionTypes: questionTypes.length > 0 ? questionTypes : ['multipla_escolha'],
    missingFields,
    alerts,
    canProceed: valid,
  };
}
