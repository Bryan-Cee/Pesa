export interface ParsedTransaction {
  amount: number | null;
  description: string | null;
  date: string | null;
  reference: string | null;
  confidence: 'HIGH' | 'LOW';
}

const amountRegex = /(?:Ksh|KES)\s?([\d,]+(?:\.\d{2})?)/i;
const referenceRegex = /^([A-Z]{2}\d{8,10})/;
const recipientRegex = /(?:sent to|paid to)\s+([A-Za-z\s&'.]+?)(?:\s+\d{10}|\s+on\s)/i;
const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
const dateTextRegex = /(\d{1,2}\s+\w+\s+\d{4})/;
const timeRegex = /(\d{2}:\d{2})/;

// Standard Chartered patterns
const scAmountRegex = /transaction of KES\s?([\d,]+)/i;
const scMerchantRegex = /Description:\s*(.+?)(?:\.|Available)/i;
const scDateRegex = /on\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;

function parseAmount(raw: string): number | null {
  // Try M-Pesa format first
  let match = raw.match(amountRegex);
  if (match) {
    return Math.round(parseFloat(match[1].replace(/,/g, '')));
  }
  // Try SC format
  match = raw.match(scAmountRegex);
  if (match) {
    return Math.round(parseFloat(match[1].replace(/,/g, '')));
  }
  return null;
}

function parseReference(raw: string): string | null {
  const match = raw.match(referenceRegex);
  return match ? match[1] : null;
}

function parseRecipient(raw: string): string | null {
  // Try M-Pesa recipient
  let match = raw.match(recipientRegex);
  if (match) return match[1].trim();

  // Try SC merchant
  match = raw.match(scMerchantRegex);
  if (match) return match[1].trim();

  return null;
}

function parseDateFromSms(raw: string): string | null {
  // Try numeric date
  let match = raw.match(scDateRegex) || raw.match(dateRegex);
  if (match) {
    const dateStr = match[1];
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // Try text date
  match = raw.match(dateTextRegex);
  if (match) {
    const d = new Date(match[1]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

export function parseSms(rawText: string): ParsedTransaction {
  const amount = parseAmount(rawText);
  const description = parseRecipient(rawText);
  const date = parseDateFromSms(rawText);
  const reference = parseReference(rawText);

  const confidence: 'HIGH' | 'LOW' =
    amount !== null && description !== null && date !== null ? 'HIGH' : 'LOW';

  return { amount, description, date, reference, confidence };
}
