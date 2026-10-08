// Sucursales oficiales para Vigilancia Digital
export const BRANCH_ACCOUNTS = [
  { id: 'suc-sabana', username: 'sabana', name: 'Sabana', branch: 'Sabana', phone: '2200-0101' },
  { id: 'suc-rohrmoser1', username: 'rohrmoser1', name: 'Rohrmoser 1', branch: 'Rohrmoser 1', phone: '2200-0102' },
  { id: 'suc-rohrmoser2', username: 'rohrmoser2', name: 'Rohrmoser 2', branch: 'Rohrmoser 2', phone: '2200-0103' },
  { id: 'suc-escazu', username: 'escazu', name: 'Escaz\u00fa', branch: 'Escaz\u00fa', phone: '2200-0104' },
  { id: 'suc-guachipelin', username: 'guachipelin', name: 'Guachipel\u00edn', branch: 'Guachipel\u00edn', phone: '2200-0105' },
  { id: 'suc-sanpablo', username: 'sanpablo', name: 'San Pablo', branch: 'San Pablo', phone: '2200-0106' },
  { id: 'suc-barva', username: 'barva', name: 'Barva', branch: 'Barva', phone: '2200-0107' },
  { id: 'suc-ayarco', username: 'ayarco', name: 'Ayarco', branch: 'Ayarco', phone: '2200-0108' },
  { id: 'suc-cedi', username: 'cedi', name: 'Cedi', branch: 'Cedi', phone: '2200-0109' }
];

export const BRANCH_PASSWORD = '123456';

export const BRANCH_NAMES = [
  'Sabana',
  'Rohrmoser 1',
  'Rohrmoser 2',
  'Escaz\u00fa',
  'Guachipel\u00edn',
  'San Pablo',
  'Barva',
  'Ayarco',
  'Cedi'
];

export function findBranchMatch(input) {
  if (!input) return null;
  const raw = input.trim().toLowerCase();

  // Coincidencia exacta por usuario o id
  const exact = BRANCH_ACCOUNTS.find(b => b.username === raw || b.id === raw);
  if (exact) return exact;

  // Si escribieron solo el número
  const numMap = {
    '1': 'sabana',
    '2': 'rohrmoser1',
    '3': 'rohrmoser2',
    '4': 'escazu',
    '5': 'guachipelin',
    '6': 'sanpablo',
    '7': 'barva',
    '8': 'ayarco',
    '9': 'cedi'
  };
  if (numMap[raw]) {
    return BRANCH_ACCOUNTS.find(b => b.username === numMap[raw]);
  }

  // Normalización tolerante a acentos, espacios y números prefijados
  const normalized = raw
    .split('@')[0]
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^[0-9]+[\s_.-]*/, '')
    .replace(/[^a-z0-9]/g, '');

  if (!normalized) return null;

  return BRANCH_ACCOUNTS.find(b => {
    const bNorm = b.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameNorm = b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return bNorm === normalized || nameNorm === normalized;
  }) || null;
}