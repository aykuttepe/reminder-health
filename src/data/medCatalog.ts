/**
 * Çevrimdışı Temel Türkiye İlaç Kataloğu (GTIN Eşleştirme Sözlüğü).
 * Türkiye'de en yaygın reçete edilen ve kullanılan ilaçların GTIN barkodları,
 * dozajları, formları ve kullanım talimatları.
 */

export interface CatalogMedicine {
  gtin: string; // 14 haneli barkod
  name: string;
  amount: string;
  form: 'tablet' | 'kapsul' | 'damla' | 'surup';
  mealCondition: 'tok' | 'ac' | 'yemekle' | 'farketmez';
  instructions: string;
  defaultStock?: number;
  stockThreshold?: number;
}

export const TURKISH_MED_CATALOG: Record<string, CatalogMedicine> = {
  // Coraspin 100 mg 30 Enterik Kaplı Tablet
  '08699546011122': {
    gtin: '08699546011122',
    name: 'Coraspin',
    amount: '100 mg',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Bol su ile çiğnemeden içiniz.',
    defaultStock: 30,
    stockThreshold: 5,
  },
  // Parol 500 mg 20 Tablet
  '08699508010071': {
    gtin: '08699508010071',
    name: 'Parol',
    amount: '500 mg',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Ağrı veya ateş durumunda bol su ile alınız.',
    defaultStock: 20,
    stockThreshold: 4,
  },
  // Arveles 25 mg 20 Film Tablet
  '08699514091651': {
    gtin: '08699514091651',
    name: 'Arveles',
    amount: '25 mg',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Tok karnına bol su ile alınız.',
    defaultStock: 20,
    stockThreshold: 4,
  },
  // Nexium 40 mg 28 Enterik Kaplı Pellet Tablet
  '08699786010084': {
    gtin: '08699786010084',
    name: 'Nexium',
    amount: '40 mg',
    form: 'tablet',
    mealCondition: 'ac',
    instructions: 'Sabah kahvaltıdan 30 dakika önce aç karnına içiniz.',
    defaultStock: 28,
    stockThreshold: 5,
  },
  // Nexium 20 mg 28 Enterik Kaplı Pellet Tablet
  '08699786010077': {
    gtin: '08699786010077',
    name: 'Nexium',
    amount: '20 mg',
    form: 'tablet',
    mealCondition: 'ac',
    instructions: 'Sabah kahvaltıdan en az 30 dakika önce aç içiniz.',
    defaultStock: 28,
    stockThreshold: 5,
  },
  // Beloc ZOK 50 mg 20 Kontrollü Salım Tableti
  '08699786030044': {
    gtin: '08699786030044',
    name: 'Beloc ZOK',
    amount: '50 mg',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Sabahları çiğnemeden yutunuz.',
    defaultStock: 20,
    stockThreshold: 5,
  },
  // Beloc ZOK 25 mg 20 Kontrollü Salım Tableti
  '08699786030037': {
    gtin: '08699786030037',
    name: 'Beloc ZOK',
    amount: '25 mg',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Günde 1 kez çiğnemeden yutunuz.',
    defaultStock: 20,
    stockThreshold: 5,
  },
  // Apranax Fort 550 mg 20 Film Tablet
  '08699514090173': {
    gtin: '08699514090173',
    name: 'Apranax Fort',
    amount: '550 mg',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Mideyi korumak için mutlaka tok karnına alınız.',
    defaultStock: 20,
    stockThreshold: 4,
  },
  // Majezik 100 mg 15 Film Tablet
  '08699536090045': {
    gtin: '08699536090045',
    name: 'Majezik',
    amount: '100 mg',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Yemek sonrası bir bardak su ile içiniz.',
    defaultStock: 15,
    stockThreshold: 3,
  },
  // Glifor 1000 mg 100 Film Tablet
  '08699525091404': {
    gtin: '08699525091404',
    name: 'Glifor',
    amount: '1000 mg',
    form: 'tablet',
    mealCondition: 'yemekle',
    instructions: 'Yemek sırasında veya yemekten hemen sonra alınız.',
    defaultStock: 100,
    stockThreshold: 10,
  },
  // Lansor 30 mg 28 Mikropellet Kapsül
  '08699536150039': {
    gtin: '08699536150039',
    name: 'Lansor',
    amount: '30 mg',
    form: 'kapsul',
    mealCondition: 'ac',
    instructions: 'Sabah kahvaltıdan yarım saat önce aç karnına.',
    defaultStock: 28,
    stockThreshold: 5,
  },
  // Augmentin-BID 1000 mg 14 Film Tablet
  '08699522095627': {
    gtin: '08699522095627',
    name: 'Augmentin-BID',
    amount: '1000 mg',
    form: 'tablet',
    mealCondition: 'yemekle',
    instructions: 'Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.',
    defaultStock: 14,
    stockThreshold: 3,
  },
  // Delix 5 mg 28 Tablet
  '08699809010466': {
    gtin: '08699809010466',
    name: 'Delix',
    amount: '5 mg',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Her gün aynı saatte bol su ile alınız.',
    defaultStock: 28,
    stockThreshold: 5,
  },
  // Euthyrox 50 mcg 50 Tablet
  '08699808010160': {
    gtin: '08699808010160',
    name: 'Euthyrox',
    amount: '50 mcg',
    form: 'tablet',
    mealCondition: 'ac',
    instructions: 'Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile.',
    defaultStock: 50,
    stockThreshold: 7,
  },
  // Aferin Forte 30 Film Tablet
  '08699540090208': {
    gtin: '08699540090208',
    name: 'A-Ferin Forte',
    amount: '1 tablet',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Grip ve soğuk algınlığında tok karnına su ile alınız.',
    defaultStock: 30,
    stockThreshold: 5,
  },
  // Minoset Plus 30 Tablet
  '08699546010040': {
    gtin: '08699546010040',
    name: 'Minoset Plus',
    amount: '1 tablet',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Bol su ile yutunuz.',
    defaultStock: 30,
    stockThreshold: 5,
  },
  // Gaviscon Double Action 200 ml Likit Süspansiyon
  '08699525705356': {
    gtin: '08699525705356',
    name: 'Gaviscon Double Action',
    amount: '10 ml',
    form: 'surup',
    mealCondition: 'tok',
    instructions: 'Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.',
    defaultStock: 20,
    stockThreshold: 3,
  },
  // Daflon 500 mg 60 Film Tablet
  '08699566095034': {
    gtin: '08699566095034',
    name: 'Daflon',
    amount: '500 mg',
    form: 'tablet',
    mealCondition: 'yemekle',
    instructions: 'Öğle ve akşam yemeklerinde 1 tablet alınız.',
    defaultStock: 60,
    stockThreshold: 8,
  },
  // Cipralex 10 mg 28 Film Tablet
  '08699795090336': {
    gtin: '08699795090336',
    name: 'Cipralex',
    amount: '10 mg',
    form: 'tablet',
    mealCondition: 'farketmez',
    instructions: 'Günde 1 kez sabah veya akşam düzenli alınız.',
    defaultStock: 28,
    stockThreshold: 5,
  },
  // Benexol B12 30 Film Tablet
  '08699546091469': {
    gtin: '08699546091469',
    name: 'Benexol B12',
    amount: '1 tablet',
    form: 'tablet',
    mealCondition: 'tok',
    instructions: 'Tok karnına günde 1 tablet yutunuz.',
    defaultStock: 30,
    stockThreshold: 5,
  },
};

/**
 * GTIN kodunu sırasıyla:
 * 1. Kullanıcının daha önce öğrendiği özel hafızadan (learnedMeds)
 * 2. Çevrimdışı hazır Türkiye kataloğundan (TURKISH_MED_CATALOG)
 * çözer.
 */
export function findMedicineByGTIN(
  gtin: string,
  learnedMeds?: Record<string, Partial<CatalogMedicine>>
): CatalogMedicine | null {
  if (!gtin) return null;
  const cleanGTIN = gtin.trim().padStart(14, '0');

  // 1. Kullanıcı hafızası
  if (learnedMeds && learnedMeds[cleanGTIN]) {
    const userMed = learnedMeds[cleanGTIN];
    return {
      gtin: cleanGTIN,
      name: userMed.name || 'Bilinmeyen İlaç',
      amount: userMed.amount || '1 tablet',
      form: userMed.form || 'tablet',
      mealCondition: userMed.mealCondition || 'tok',
      instructions: userMed.instructions || '',
      defaultStock: userMed.defaultStock ?? 30,
      stockThreshold: userMed.stockThreshold ?? 5,
    };
  }

  // 2. Hazır katalog
  if (TURKISH_MED_CATALOG[cleanGTIN]) {
    return TURKISH_MED_CATALOG[cleanGTIN];
  }

  return null;
}
