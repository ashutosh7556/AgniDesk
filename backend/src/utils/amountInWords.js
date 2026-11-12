/**
 * Amount in words using the Indian numbering system (lakh, crore),
 * as printed on Indian invoices: 125050.5 -> "Rupees One Lakh Twenty Five
 * Thousand Fifty and Fifty Paise Only".
 */
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim());

const belowThousand = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ');
};

const integerToWords = (n) => {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${integerToWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
};

export function amountInWords(amount) {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const words = `Rupees ${integerToWords(rupees)}`;
  return paise ? `${words} and ${belowHundred(paise)} Paise Only` : `${words} Only`;
}
