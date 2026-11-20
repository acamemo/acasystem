import qrcode from 'qrcode-generator';

/** Matrice del codice QR (true = modulo scuro) per l'indirizzo dell'app sulla centrale. */
export const buildQr = (text: string): boolean[][] => {
  const code = qrcode(0, 'M');
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => code.isDark(row, col)));
};
