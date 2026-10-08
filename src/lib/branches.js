// Sucursales y cuentas oficiales para Vigilancia Digital
export const BRANCH_ACCOUNTS = [
  { 
    id: 'suc-cv-sabana', 
    username: 'sabana', 
    aliases: ['cv-sabana', 'farmacia cv-sabana', 'suc-sabana'], 
    name: 'Farmacia CV-Sabana', 
    branch: 'Farmacia CV-Sabana', 
    phone: '2200-0101' 
  },
  { 
    id: 'suc-cv-rohrmoser', 
    username: 'rohrmoser', 
    aliases: ['cv-rohrmoser', 'farmacia cv-rohrmoser', 'rohrmoser1', 'rohrmoser2'], 
    name: 'Farmacia CV-Rohrmoser', 
    branch: 'Farmacia CV-Rohrmoser', 
    phone: '2200-0102' 
  },
  { 
    id: 'suc-cv-escazu', 
    username: 'escazu', 
    aliases: ['cv-escazu', 'farmacia cv-escazu'], 
    name: 'Farmacia CV-Escazú', 
    branch: 'Farmacia CV-Escazú', 
    phone: '2200-0103' 
  },
  { 
    id: 'suc-cv-sanpablo', 
    username: 'sanpablo', 
    aliases: ['cv-sanpablo', 'farmacia cv-sanpablo', 'san pablo'], 
    name: 'Farmacia CV-San Pablo', 
    branch: 'Farmacia CV-San Pablo', 
    phone: '2200-0104' 
  },
  { 
    id: 'suc-cv-barva', 
    username: 'barva', 
    aliases: ['cv-barva', 'farmacia cv-barva'], 
    name: 'Farmacia CV-Barva', 
    branch: 'Farmacia CV-Barva', 
    phone: '2200-0105' 
  },
  { 
    id: 'suc-cv-ayarco', 
    username: 'ayarco', 
    aliases: ['cv-ayarco', 'farmacia cv-ayarco'], 
    name: 'Farmacia CV-Ayarco', 
    branch: 'Farmacia CV-Ayarco', 
    phone: '2200-0106' 
  },
  { 
    id: 'suc-cv-guachipelin', 
    username: 'guachipelin', 
    aliases: ['cv-guachipelin', 'farmacia cv-guachipelin', 'guachipelín'], 
    name: 'Farmacia CV-Guachipelín', 
    branch: 'Farmacia CV-Guachipelín', 
    phone: '2200-0107' 
  },
  { 
    id: 'suc-cedi', 
    username: 'cedi', 
    aliases: ['cedi'], 
    name: 'Cedi', 
    branch: 'Cedi', 
    phone: '2200-0108' 
  },
  { 
    id: 'suc-contabilidad', 
    username: 'contabilidad', 
    aliases: ['conta'], 
    name: 'Contabilidad', 
    branch: 'Contabilidad', 
    phone: '2200-0109' 
  },
  { 
    id: 'suc-rh', 
    username: 'recursoshumanos', 
    aliases: ['rh', 'recursos humanos', 'rrhh'], 
    name: 'Recursos Humanos', 
    branch: 'Recursos Humanos', 
    phone: '2200-0110' 
  },
  { 
    id: 'user-miguel-monge', 
    username: 'miguelmonge', 
    aliases: ['miguel', 'miguel monge'], 
    name: 'Miguel Monge', 
    branch: 'Miguel Monge', 
    phone: '2200-0111' 
  },
  { 
    id: 'user-jose-godinez', 
    username: 'josegodinez', 
    aliases: ['jose', 'jose godinez', 'jose godínez'], 
    name: 'Jose Godínez', 
    branch: 'Jose Godínez', 
    phone: '2200-0112' 
  }
];

export const BRANCH_PASSWORD = '123456';

export const BRANCH_NAMES = [
  'Farmacia CV-Sabana',
  'Farmacia CV-Rohrmoser',
  'Farmacia CV-Escazú',
  'Farmacia CV-San Pablo',
  'Farmacia CV-Barva',
  'Farmacia CV-Ayarco',
  'Farmacia CV-Guachipelín',
  'Cedi',
  'Contabilidad',
  'Recursos Humanos',
  'Miguel Monge',
  'Jose Godínez'
];

export function findBranchMatch(input) {
  if (!input) return null;
  const raw = input.trim().toLowerCase();

  // 1. Coincidencia exacta por username o id
  const exact = BRANCH_ACCOUNTS.find(b => b.username === raw || b.id === raw);
  if (exact) return exact;

  // 2. Coincidencia por aliases
  const aliasMatch = BRANCH_ACCOUNTS.find(b => b.aliases && b.aliases.some(a => a.toLowerCase() === raw));
  if (aliasMatch) return aliasMatch;

  // 3. Si escribieron solo el número de índice (1 al 12)
  const numIndex = parseInt(raw, 10);
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= BRANCH_ACCOUNTS.length) {
    return BRANCH_ACCOUNTS[numIndex - 1];
  }

  // 4. Normalización tolerante a acentos, espacios y números prefijados
  const normalize = (str) =>
    str
      .split('@')[0]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^[0-9]+[\s_.-]*/, '')
      .replace(/[^a-z0-9]/g, '')
      .toLowerCase();

  const normalizedRaw = normalize(raw);
  if (!normalizedRaw) return null;

  return BRANCH_ACCOUNTS.find(b => {
    const bUserNorm = normalize(b.username);
    const bNameNorm = normalize(b.name);
    const bBranchNorm = normalize(b.branch);
    if (bUserNorm === normalizedRaw || bNameNorm === normalizedRaw || bBranchNorm === normalizedRaw) {
      return true;
    }
    if (b.aliases && b.aliases.some(a => normalize(a) === normalizedRaw)) {
      return true;
    }
    // Substring match si es suficientemente largo (>= 4 letras)
    if (normalizedRaw.length >= 4 && (bNameNorm.includes(normalizedRaw) || normalizedRaw.includes(bNameNorm))) {
      return true;
    }
    return false;
  }) || null;
}
