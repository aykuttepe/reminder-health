/**
 * Türkiye İlaç Takip Sistemi (ITS) GS1 DataMatrix ve Barkod Ayrıştırıcı.
 * 
 * Standart ITS AI (Application Identifier) Tanımları:
 * - (01) GTIN: 14 hane (Global Trade Item Number)
 * - (21) SN: Seri Numarası (Alfanümerik, değişken uzunluk)
 * - (17) XD: Son Kullanma Tarihi (YYMMDD)
 * - (10) BN: Parti / Lot Numarası (Alfanümerik, değişken uzunluk)
 */

export interface ITSParsedData {
  gtin: string;
  expiryDate?: string; // Format: YYYY-MM-DD
  expiryDateRaw?: string; // Format: YYMMDD
  batchNo?: string;
  serialNo?: string;
  raw: string;
}

/**
 * YYMMDD formatındaki tarihi YYYY-MM-DD formatına dönüştürür.
 * Örn: "260531" -> "2026-05-31"
 */
export function formatITSExpiryDate(yymmdd: string): string | undefined {
  if (!yymmdd || yymmdd.length !== 6) return undefined;
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);

  const monthNum = parseInt(mm, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return undefined;

  const yearNum = 2000 + parseInt(yy, 10);
  const dayNum = parseInt(dd, 10);
  // Gün 00 veya geçersizse ayın son gününü al veya 01 yap
  const safeDay = isNaN(dayNum) || dayNum < 1 || dayNum > 31 ? '01' : dd.padStart(2, '0');

  return `${yearNum}-${mm.padStart(2, '0')}-${safeDay}`;
}

/**
 * Gelen ham barkod veya karekod verisini ITS standartlarına göre ayrıştırır.
 */
export function parseITSKarekod(input: string): ITSParsedData | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Standart 1D Barkod kontrolü (EAN-13 veya 14 haneli GTIN)
  const isPureDigits = /^\d+$/.test(raw);
  if (isPureDigits) {
    if (raw.length === 13) {
      return {
        gtin: '0' + raw,
        raw,
      };
    }
    if (raw.length === 14) {
      return {
        gtin: raw,
        raw,
      };
    }
  }

  // 2. Parantezli Format Kontrolü: (01)...(21)...(17)...(10)...
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

  // 3. Ham GS1 DataMatrix (ASCII 29 / \x1d veya bitişik string)
  // GS1 Formatı: 01 + 14 hane GTIN
  let clean = raw.replace(/\x1D/g, '<GS>').replace(/\u001D/g, '<GS>');
  
  // 01 ile başlıyor mu?
  const gtinIndex = clean.indexOf('01');
  if (gtinIndex !== -1) {
    const candidateGTIN = clean.slice(gtinIndex + 2, gtinIndex + 16);
    if (/^\d{14}$/.test(candidateGTIN)) {
      const gtin = candidateGTIN;
      let remaining = clean.slice(gtinIndex + 16);
      let expiryDateRaw = '';
      let batchNo = '';
      let serialNo = '';

      // Kalan stringi parçalayalım
      // 17 (Son kullanma) 6 hane sabittir
      const exp17Index = remaining.search(/(?:<GS>|^|(?<=\D))17\d{6}/);
      if (exp17Index !== -1) {
        const match = remaining.match(/17(\d{6})/);
        if (match) {
          expiryDateRaw = match[1];
        }
      }

      // 21 (Seri no) ve 10 (Parti no)
      const parts = remaining.split('<GS>');
      for (const part of parts) {
        if (part.startsWith('21')) {
          serialNo = part.slice(2);
        } else if (part.startsWith('10')) {
          batchNo = part.slice(2);
        } else if (part.startsWith('17') && part.length >= 8 && !expiryDateRaw) {
          expiryDateRaw = part.slice(2, 8);
        }
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
