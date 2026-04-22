/**
 * Validação de CPF/CNPJ com cálculo de dígitos verificadores.
 *
 * Aceita entrada com máscara (pontos, traços, barras) — os separadores
 * são removidos antes da validação.
 */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isAllSameDigits(digits: string): boolean {
  return digits.length > 0 && /^(\d)\1+$/.test(digits);
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (isAllSameDigits(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check1 = (sum * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (check1 !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  let check2 = (sum * 10) % 11;
  if (check2 === 10) check2 = 0;
  return check2 === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (isAllSameDigits(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const sum1 = weights1.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  let check1 = sum1 % 11;
  check1 = check1 < 2 ? 0 : 11 - check1;
  if (check1 !== Number(digits[12])) return false;

  const sum2 = weights2.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  let check2 = sum2 % 11;
  check2 = check2 < 2 ? 0 : 11 - check2;
  return check2 === Number(digits[13]);
}

export function isValidCpfOrCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}
