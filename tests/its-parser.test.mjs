import assert from "node:assert/strict";
import test from "node:test";

// Simple JS mirrors of itsParser and medCatalog functions for Node test runner
function formatITSExpiryDate(yymmdd) {
  if (!yymmdd || yymmdd.length !== 6) return undefined;
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);

  const monthNum = parseInt(mm, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return undefined;

  const yearNum = 2000 + parseInt(yy, 10);
  const dayNum = parseInt(dd, 10);
  const safeDay = isNaN(dayNum) || dayNum < 1 || dayNum > 31 ? '01' : dd.padStart(2, '0');

  return `${yearNum}-${mm.padStart(2, '0')}-${safeDay}`;
}

function parseITSKarekod(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1D Barkod
  if (/^\d+$/.test(raw)) {
    if (raw.length === 13) return { gtin: '0' + raw, raw };
    if (raw.length === 14) return { gtin: raw, raw };
  }

  // Parantezli format
  if (raw.includes('(01)')) {
    let gtin = '';
    let expiryDateRaw = '';
    let batchNo = '';
    let serialNo = '';

    const gtinMatch = raw.match(/\(01\)(\d{14})/);
    if (gtinMatch) gtin = gtinMatch[1];

    const expiryMatch = raw.match(/\(17\)(\d{6})/);
    if (expiryMatch) expiryDateRaw = expiryMatch[1];

    const serialMatch = raw.match(/\(21\)([^()]+)/);
    if (serialMatch) serialNo = serialMatch[1].trim();

    const batchMatch = raw.match(/\(10\)([^()]+)/);
    if (batchMatch) batchNo = batchMatch[1].trim();

    if (gtin) {
      return {
        gtin,
        expiryDate: expiryDateRaw ? formatITSExpiryDate(expiryDateRaw) : undefined,
        expiryDateRaw: expiryDateRaw || undefined,
        batchNo: batchNo || undefined,
        serialNo: serialNo || undefined,
        raw,
      };
    }
  }

  // Ham GS1 DataMatrix
  let clean = raw.replace(/\x1D/g, '<GS>').replace(/\u001D/g, '<GS>');
  const gtinIndex = clean.indexOf('01');
  if (gtinIndex !== -1) {
    const candidateGTIN = clean.slice(gtinIndex + 2, gtinIndex + 16);
    if (/^\d{14}$/.test(candidateGTIN)) {
      const gtin = candidateGTIN;
      let remaining = clean.slice(gtinIndex + 16);
      let expiryDateRaw = '';
      let batchNo = '';
      let serialNo = '';

      const match = remaining.match(/17(\d{6})/);
      if (match) expiryDateRaw = match[1];

      const parts = remaining.split('<GS>');
      for (const part of parts) {
        if (part.startsWith('21')) serialNo = part.slice(2);
        else if (part.startsWith('10')) batchNo = part.slice(2);
        else if (part.startsWith('17') && part.length >= 8 && !expiryDateRaw) expiryDateRaw = part.slice(2, 8);
      }

      return {
        gtin,
        expiryDate: expiryDateRaw ? formatITSExpiryDate(expiryDateRaw) : undefined,
        expiryDateRaw: expiryDateRaw || undefined,
        batchNo: batchNo || undefined,
        serialNo: serialNo || undefined,
        raw,
      };
    }
  }

  return null;
}

const SAMPLE_CATALOG = {
  '08699546011122': {
    gtin: '08699546011122',
    name: 'Coraspin',
    amount: '100 mg',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Bol su ile çiğnemeden içiniz.',
  },
  '08699508010071': {
    gtin: '08699508010071',
    name: 'Parol',
    amount: '500 mg',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Ağrı veya ateş durumunda bol su ile alınız.',
  }
};

function findMedicineByGTIN(gtin, learnedMeds) {
  if (!gtin) return null;
  const cleanGTIN = gtin.trim().padStart(14, '0');
  if (learnedMeds && learnedMeds[cleanGTIN]) return learnedMeds[cleanGTIN];
  if (SAMPLE_CATALOG[cleanGTIN]) return SAMPLE_CATALOG[cleanGTIN];
  return null;
}

test("formatITSExpiryDate correctly converts YYMMDD to ISO date string", () => {
  assert.equal(formatITSExpiryDate('260531'), '2026-05-31');
  assert.equal(formatITSExpiryDate('271215'), '2027-12-15');
  assert.equal(formatITSExpiryDate('250200'), '2025-02-01'); // Safe day fallback
  assert.equal(formatITSExpiryDate('invalid'), undefined);
});

test("parseITSKarekod parses 1D 13-digit EAN barcode and pads to 14-digit GTIN", () => {
  const parsed = parseITSKarekod('8699546011122');
  assert.notEqual(parsed, null);
  assert.equal(parsed.gtin, '08699546011122');
});

test("parseITSKarekod parses standard parenthesized ITS DataMatrix", () => {
  const raw = '(01)08699546011122(21)SN123456(17)260531(10)BN9988';
  const parsed = parseITSKarekod(raw);
  assert.notEqual(parsed, null);
  assert.equal(parsed.gtin, '08699546011122');
  assert.equal(parsed.expiryDate, '2026-05-31');
  assert.equal(parsed.serialNo, 'SN123456');
  assert.equal(parsed.batchNo, 'BN9988');
});

test("parseITSKarekod parses raw GS1 stream with ASCII 29 group separators", () => {
  const raw = '010869950801007121SER1234\x1d1728103010LOT55';
  const parsed = parseITSKarekod(raw);
  assert.notEqual(parsed, null);
  assert.equal(parsed.gtin, '08699508010071');
  assert.equal(parsed.expiryDate, '2028-10-30');
});

test("findMedicineByGTIN resolves catalog medicines and learned user memory", () => {
  // 1. From catalog
  const coraspin = findMedicineByGTIN('08699546011122');
  assert.notEqual(coraspin, null);
  assert.equal(coraspin.name, 'Coraspin');
  assert.equal(coraspin.amount, '100 mg');
  assert.equal(coraspin.mealCondition, 'tok');

  // 2. From learned dictionary
  const learned = {
    '08699999999999': {
      gtin: '08699999999999',
      name: 'Özel İlaç',
      amount: '50 mg',
      form: 'kapsul',
      mealCondition: 'ac',
      instructions: 'Özel talimat',
    }
  };
  const custom = findMedicineByGTIN('08699999999999', learned);
  assert.notEqual(custom, null);
  assert.equal(custom.name, 'Özel İlaç');

  // 3. Unknown
  const unknown = findMedicineByGTIN('00000000000000');
  assert.equal(unknown, null);
});
