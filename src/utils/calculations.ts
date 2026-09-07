import { DocumentLine, DocumentTotals } from '../types';

/**
 * Format a number to standard Tunisian currency with 3 decimal places (Millimes)
 * Example: 5476 -> "5 476,000 TND"
 */
export function formatTND(amount: number | undefined | null, showSymbol = true): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) {
    return showSymbol ? '0,000 TND' : '0,000';
  }
  const parts = num.toFixed(3).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decPart = parts[1];
  const formatted = `${intPart},${decPart}`;
  return showSymbol ? `${formatted} TND` : formatted;
}

/**
 * Calculate financial totals for a list of document lines and a given fiscal stamp.
 * Backend and frontend use the exact same calculation formula.
 */
export function calculateDocumentTotals(
  lines: DocumentLine[],
  timbreFiscal = 0
): DocumentTotals {
  let subtotal_brut_ht = 0;
  let total_remise = 0;
  let subtotal_net_ht = 0;
  let total_tva = 0;

  const tvaMap = new Map<number, { base_ht: number; amount_tva: number }>();

  for (const line of lines) {
    const qty = Number(line.quantity) || 0;
    const pu = Number(line.unit_price_ht) || 0;
    const discount = Number(line.discount_percent) || 0;
    const tvaRate = Number(line.tva_percent) || 0;

    const lineBrutHT = qty * pu;
    const lineDiscountAmount = lineBrutHT * (discount / 100);
    const lineNetHT = lineBrutHT - lineDiscountAmount;
    const lineTVA = lineNetHT * (tvaRate / 100);

    subtotal_brut_ht += lineBrutHT;
    total_remise += lineDiscountAmount;
    subtotal_net_ht += lineNetHT;
    total_tva += lineTVA;

    // Accumulate TVA per rate
    const current = tvaMap.get(tvaRate) || { base_ht: 0, amount_tva: 0 };
    current.base_ht += lineNetHT;
    current.amount_tva += lineTVA;
    tvaMap.set(tvaRate, current);
  }

  const tva_details = Array.from(tvaMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, data]) => ({
      rate,
      base_ht: round3(data.base_ht),
      amount_tva: round3(data.amount_tva),
    }));

  const finalNetHT = round3(subtotal_net_ht);
  const finalTotalTVA = round3(total_tva);
  const finalStamp = round3(timbreFiscal);
  const total_ttc = round3(finalNetHT + finalTotalTVA + finalStamp);

  return {
    subtotal_brut_ht: round3(subtotal_brut_ht),
    total_remise: round3(total_remise),
    subtotal_net_ht: finalNetHT,
    tva_details,
    total_tva: finalTotalTVA,
    timbre_fiscal: finalStamp,
    total_ttc,
  };
}

/**
 * Recompute a single line's totals
 */
export function calculateLineTotals(
  qty: number,
  unitPrice: number,
  discountPercent: number,
  tvaPercent: number
): { total_ht: number; total_tva: number; total_ttc: number } {
  const lineBrutHT = (Number(qty) || 0) * (Number(unitPrice) || 0);
  const discountAmount = lineBrutHT * ((Number(discountPercent) || 0) / 100);
  const total_ht = round3(lineBrutHT - discountAmount);
  const total_tva = round3(total_ht * ((Number(tvaPercent) || 0) / 100));
  const total_ttc = round3(total_ht + total_tva);

  return {
    total_ht,
    total_tva,
    total_ttc,
  };
}

/**
 * Rounding helper strictly to 3 decimal places (Millimes)
 */
export function round3(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

/**
 * Convert number to French words with Dinars and Millimes
 * e.g. 1250.500 -> "Mille deux cent cinquante Dinars et cinq cents Millimes"
 */
const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

function integerToWordsFR(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + integerToWordsFR(Math.abs(n));

  let words = '';

  if (Math.floor(n / 1000000) > 0) {
    const millions = Math.floor(n / 1000000);
    if (millions === 1) {
      words += 'un million ';
    } else {
      words += integerToWordsFR(millions) + ' millions ';
    }
    n %= 1000000;
  }

  if (Math.floor(n / 1000) > 0) {
    const thousands = Math.floor(n / 1000);
    if (thousands === 1) {
      words += 'mille ';
    } else {
      words += integerToWordsFR(thousands) + ' mille ';
    }
    n %= 1000;
  }

  if (Math.floor(n / 100) > 0) {
    const hundreds = Math.floor(n / 100);
    if (hundreds === 1) {
      words += 'cent ';
    } else {
      words += UNITES[hundreds] + ' cents ';
    }
    n %= 100;
  }

  if (n > 0) {
    if (n < 10) {
      words += UNITES[n];
    } else if (n >= 10 && n < 20) {
      words += TEENS[n - 10];
    } else {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      if (ten === 7) {
        words += 'soixante-' + (unit === 1 ? 'et-onze' : TEENS[unit]);
      } else if (ten === 9) {
        words += 'quatre-vingt-' + TEENS[unit];
      } else {
        if (unit === 0) {
          words += DIZAINES[ten];
        } else if (unit === 1 && ten < 8) {
          words += DIZAINES[ten] + ' et un';
        } else {
          words += DIZAINES[ten] + '-' + UNITES[unit];
        }
      }
    }
  }

  return words.trim();
}

export function numberToWordsTunisianTND(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zéro Dinar et zéro Millime';
  }

  const rounded = round3(amount);
  const dinars = Math.floor(rounded);
  const millimes = Math.round((rounded - dinars) * 1000);

  const dinarStr = integerToWordsFR(dinars);
  const dinarWord = dinars > 1 ? 'Dinars' : 'Dinar';

  let result = `${capitalize(dinarStr)} ${dinarWord}`;

  if (millimes > 0) {
    const millimeStr = integerToWordsFR(millimes);
    const millimeWord = millimes > 1 ? 'Millimes' : 'Millime';
    result += ` et ${millimeStr} ${millimeWord}`;
  }

  return result;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
