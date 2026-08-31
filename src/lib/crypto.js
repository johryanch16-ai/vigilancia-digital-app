import CryptoJS from 'crypto-js';

// En un entorno de producción real, esta clave debería estar estrictamente en variables de entorno.
// Para este caso, usamos una llave segura quemada para simplicidad del frontend.
const SECRET_KEY = import.meta.env.VITE_CRYPTO_SECRET || 'VigilanciaDigital-Secure-Vault-2026-AES256';

export const encryptPassword = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptPassword = (cipherText) => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error desencriptando contraseña', error);
    return 'Error de Desencriptación';
  }
};
