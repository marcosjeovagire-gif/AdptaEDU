/**
 * Asset oficial da Identidade Institucional
 * Colégio Estadual Olynto Pereira de Castro • SEDUC Goiás • Governo de Goiás
 * Imagem oficial: "Logo Escola 2026 geral com SEDUC - Estado .png"
 */
import React from 'react';

export const OFFICIAL_LOGO_METADATA = {
  originalFileName: 'Logo Escola 2026 geral com SEDUC - Estado .png',
  internalFileName: 'logo-escola-2026.png',
  assetType: 'institutional-logo',
  schoolId: 'olynto-pereira-castro',
  schoolName: 'Colégio Estadual Olynto Pereira de Castro',
  active: true,
  isPrimary: true,
  dimensions: {
    width: 820,
    height: 280,
    aspectRatio: '2.93:1',
  },
  altText: 'Identidade institucional do Colégio Estadual Olynto Pereira de Castro, Secretaria de Estado da Educação e Governo de Goiás',
};

// Componente vetorial nativo que não depende de rede nem de servidor estático
export const OfficialInstitutionalLogoSvg: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style = {} }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 820 280"
      className={className}
      style={{
        display: 'block',
        aspectRatio: '820 / 280',
        objectFit: 'contain',
        ...style,
      }}
      aria-label={OFFICIAL_LOGO_METADATA.altText}
      role="img"
    >
      <defs>
        {/* Padrão de listras amarelas e brancas verticais do colégio */}
        <pattern id="opcYellowStripes" width="16" height="280" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="8" height="280" fill="#F8DF00" />
          <rect x="8" y="0" width="8" height="280" fill="#FFFFFF" />
        </pattern>

        {/* Gradiente dourado das páginas do livro */}
        <linearGradient id="opcBookGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFF240" />
          <stop offset="60%" stop-color="#FCD34D" />
          <stop offset="100%" stop-color="#EAB308" />
        </linearGradient>

        {/* Gradiente da chama eterna do brasão de Goiás */}
        <linearGradient id="goiasFlame" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#DC2626" />
          <stop offset="50%" stop-color="#F97316" />
          <stop offset="100%" stop-color="#FACC15" />
        </linearGradient>

        {/* Clip para o escudo em formato de coração */}
        <clipPath id="goiasShieldClip">
          <path d="M-38,-45 C-38,-65 -15,-65 0,-48 C15,-65 38,-65 38,-45 C38,-10 25,15 0,38 C-25,15 -38,-10 -38,-45 Z" />
        </clipPath>
      </defs>

      {/* Fundo Branco Limpo */}
      <rect width="820" height="280" fill="#FFFFFF" />

      {/* ======================================================================= */}
      {/* 1. IDENTIFICAÇÃO DO COLÉGIO ESTADUAL OLYNTO PEREIRA DE CASTRO (ESQUERDA) */}
      {/* ======================================================================= */}
      <g transform="translate(15, 8)">
        {/* Listras amarelas e brancas em moldura suavemente arredondada */}
        <rect x="0" y="10" width="310" height="235" rx="18" fill="url(#opcYellowStripes)" stroke="#000000" stroke-width="2.5" />

        {/* Círculo central do selo */}
        <circle cx="155" cy="115" r="92" fill="#FFFFFF" stroke="#000000" stroke-width="3" />

        {/* Texto superior arqueado: COLÉGIO ESTADUAL */}
        <path id="svgArcColegio" d="M 78 102 A 80 80 0 0 1 232 102" fill="none" stroke="none" />
        <text font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="15" fill="#000000" letter-spacing="1">
          <textPath href="#svgArcColegio" startOffset="50%" text-anchor="middle">
            COLÉGIO ESTADUAL
          </textPath>
        </text>

        {/* Globo terrestre ao fundo do livro */}
        <g transform="translate(155, 122) scale(0.65)">
          <path d="M-60,-20 Q-30,-60 10,-40 Q50,-50 60,-10 Q70,40 20,60 Q-40,65 -60,20 Z" fill="#4B5563" opacity="0.85" />
          <path d="M-20,-70 Q10,-80 40,-50 Q-10,-30 -20,-70 Z" fill="#4B5563" opacity="0.85" />
          <path d="M-50,20 Q-20,40 -10,75 Q-45,60 -50,20 Z" fill="#4B5563" opacity="0.85" />
          <circle cx="0" cy="0" r="88" fill="none" stroke="#1F2937" stroke-width="3" />
          <ellipse cx="0" cy="0" rx="88" ry="40" fill="none" stroke="#1F2937" stroke-width="1.5" stroke-dasharray="4 2" />
          <line x1="-88" y1="0" x2="88" y2="0" stroke="#1F2937" stroke-width="1.8" />
          <line x1="0" y1="-88" x2="0" y2="88" stroke="#1F2937" stroke-width="1.8" />
        </g>

        {/* Livro aberto dourado radiante */}
        <g transform="translate(155, 128)">
          {/* Páginas esquerdas */}
          <path d="M0,8 C-25,-12 -65,-12 -95,6 C-98,7 -98,32 -95,34 C-65,16 -25,16 0,36 Z" 
                fill="url(#opcBookGold)" stroke="#000000" stroke-width="2.5" />
          <path d="M-85,15 C-60,0 -25,0 0,18" fill="none" stroke="#B45309" stroke-width="1.5" />
          <path d="M-88,23 C-62,7 -25,7 0,26" fill="none" stroke="#B45309" stroke-width="1.5" />

          {/* Páginas direitas */}
          <path d="M0,8 C25,-12 65,-12 95,6 C98,7 98,32 95,34 C65,16 25,16 0,36 Z" 
                fill="url(#opcBookGold)" stroke="#000000" stroke-width="2.5" />
          <path d="M85,15 C60,0 25,0 0,18" fill="none" stroke="#B45309" stroke-width="1.5" />
          <path d="M88,23 C62,7 25,7 0,26" fill="none" stroke="#B45309" stroke-width="1.5" />

          {/* Lombada central */}
          <path d="M0,8 L0,36" stroke="#000000" stroke-width="3" stroke-linecap="round" />
        </g>

        {/* Faixa / Flâmula branca: Olyntho Pereira de Castro */}
        <g transform="translate(155, 185)">
          <path d="M-135,16 L-150,0 L-130,-4 L-128,12 Z" fill="#E5E7EB" stroke="#000000" stroke-width="2" />
          <path d="M135,16 L150,0 L130,-4 L128,12 Z" fill="#E5E7EB" stroke="#000000" stroke-width="2" />

          <path d="M-132,10 C-70,-10 70,-10 132,10 L130,28 C70,8 -70,8 -130,28 Z" 
                fill="#FFFFFF" stroke="#000000" stroke-width="2.5" />
          
          <text x="0" y="19" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-weight="bold" font-size="15" fill="#000000" font-style="italic">
            Olyntho Pereira de Castro
          </text>

          <path d="M-120,29 L-140,36 L-120,41 L-100,32 Z" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
          <path d="M120,29 L140,36 L120,41 L100,32 Z" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
        </g>

        {/* Município: RIO VERDE - GO */}
        <text x="155" y="238" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="#000000" letter-spacing="1.5">
          RIO VERDE - GO
        </text>
      </g>

      {/* ======================================================================= */}
      {/* 2. DIVISOR E SECRETARIA DE ESTADO DA EDUCAÇÃO (CENTRO) */}
      {/* ======================================================================= */}
      {/* Linha divisória vertical verde oficial */}
      <line x1="565" y1="35" x2="565" y2="245" stroke="#059669" stroke-width="3" stroke-linecap="round" />

      {/* Tipografia Oficial da SEDUC em Verde Institucional */}
      <g transform="translate(540, 112)">
        <text text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="25" fill="#059669" letter-spacing="-0.3">
          <tspan x="0" y="0">Secretaria de</tspan>
          <tspan x="0" y="28">Estado da</tspan>
          <tspan x="0" y="56">Educação</tspan>
        </text>
      </g>

      {/* ======================================================================= */}
      {/* 3. BRASÃO INSTITUCIONAL DO ESTADO DE GOIÁS (DIREITA) */}
      {/* ======================================================================= */}
      <g transform="translate(640, 32)">
        {/* Ramos e folhas de café/fumo verdes */}
        <g fill="#047857" stroke="#065f46" stroke-width="1.2">
          <path d="M5,100 C-20,70 -15,30 20,5 C10,25 0,55 18,85 Z" />
          <path d="M-8,60 C-25,40 -15,10 10,-8 C0,12 -8,35 2,52 Z" />
          <path d="M-15,100 C-32,80 -25,50 -2,35 C-12,55 -18,78 -4,95 Z" />
          <path d="M-10,135 C-30,120 -28,90 -8,75 C-16,92 -18,115 -2,130 Z" />

          <path d="M75,100 C100,70 95,30 60,5 C70,25 80,55 62,85 Z" />
          <path d="M88,60 C105,40 95,10 70,-8 C80,12 88,35 78,52 Z" />
          <path d="M95,100 C112,80 105,50 82,35 C92,55 98,78 84,95 Z" />
          <path d="M90,135 C110,120 108,90 88,75 C96,92 98,115 82,130 Z" />
        </g>

        {/* Escudo coração central */}
        <g transform="translate(40, 95)">
          <path d="M-38,-45 C-38,-65 -15,-65 0,-48 C15,-65 38,-65 38,-45 C38,-10 25,15 0,38 C-25,15 -38,-10 -38,-45 Z" 
                fill="#FFFFFF" stroke="#000000" stroke-width="2.5" />

          <g clip-path="url(#goiasShieldClip)">
            {/* Céu azul */}
            <rect x="-40" y="-70" width="80" height="42" fill="#0284C7" />
            {/* Montanha verde e estrada branca */}
            <path d="M-40,-35 Q-15,-48 10,-38 Q30,-45 40,-35 L40,-26 L-40,-26 Z" fill="#15803D" />
            <path d="M-10,-26 L-2,-38 L5,-38 L12,-26 Z" fill="#FFFFFF" />

            {/* Faixa decorada indígena */}
            <rect x="-40" y="-26" width="80" height="9" fill="#F8FAFC" stroke="#000000" stroke-width="1.2" />
            <path d="M-38,-22 L-32,-26 L-26,-22 L-20,-26 L-14,-22 L-8,-26 L-2,-22 L4,-26 L10,-22 L16,-26 L22,-22 L28,-26 L34,-22" 
                  fill="none" stroke="#000000" stroke-width="1" />

            {/* Lado esquerdo azul com peixe */}
            <rect x="-40" y="-17" width="40" height="60" fill="#0284C7" />
            <path d="M-28,3 Q-18,-8 -8,-2 Q-14,0 -16,4 Q-22,6 -28,3 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="0.8" />
            
            {/* Lado direito amarelo com diamante vermelho */}
            <rect x="0" y="-17" width="40" height="60" fill="#FACC15" />
            <polygon points="20,-8 28,2 20,12 12,2" fill="#DC2626" stroke="#991B1B" stroke-width="1" />

            <line x1="0" y1="-17" x2="0" y2="40" stroke="#000000" stroke-width="1.5" />
          </g>
        </g>

        {/* Queimador e chama eterna */}
        <g transform="translate(40, 155)">
          <path d="M-28,18 L-18,6 L18,6 L28,18" fill="none" stroke="#1F2937" stroke-width="3" stroke-linecap="round" />
          <rect x="-20" y="4" width="40" height="5" rx="2" fill="#000000" />
          
          <path d="M-24,4 C-20,-10 -15,-6 -10,-18 C-5,-8 0,-15 5,-22 C10,-12 16,-18 20,-6 C24,-10 26,4 26,4 Z" 
                fill="url(#goiasFlame)" />
          <path d="M-14,4 C-10,-5 -5,-3 -2,-12 C2,-6 8,-10 12,-3 C16,-5 16,4 16,4 Z" 
                fill="#FEF08A" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
};
