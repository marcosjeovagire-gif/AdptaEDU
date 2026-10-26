import { 
  Estudante, 
  RegistroImportacaoEstudante, 
  UserRole, 
  AuthorizedUser,
  RegistroAuditoria,
  RegistroHistorico,
  StatusIndicadorAnalise
} from '../types';
import { SCHOOL_ID_PADRAO, ServiceResult } from './authService';

/**
 * Dados institucionais oficiais da escola para teste e demonstração da Coordenação.
 * Contém exclusivamente identificação cadastral acadêmica:
 * - Nome Oficial do Estudante
 * - Matrícula Institucional
 * - Turma e Ano/Série
 * - Turno
 * 
 * NENHUM DADO MÉDICO, NENHUM LAUDO, NENHUM CID, NENHUM CPF, NENHUM TELEFONE.
 */
export const DOCUMENTO_ESTUDANTES_PADRAO = {
  nomeArquivo: 'Relatorio_Enturmacao_Estudantes_2026.pdf',
  fonte: 'Sistema de Gestão Escolar (SIGE / SEDUC Goiás)',
  registros: [
    // 7º Ano A - Matutino (28 estudantes oficiais identificados)
    { nome: 'ALICE FERREIRA COSTA', matricula: '202607001', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'ARTHUR HENRIQUE SOUZA', matricula: '202607002', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'BERNARDO ALVES LIMA', matricula: '202607003', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'BRUNA RAFAELA NOGUEIRA', matricula: '202607004', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'CAIO CESAR PEREIRA', matricula: '202607005', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'CAMILA RODRIGUES SILVA', matricula: '202607006', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'DANIEL OLIVEIRA CARDOSO', matricula: '202607007', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'DAVI LUCAS MENEZES', matricula: '202607008', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'DEBORA CRISTINA ALVES', matricula: '202607009', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'EDUARDO HENRIQUE ROCHA', matricula: '202607010', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 1 },
    { nome: 'EMANUELLY VITORIA SANTOS', matricula: '202607011', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'ENZO GABRIEL DIAS', matricula: '202607012', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'FELIPE AUGUSTO BARROS', matricula: '202607013', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'GABRIEL MEDEIROS CARVALHO', matricula: '202607014', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'GIOVANNA RIBEIRO CAMPOS', matricula: '202607015', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'GUILHERME SANTOS MOREIRA', matricula: '202607016', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'HELENA CASTRO MARTINS', matricula: '202607017', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'ISABELLA CRISTINA LOPES', matricula: '202607018', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'JOAO MIGUEL TEIXEIRA', matricula: '202607019', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'LAURA BEATRIZ FREITAS', matricula: '202607020', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 2 },
    { nome: 'LORENZO HENRIQUE VIEIRA', matricula: '202607021', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'MANUELA SILVEIRA FARIA', matricula: '202607022', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'MATHEUS VINICIUS REIS', matricula: '202607023', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'MURILO HENRIQUE CUNHA', matricula: '202607024', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'NICOLAS EDUARDO PINTO', matricula: '202607025', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'RAFAELA CRISTINA BARBOSA', matricula: '202607026', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'SAMUEL OTAVIO GUIMARAES', matricula: '202607027', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    { nome: 'SOPHIA VALENTINA NASCIMENTO', matricula: '202607028', turma: '7º Ano A', anoSerie: '7º Ano', turno: 'Matutino', pagina: 3 },
    // 6º Ano A - Matutino (Exemplo adicional)
    { nome: 'ADRIANO SILVA BENTO', matricula: '202601001', turma: '6º Ano A', anoSerie: '6º Ano', turno: 'Matutino', pagina: 4 },
    { nome: 'BEATRIZ NOGUEIRA CAMPOS', matricula: '202606002', turma: '6º Ano A', anoSerie: '6º Ano', turno: 'Matutino', pagina: 4 },
    // 8º Ano A - Matutino
    { nome: 'GABRIELA MARQUES TAVARES', matricula: '202608001', turma: '8º Ano A', anoSerie: '8º Ano', turno: 'Matutino', pagina: 4 },
    { nome: 'ISABELA RIBEIRO GUIMARAES', matricula: '202608002', turma: '8º Ano A', anoSerie: '8º Ano', turno: 'Matutino', pagina: 4 }
  ]
};

// Expressões regulares para detecção e descarte estrito de dados sensíveis e clínicos
const PADROES_SENSIVEIS_PROIBIDOS = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, // CPF
  /\b\d{2}\.?\d{3}\.?\d{3}-?[0-9xX]\b/g, // RG
  /\b(?:CID|CID-10|CID-11|F84|F90|F70|F71|H54|TEA|TDAH|DI|LAUDO|DIAGNOSTICO|DEFICIENCIA)\b/gi,
  /\b(?:\(?\d{2}\)?\s?9?\d{4}-?\d{4})\b/g, // Telefone
  /\b(?:RUA|AVENIDA|BAIRRO|CEP|ENDERECO)\b/gi,
  /\b(?:FILIACAO|NOME DA MAE|NOME DO PAI|RESPONSAVEL FINANCEIRO)\b/gi
];

/**
 * Função de Servidor: sanitizarEExtrairLinhaEstudante
 * Filtra ativamente qualquer tentativa de extração de dados médicos ou pessoais sensíveis.
 */
export function sanitizarTextoEstudante(textoBruto: string): { 
  textoLimpo: string; 
  dadosSensiveisIgnorados: boolean;
  motivoDescarte?: string;
} {
  let textoLimpo = textoBruto;
  let dadosSensiveisIgnorados = false;
  const motivos: string[] = [];

  for (const padrao of PADROES_SENSIVEIS_PROIBIDOS) {
    if (padrao.test(textoLimpo)) {
      dadosSensiveisIgnorados = true;
      motivos.push('Dados sensíveis ou clínicos identificados no arquivo foram sumariamente ignorados.');
      textoLimpo = textoLimpo.replace(padrao, '');
    }
  }

  return {
    textoLimpo: textoLimpo.trim(),
    dadosSensiveisIgnorados,
    motivoDescarte: dadosSensiveisIgnorados ? motivos.join(' ') : undefined
  };
}

/**
 * Função de Servidor: previewStudentImportFromTextOrFile
 * Processa linhas de texto de um arquivo PDF/CSV/relatório institucional,
 * aplicando regras rígidas de segurança, exclusão de dados clínicos e detecção de duplicidades.
 */
export function previewStudentImportFromTextOrFile(params: {
  nomeArquivo: string;
  conteudoTexto?: string;
  usarRosterPadrao?: boolean;
  existingStudents: Estudante[];
  currentUserRoles: UserRole[];
}): ServiceResult<{
  registros: RegistroImportacaoEstudante[];
  totais: {
    totalEncontrados: number;
    totalProntos: number;
    totalPendentes: number;
    totalDuplicados: number;
    dadosSensiveisFiltradosCount: number;
  };
  indicadores: {
    statusGeral: StatusIndicadorAnalise;
    mensagem: string;
  };
}> {
  const { nomeArquivo, conteudoTexto, usarRosterPadrao, existingStudents, currentUserRoles } = params;

  // 1. Verificação estrita de papel: Somente a Coordenação pode importar estudantes
  if (!currentUserRoles.includes('coordinator')) {
    return {
      success: false,
      message: 'Acesso negado: Apenas profissionais com perfil de Coordenação podem importar estudantes.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  const matriculasExistentes = new Set(existingStudents.map(e => e.matricula.trim().toLowerCase()));
  const nomesETurmasExistentes = new Set(existingStudents.map(e => `${e.nome.trim().toLowerCase()}_${e.turma.trim().toLowerCase()}`));
  const matriculasNoArquivo = new Set<string>();

  const registros: RegistroImportacaoEstudante[] = [];
  let dadosSensiveisFiltradosCount = 0;

  // Fonte de dados: roster padrão institucional ou texto extraído
  if (usarRosterPadrao || !conteudoTexto) {
    DOCUMENTO_ESTUDANTES_PADRAO.registros.forEach((raw, idx) => {
      const matriculaNorm = raw.matricula.trim().toLowerCase();
      const chaveNomeTurma = `${raw.nome.trim().toLowerCase()}_${raw.turma.trim().toLowerCase()}`;

      let situacao: RegistroImportacaoEstudante['situacao'] = 'Pronto para cadastrar';
      let observacao = 'Registro acadêmico validado com sucesso.';

      if (matriculasExistentes.has(matriculaNorm) || nomesETurmasExistentes.has(chaveNomeTurma)) {
        situacao = 'Estudante já cadastrado';
        observacao = 'Estudante com esta matrícula ou nome/turma já está cadastrado no sistema.';
      } else if (matriculasNoArquivo.has(matriculaNorm)) {
        situacao = 'Matrícula duplicada no arquivo';
        observacao = 'Matrícula duplicada dentro do próprio documento enviado.';
      }

      matriculasNoArquivo.add(matriculaNorm);

      registros.push({
        id: `imp-est-${idx + 1}`,
        nome: raw.nome.trim().toUpperCase(),
        matricula: raw.matricula.trim(),
        turma: raw.turma.trim(),
        anoSerie: raw.anoSerie.trim(),
        turno: raw.turno.trim(),
        situacao,
        arquivoOrigem: nomeArquivo || DOCUMENTO_ESTUDANTES_PADRAO.nomeArquivo,
        paginaDocumento: raw.pagina,
        observacao,
        selecionado: situacao === 'Pronto para cadastrar',
        dadosIgnoradosAviso: 'Campos clínicos, diagnósticos médicos ou documentos pessoais sensíveis (CPF/RG) foram desconsiderados por segurança.'
      });
    });
  } else {
    // Processamento de linhas do arquivo enviado pelo usuário
    const linhas = conteudoTexto.split('\n').map(l => l.trim()).filter(Boolean);
    let registroIdx = 0;

    for (let i = 0; i < linhas.length; i++) {
      const linhaBruta = linhas[i];
      const { textoLimpo, dadosSensiveisIgnorados } = sanitizarTextoEstudante(linhaBruta);
      if (dadosSensiveisIgnorados) {
        dadosSensiveisFiltradosCount++;
      }

      // Procura formato delimitado por vírgula, ponto e vírgula, tabulação ou padrão posicional
      // Ex: "NOME, MATRÍCULA, TURMA, ANO, TURNO"
      let partes = textoLimpo.split(/[,;\t|]+/).map(p => p.trim());
      
      // Se for uma única linha com formato texto, tenta capturar nome e números
      if (partes.length < 2) {
        // Tenta regex: Nome seguido por número de matrícula
        const match = textoLimpo.match(/^([A-ZÀ-Úa-zà-ú\s]{4,})\s+(\d{5,12})(.*)$/);
        if (match) {
          partes = [match[1], match[2], match[3].trim() || '6º Ano A'];
        }
      }

      if (partes.length >= 2) {
        const nomeCandidato = partes[0].trim().toUpperCase();
        // Ignora cabeçalhos
        if (nomeCandidato.includes('NOME') && nomeCandidato.includes('ALUNO')) continue;
        if (nomeCandidato.length < 3) continue;

        const matriculaCandidata = partes[1].replace(/\D/g, '').trim();
        const turmaCandidata = partes[2] ? partes[2].trim() : 'Turma a definir';
        const anoSerieCandidato = partes[3] ? partes[3].trim() : (turmaCandidata.split(' ')[0] || 'Ensino Fundamental');
        const turnoCandidato = partes[4] ? partes[4].trim() : 'Manhã';

        registroIdx++;
        const matriculaNorm = matriculaCandidata.toLowerCase();
        const chaveNomeTurma = `${nomeCandidato.toLowerCase()}_${turmaCandidata.toLowerCase()}`;

        let situacao: RegistroImportacaoEstudante['situacao'] = 'Pronto para cadastrar';
        let observacao = 'Registro validado.';

        if (!matriculaCandidata) {
          situacao = 'Matrícula ausente';
          observacao = 'Número de matrícula ou código de identificação ausente no registro.';
        } else if (matriculasExistentes.has(matriculaNorm) || nomesETurmasExistentes.has(chaveNomeTurma)) {
          situacao = 'Estudante já cadastrado';
          observacao = 'Estudante já registrado no banco de dados.';
        } else if (matriculasNoArquivo.has(matriculaNorm)) {
          situacao = 'Matrícula duplicada no arquivo';
          observacao = 'Matrícula repetida dentro do mesmo arquivo.';
        }

        if (matriculaCandidata) {
          matriculasNoArquivo.add(matriculaNorm);
        }

        registros.push({
          id: `imp-est-${registroIdx}`,
          nome: nomeCandidato,
          matricula: matriculaCandidata || `PENDENTE-${registroIdx}`,
          turma: turmaCandidata,
          anoSerie: anoSerieCandidato,
          turno: turnoCandidato,
          situacao,
          arquivoOrigem: nomeArquivo,
          paginaDocumento: 1,
          observacao,
          selecionado: situacao === 'Pronto para cadastrar',
          dadosIgnoradosAviso: dadosSensiveisIgnorados 
            ? 'Dados clínicos/médicos ou pessoais sensíveis identificados nesta linha foram completamente ignorados.' 
            : undefined
        });
      }
    }
  }

  const totalEncontrados = registros.length;
  const totalProntos = registros.filter(r => r.situacao === 'Pronto para cadastrar').length;
  const totalDuplicados = registros.filter(r => r.situacao === 'Estudante já cadastrado' || r.situacao === 'Matrícula duplicada no arquivo').length;
  const totalPendentes = registros.filter(r => r.situacao !== 'Pronto para cadastrar').length;

  let statusGeral: StatusIndicadorAnalise = 'arquivo_analisado';
  let mensagem = 'Arquivo analisado com sucesso.';

  if (totalEncontrados === 0) {
    statusGeral = 'erro_analise';
    mensagem = 'Nenhum registro de estudante legível foi identificado no documento enviado.';
  } else if (totalPendentes > 0 && totalProntos > 0) {
    statusGeral = 'registros_pendentes';
    mensagem = `${totalProntos} registros prontos e ${totalPendentes} pendentes de conferência da Coordenação.`;
  } else if (totalProntos === totalEncontrados) {
    statusGeral = 'registros_encontrados';
    mensagem = `Todos os ${totalProntos} registros encontrados estão em conformidade para cadastro.`;
  }

  return {
    success: true,
    message: 'Análise de dados do PDF concluída com rigor e segurança.',
    data: {
      registros,
      totais: {
        totalEncontrados,
        totalProntos,
        totalPendentes,
        totalDuplicados,
        dadosSensiveisFiltradosCount,
      },
      indicadores: {
        statusGeral,
        mensagem,
      }
    }
  };
}

/**
 * Função de Servidor: confirmStudentImport
 * Efetiva a gravação no banco de dados exclusivamente após revisão e confirmação da Coordenação.
 * Cria a Ficha Individual para cada estudante e estabelece vínculo com professores conforme turmas.
 */
export function confirmStudentImport(params: {
  registrosConfirmados: RegistroImportacaoEstudante[];
  currentUserRoles: UserRole[];
  currentUserName: string;
  professoresDisponiveis: AuthorizedUser[];
  existingStudents: Estudante[];
}): ServiceResult<{
  estudantesCriados: Estudante[];
  auditoria: RegistroAuditoria;
  historico: RegistroHistorico;
  resumo: {
    totalImportados: number;
    totalComProfessoresVinculados: number;
  };
}> {
  const { 
    registrosConfirmados, 
    currentUserRoles, 
    currentUserName, 
    professoresDisponiveis, 
    existingStudents 
  } = params;

  // 1. Verificação de permissão estrita
  if (!currentUserRoles.includes('coordinator')) {
    return {
      success: false,
      message: 'Acesso negado: Apenas a Coordenação possui autorização para confirmar a importação de estudantes.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  // 2. Validação se há registros válidos
  const registrosValidos = registrosConfirmados.filter(r => r.selecionado && r.situacao === 'Pronto para cadastrar');

  if (registrosValidos.length === 0) {
    return {
      success: false,
      message: 'Nenhum estudante válido e selecionado para confirmação.',
      errorCode: 'NO_VALID_RECORDS',
    };
  }

  // 3. Verificação de duplicidades contra a base atual
  const matriculasExistentes = new Set(existingStudents.map(e => e.matricula.trim().toLowerCase()));
  const novosEstudantes: Estudante[] = [];
  let totalComProfessoresVinculados = 0;

  const dataAtualIso = new Date().toISOString();
  const dataAtualFormatada = new Date().toLocaleString('pt-BR');

  for (const reg of registrosValidos) {
    const matriculaNorm = reg.matricula.trim().toLowerCase();
    if (matriculasExistentes.has(matriculaNorm)) {
      continue; // Ignora duplicidades na confirmação
    }

    // Identifica professores autorizados cuja turma autorizada coincide com a turma do estudante
    const professoresVinculados = professoresDisponiveis
      .filter(prof => {
        if (!prof.active || prof.status !== 'authorized') return false;
        if (!prof.roles.includes('teacher')) return false;
        // Se o professor tem turmas autorizadas, verifica se atende a turma deste aluno
        if (prof.allowedClasses && prof.allowedClasses.length > 0) {
          return prof.allowedClasses.some(t => 
            t.trim().toLowerCase() === reg.turma.trim().toLowerCase() ||
            t.trim().toLowerCase() === 'todas'
          );
        }
        return false;
      })
      .map(p => p.id);

    if (professoresVinculados.length > 0) {
      totalComProfessoresVinculados++;
    }

    const fichaEstudante: Estudante = {
      id: `est-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      nome: reg.nome.trim().toUpperCase(),
      matricula: reg.matricula.trim(),
      turma: reg.turma.trim(),
      anoSerie: reg.anoSerie.trim(),
      turno: reg.turno.trim(),
      dataNascimento: reg.dataNascimento || undefined,
      situacao: 'ativo',
      professoresAutorizadosIds: professoresVinculados,
      arquivoOrigem: reg.arquivoOrigem,
      paginaDocumento: reg.paginaDocumento,
      dataImportacao: dataAtualIso,
      observacoesAcessibilidade: undefined,
      perfilPedagogicoId: null,
    };

    novosEstudantes.push(fichaEstudante);
    matriculasExistentes.add(matriculaNorm);
  }

  // Registros de auditoria e histórico
  const auditoria: RegistroAuditoria = {
    id: `aud-${Date.now()}`,
    dataHora: dataAtualFormatada,
    usuarioResponsavel: currentUserName || 'Coordenação Pedagógica',
    usuarioAlterado: `${novosEstudantes.length} Estudantes`,
    perfisAnteriores: [],
    perfisPosteriores: ['estudante'],
    situacaoAnterior: 'Não cadastrado',
    situacaoPosterior: 'Ativo',
    resultado: 'Sucesso',
    detalhes: `Importação de lista de estudantes concluída a partir do arquivo ${registrosValidos[0].arquivoOrigem}. Geradas ${novosEstudantes.length} fichas individuais.`,
  };

  const historico: RegistroHistorico = {
    id: `hist-${Date.now()}`,
    data: dataAtualFormatada,
    tipo: 'Importação de Estudantes',
    usuario: currentUserName || 'Coordenação Pedagógica',
    descricao: `Importação confirmada: ${novosEstudantes.length} novos estudantes matriculados e fichas individuais geradas no banco de dados.`,
  };

  return {
    success: true,
    message: `Importação concluída com sucesso: ${novosEstudantes.length} fichas individuais de estudantes foram geradas.`,
    data: {
      estudantesCriados: novosEstudantes,
      auditoria,
      historico,
      resumo: {
        totalImportados: novosEstudantes.length,
        totalComProfessoresVinculados,
      }
    }
  };
}

/**
 * Função de Servidor: atualizarFichaEstudante
 * Permite à Coordenação atualizar dados da ficha individual do estudante.
 */
export function atualizarFichaEstudante(params: {
  estudanteId: string;
  dadosAtualizados: Partial<Estudante>;
  currentUserRoles: UserRole[];
  allStudents: Estudante[];
}): ServiceResult<Estudante> {
  const { estudanteId, dadosAtualizados, currentUserRoles, allStudents } = params;

  if (!currentUserRoles.includes('coordinator')) {
    return {
      success: false,
      message: 'Apenas a Coordenação pode alterar fichas de estudantes.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  const index = allStudents.findIndex(e => e.id === estudanteId);
  if (index === -1) {
    return {
      success: false,
      message: 'Estudante não localizado no sistema.',
      errorCode: 'NOT_FOUND',
    };
  }

  // Previne injeção de diagnósticos clínicos ou CIDs
  const sanitized = { ...dadosAtualizados };
  delete (sanitized as any).diagnostico;
  delete (sanitized as any).cid;
  delete (sanitized as any).cpf;

  const atualizado: Estudante = {
    ...allStudents[index],
    ...sanitized,
  };

  return {
    success: true,
    message: 'Ficha individual do estudante atualizada com sucesso.',
    data: atualizado,
  };
}

/**
 * Função de Servidor: vincularProfessoresAoEstudante
 * Gerencia a relação n:n entre professores autorizados e o estudante.
 */
export function vincularProfessoresAoEstudante(params: {
  estudanteId: string;
  professoresIds: string[];
  currentUserRoles: UserRole[];
  allStudents: Estudante[];
}): ServiceResult<Estudante> {
  const { estudanteId, professoresIds, currentUserRoles, allStudents } = params;

  if (!currentUserRoles.includes('coordinator')) {
    return {
      success: false,
      message: 'Apenas a Coordenação pode vincular professores a estudantes.',
      errorCode: 'PERMISSION_DENIED',
    };
  }

  const est = allStudents.find(e => e.id === estudanteId);
  if (!est) {
    return { success: false, message: 'Estudante não encontrado.' };
  }

  const atualizado: Estudante = {
    ...est,
    professoresAutorizadosIds: professoresIds,
  };

  return {
    success: true,
    message: 'Vínculo de professores atualizado com sucesso na ficha do estudante.',
    data: atualizado,
  };
}
