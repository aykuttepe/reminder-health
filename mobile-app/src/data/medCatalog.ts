/**
 * Çevrimdışı Genişletilmiş Türkiye İlaç Kataloğu (GTIN Eşleştirme Sözlüğü).
 * TİTCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) resmi veritabanından derlenen
 * en yaygın reçete edilen ve kullanılan ilaçların GTIN barkodları,
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
  "08699546011122": {
    "gtin": "08699546011122",
    "name": "Coraspin",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile çiğnemeden içiniz.",
    "defaultStock": 30,
    "stockThreshold": 5
  },
  "08699508010071": {
    "gtin": "08699508010071",
    "name": "Parol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 4
  },
  "08699514091651": {
    "gtin": "08699514091651",
    "name": "Arveles",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 4
  },
  "08699786010084": {
    "gtin": "08699786010084",
    "name": "Nexium",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan 30 dakika önce aç karnına içiniz.",
    "defaultStock": 28,
    "stockThreshold": 5
  },
  "08699786010077": {
    "gtin": "08699786010077",
    "name": "Nexium",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan en az 30 dakika önce aç içiniz.",
    "defaultStock": 28,
    "stockThreshold": 5
  },
  "08699786030044": {
    "gtin": "08699786030044",
    "name": "Beloc ZOK",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 5
  },
  "08699786030037": {
    "gtin": "08699786030037",
    "name": "Beloc ZOK",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Günde 1 kez çiğnemeden yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 5
  },
  "08699514090173": {
    "gtin": "08699514090173",
    "name": "Apranax Fort",
    "amount": "550 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 4
  },
  "08699536090045": {
    "gtin": "08699536090045",
    "name": "Majezik",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 15,
    "stockThreshold": 3
  },
  "08699525091404": {
    "gtin": "08699525091404",
    "name": "Glifor",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 10
  },
  "08699536150039": {
    "gtin": "08699536150039",
    "name": "Lansor",
    "amount": "30 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç karnına.",
    "defaultStock": 28,
    "stockThreshold": 5
  },
  "08699522095627": {
    "gtin": "08699522095627",
    "name": "Augmentin-BID",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699809010466": {
    "gtin": "08699809010466",
    "name": "Delix",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Her gün aynı saatte bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 5
  },
  "08699808010160": {
    "gtin": "08699808010160",
    "name": "Euthyrox",
    "amount": "50 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699540090208": {
    "gtin": "08699540090208",
    "name": "A-Ferin Forte",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Grip ve soğuk algınlığında tok karnına su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 5
  },
  "08699546010040": {
    "gtin": "08699546010040",
    "name": "Minoset Plus",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile yutunuz.",
    "defaultStock": 30,
    "stockThreshold": 5
  },
  "08699525705356": {
    "gtin": "08699525705356",
    "name": "Gaviscon Double Action",
    "amount": "10 ml",
    "form": "surup",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699566095034": {
    "gtin": "08699566095034",
    "name": "Daflon",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğle ve akşam yemeklerinde 1 tablet alınız.",
    "defaultStock": 60,
    "stockThreshold": 8
  },
  "08699795090336": {
    "gtin": "08699795090336",
    "name": "Cipralex",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Günde 1 kez sabah veya akşam düzenli alınız.",
    "defaultStock": 28,
    "stockThreshold": 5
  },
  "08699546091469": {
    "gtin": "08699546091469",
    "name": "Benexol B12",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına günde 1 tablet yutunuz.",
    "defaultStock": 30,
    "stockThreshold": 5
  },
  "08699516154547": {
    "gtin": "08699516154547",
    "name": "Adoport",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699516154554": {
    "gtin": "08699516154554",
    "name": "Adoport",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699516154561": {
    "gtin": "08699516154561",
    "name": "Adoport",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890192": {
    "gtin": "08699043890192",
    "name": "Advagraf",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699043890178": {
    "gtin": "08699043890178",
    "name": "Advagraf",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699043890185": {
    "gtin": "08699043890185",
    "name": "Advagraf",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890239": {
    "gtin": "08699043890239",
    "name": "Advagraf",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699043890208": {
    "gtin": "08699043890208",
    "name": "Advagraf",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699043890215": {
    "gtin": "08699043890215",
    "name": "Advagraf",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890222": {
    "gtin": "08699043890222",
    "name": "Advagraf",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699043890406": {
    "gtin": "08699043890406",
    "name": "Advagraf",
    "amount": "3 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699043890437": {
    "gtin": "08699043890437",
    "name": "Advagraf",
    "amount": "3 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699043890444": {
    "gtin": "08699043890444",
    "name": "Advagraf",
    "amount": "3 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890260": {
    "gtin": "08699043890260",
    "name": "Advagraf",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699043890246": {
    "gtin": "08699043890246",
    "name": "Advagraf",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699043890253": {
    "gtin": "08699043890253",
    "name": "Advagraf",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabahları aç karnına, her gün aynı saatte tek doz alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699636590027": {
    "gtin": "08699636590027",
    "name": "Aerıus",
    "amount": "0.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08683280337015": {
    "gtin": "08683280337015",
    "name": "Aerıus",
    "amount": "0.5 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08683280337022": {
    "gtin": "08683280337022",
    "name": "Aerıus",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699570090058": {
    "gtin": "08699570090058",
    "name": "A-ferın Forte",
    "amount": "650 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699570240026": {
    "gtin": "08699570240026",
    "name": "A-ferın Hot Tek Kullanımlık Toz Içeren Poşet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699570150202": {
    "gtin": "08699570150202",
    "name": "A-ferin",
    "amount": "300 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 1000,
    "stockThreshold": 7
  },
  "08699570150196": {
    "gtin": "08699570150196",
    "name": "A-ferin",
    "amount": "300 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 500,
    "stockThreshold": 7
  },
  "08699570570062": {
    "gtin": "08699570570062",
    "name": "A-ferin",
    "amount": "1 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699570090140": {
    "gtin": "08699570090140",
    "name": "A-ferın Plus Fılm Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699570570147": {
    "gtin": "08699570570147",
    "name": "A-ferin Plus",
    "amount": "1 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699570090119": {
    "gtin": "08699570090119",
    "name": "A-ferın Sınus 500/30/",
    "amount": "1.25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699543010038": {
    "gtin": "08699543010038",
    "name": "Aldactone",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 16,
    "stockThreshold": 3
  },
  "08699543011165": {
    "gtin": "08699543011165",
    "name": "Aldactone",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699543010021": {
    "gtin": "08699543010021",
    "name": "Aldactone",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699527093569": {
    "gtin": "08699527093569",
    "name": "Allerset",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699527093705": {
    "gtin": "08699527093705",
    "name": "Allerset",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699527093729": {
    "gtin": "08699527093729",
    "name": "Allerset",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699527593748": {
    "gtin": "08699527593748",
    "name": "Allerset",
    "amount": "10 mg",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699527573788": {
    "gtin": "08699527573788",
    "name": "Allerset",
    "amount": "1 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514091509": {
    "gtin": "08699514091509",
    "name": "Apranax",
    "amount": "275 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514091516": {
    "gtin": "08699514091516",
    "name": "Apranax",
    "amount": "275 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699514091523": {
    "gtin": "08699514091523",
    "name": "Apranax Fort",
    "amount": "550 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514091530": {
    "gtin": "08699514091530",
    "name": "Apranax Fort",
    "amount": "550 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699514090960": {
    "gtin": "08699514090960",
    "name": "Apranax Plus",
    "amount": "550 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514090977": {
    "gtin": "08699514090977",
    "name": "Apranax Plus",
    "amount": "550 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Mideyi korumak için mutlaka tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699832090055": {
    "gtin": "08699832090055",
    "name": "Arveles",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699832090284": {
    "gtin": "08699832090284",
    "name": "Arveles",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699832750027": {
    "gtin": "08699832750027",
    "name": "Arveles",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699832750034": {
    "gtin": "08699832750034",
    "name": "Arveles",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699832750010": {
    "gtin": "08699832750010",
    "name": "Arveles",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Tok karnına bol su ile alınız.",
    "defaultStock": 6,
    "stockThreshold": 3
  },
  "08699624570062": {
    "gtin": "08699624570062",
    "name": "Atarax",
    "amount": "200 ml",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681801092085": {
    "gtin": "08681801092085",
    "name": "Atarax",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522259762": {
    "gtin": "08699522259762",
    "name": "Augmentin",
    "amount": "400 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699522259779": {
    "gtin": "08699522259779",
    "name": "Augmentin",
    "amount": "400 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699522095711": {
    "gtin": "08699522095711",
    "name": "Augmentin",
    "amount": "875 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699522095650": {
    "gtin": "08699522095650",
    "name": "Augmentin",
    "amount": "875 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699522095667": {
    "gtin": "08699522095667",
    "name": "Augmentin",
    "amount": "875 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699522285808": {
    "gtin": "08699522285808",
    "name": "Augmentin",
    "amount": "400 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522095605": {
    "gtin": "08699522095605",
    "name": "Augmentin",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699522288519": {
    "gtin": "08699522288519",
    "name": "Augmentin Es",
    "amount": "600 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522285754": {
    "gtin": "08699522285754",
    "name": "Augmentin",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522285792": {
    "gtin": "08699522285792",
    "name": "Augmentin",
    "amount": "400 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522095612": {
    "gtin": "08699522095612",
    "name": "Augmentin",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699522095704": {
    "gtin": "08699522095704",
    "name": "Augmentin",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699525282132": {
    "gtin": "08699525282132",
    "name": "Azıtro",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525282149": {
    "gtin": "08699525282149",
    "name": "Azıtro",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525092915": {
    "gtin": "08699525092915",
    "name": "Azıtro",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 6,
    "stockThreshold": 3
  },
  "08699525092267": {
    "gtin": "08699525092267",
    "name": "Azıtro",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 3,
    "stockThreshold": 3
  },
  "08699536090153": {
    "gtin": "08699536090153",
    "name": "Ator",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090757": {
    "gtin": "08699536090757",
    "name": "Ator",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699536090160": {
    "gtin": "08699536090160",
    "name": "Ator",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090764": {
    "gtin": "08699536090764",
    "name": "Ator",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699536090177": {
    "gtin": "08699536090177",
    "name": "Ator",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090771": {
    "gtin": "08699536090771",
    "name": "Ator",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699786751408": {
    "gtin": "08699786751408",
    "name": "Beloc",
    "amount": "5 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699786030107": {
    "gtin": "08699786030107",
    "name": "Beloc",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699786030374": {
    "gtin": "08699786030374",
    "name": "Beloc ZOK ZOK",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699786030121": {
    "gtin": "08699786030121",
    "name": "Beloc ZOK ZOK",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699786030114": {
    "gtin": "08699786030114",
    "name": "Beloc ZOK ZOK",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699786030367": {
    "gtin": "08699786030367",
    "name": "Beloc ZOK ZOK",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699786030138": {
    "gtin": "08699786030138",
    "name": "Beloc ZOK ZOK",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699525610089": {
    "gtin": "08699525610089",
    "name": "Bematorin %",
    "amount": "3 ml",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525610096": {
    "gtin": "08699525610096",
    "name": "Bematorin-t",
    "amount": "0.3 mg",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699525619273": {
    "gtin": "08699525619273",
    "name": "Bematorin %0.01 Göz Damlası",
    "amount": "2.5 ml",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546099429": {
    "gtin": "08699546099429",
    "name": "Benexol B12",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546095100": {
    "gtin": "08699546095100",
    "name": "Benexol B12",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699536090962": {
    "gtin": "08699536090962",
    "name": "Ator",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090979": {
    "gtin": "08699536090979",
    "name": "Ator",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699976021373": {
    "gtin": "08699976021373",
    "name": "Calcimax K",
    "amount": "1000mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 40,
    "stockThreshold": 6
  },
  "08697928020184": {
    "gtin": "08697928020184",
    "name": "Calcımax-d3",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08697928020061": {
    "gtin": "08697928020061",
    "name": "Calcımax-d3",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 40,
    "stockThreshold": 6
  },
  "08697928020191": {
    "gtin": "08697928020191",
    "name": "Calcımax-d3",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699504120097": {
    "gtin": "08699504120097",
    "name": "Cataflam",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699505152967": {
    "gtin": "08699505152967",
    "name": "Cellcept",
    "amount": "250 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Düzenli olarak 12 saat arayla bol su ile alınız.",
    "defaultStock": 300,
    "stockThreshold": 7
  },
  "08699505152752": {
    "gtin": "08699505152752",
    "name": "Cellcept",
    "amount": "250 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Düzenli olarak 12 saat arayla bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699505792422": {
    "gtin": "08699505792422",
    "name": "Cellcept",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Düzenli olarak 12 saat arayla bol su ile alınız.",
    "defaultStock": 4,
    "stockThreshold": 3
  },
  "08699504011302": {
    "gtin": "08699504011302",
    "name": "Certıcan",
    "amount": "0.25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699504070002": {
    "gtin": "08699504070002",
    "name": "Certıcan",
    "amount": "0.25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699504011357": {
    "gtin": "08699504011357",
    "name": "Certıcan",
    "amount": "0.75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699795091090": {
    "gtin": "08699795091090",
    "name": "Cıpralex",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699795091199": {
    "gtin": "08699795091199",
    "name": "Cıpralex",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699795091083": {
    "gtin": "08699795091083",
    "name": "Cıpralex",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699795091106": {
    "gtin": "08699795091106",
    "name": "Cıpralex",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699795091205": {
    "gtin": "08699795091205",
    "name": "Cıpralex",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699795091113": {
    "gtin": "08699795091113",
    "name": "Cıpralex",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699795591019": {
    "gtin": "08699795591019",
    "name": "Cıpralex",
    "amount": "20 mg",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699795091120": {
    "gtin": "08699795091120",
    "name": "Cıpralex",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699795091137": {
    "gtin": "08699795091137",
    "name": "Cıpralex",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699795090703": {
    "gtin": "08699795090703",
    "name": "Cıpralex",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699795090710": {
    "gtin": "08699795090710",
    "name": "Cıpralex",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699578610418": {
    "gtin": "08699578610418",
    "name": "Cıpro %0.3 Goz Damlası",
    "amount": "5 ml",
    "form": "damla",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699578690410": {
    "gtin": "08699578690410",
    "name": "Cıpro",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699578090418": {
    "gtin": "08699578090418",
    "name": "Cıpro",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699578690427": {
    "gtin": "08699578690427",
    "name": "Cıpro",
    "amount": "400 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699578090531": {
    "gtin": "08699578090531",
    "name": "Cıpro",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699578090425": {
    "gtin": "08699578090425",
    "name": "Cıpro",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699578090432": {
    "gtin": "08699578090432",
    "name": "Cıpro",
    "amount": "750 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08680008770017": {
    "gtin": "08680008770017",
    "name": "Cıprocam",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08680008770024": {
    "gtin": "08680008770024",
    "name": "Cıprocam",
    "amount": "400 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694472": {
    "gtin": "08699606694472",
    "name": "Cıprodeks",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694489": {
    "gtin": "08699606694489",
    "name": "Cıprodeks",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694496": {
    "gtin": "08699606694496",
    "name": "Cıprodeks",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694502": {
    "gtin": "08699606694502",
    "name": "Cıprodeks",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828690023": {
    "gtin": "08699828690023",
    "name": "Cıproktan",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828690061": {
    "gtin": "08699828690061",
    "name": "Cıproktan",
    "amount": "400mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699579090172": {
    "gtin": "08699579090172",
    "name": "Cıproktan",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699828090403": {
    "gtin": "08699828090403",
    "name": "Cıproktan",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699788090017": {
    "gtin": "08699788090017",
    "name": "Cıprolon",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699788090024": {
    "gtin": "08699788090024",
    "name": "Cıprolon",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699717690073": {
    "gtin": "08699717690073",
    "name": "Cıpronatın",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699717090033": {
    "gtin": "08699717090033",
    "name": "Cıpronatın",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699717690080": {
    "gtin": "08699717690080",
    "name": "Cıpronatın",
    "amount": "400 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699717090040": {
    "gtin": "08699717090040",
    "name": "Cıpronatın",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699717090071": {
    "gtin": "08699717090071",
    "name": "Cıpronatın",
    "amount": "750 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699606694533": {
    "gtin": "08699606694533",
    "name": "Cıpropol",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694540": {
    "gtin": "08699606694540",
    "name": "Cıpropol",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694557": {
    "gtin": "08699606694557",
    "name": "Cıpropol",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699606694564": {
    "gtin": "08699606694564",
    "name": "Cıpropol",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514097020": {
    "gtin": "08699514097020",
    "name": "Cıtoles",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699514096375": {
    "gtin": "08699514096375",
    "name": "Cıtoles",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699514090922": {
    "gtin": "08699514090922",
    "name": "Cıtoles",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699514090946": {
    "gtin": "08699514090946",
    "name": "Cıtoles",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699514596837": {
    "gtin": "08699514596837",
    "name": "Cıtoles",
    "amount": "10 mg",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514097037": {
    "gtin": "08699514097037",
    "name": "Cıtoles",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699514096382": {
    "gtin": "08699514096382",
    "name": "Cıtoles",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699514090939": {
    "gtin": "08699514090939",
    "name": "Cıtoles",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699514090953": {
    "gtin": "08699514090953",
    "name": "Cıtoles",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699514096368": {
    "gtin": "08699514096368",
    "name": "Cıtoles",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699828090663": {
    "gtin": "08699828090663",
    "name": "Ciproktan",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile alınız, süt ürünleriyle birlikte almayınız.",
    "defaultStock": 250,
    "stockThreshold": 7
  },
  "08699504090659": {
    "gtin": "08699504090659",
    "name": "Co-dıovan 160/",
    "amount": "12.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504091984": {
    "gtin": "08699504091984",
    "name": "Co-dıovan 160/",
    "amount": "12.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699504090970": {
    "gtin": "08699504090970",
    "name": "Co-dıovan 160/",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504091991": {
    "gtin": "08699504091991",
    "name": "Co-dıovan 160/",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699504091236": {
    "gtin": "08699504091236",
    "name": "Co-dıovan 320/12",
    "amount": "12.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504091243": {
    "gtin": "08699504091243",
    "name": "Co-dıovan 320/",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504090406": {
    "gtin": "08699504090406",
    "name": "Co-dıovan 80/",
    "amount": "12.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504091977": {
    "gtin": "08699504091977",
    "name": "Co-dıovan 80/",
    "amount": "12.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699546130023": {
    "gtin": "08699546130023",
    "name": "Coraspin",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile çiğnemeden içiniz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699546130238": {
    "gtin": "08699546130238",
    "name": "Coraspin",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile çiğnemeden içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546040247": {
    "gtin": "08699546040247",
    "name": "Coraspin",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile çiğnemeden içiniz.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699546130016": {
    "gtin": "08699546130016",
    "name": "Coraspin",
    "amount": "300 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile çiğnemeden içiniz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699546130153": {
    "gtin": "08699546130153",
    "name": "Coraspin",
    "amount": "300 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile çiğnemeden içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699809018860": {
    "gtin": "08699809018860",
    "name": "Warfmadin",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Her gün aynı saatte (tercihen akşam) alınız. K vitamini içeren besinlere dikkat ediniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018853": {
    "gtin": "08699809018853",
    "name": "Warfmadin",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Her gün aynı saatte (tercihen akşam) alınız. K vitamini içeren besinlere dikkat ediniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786092761": {
    "gtin": "08699786092761",
    "name": "Crestor",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786092778": {
    "gtin": "08699786092778",
    "name": "Crestor",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699786090163": {
    "gtin": "08699786090163",
    "name": "Crestor",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786090248": {
    "gtin": "08699786090248",
    "name": "Crestor",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699786090187": {
    "gtin": "08699786090187",
    "name": "Crestor",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786090255": {
    "gtin": "08699786090255",
    "name": "Crestor",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699786090262": {
    "gtin": "08699786090262",
    "name": "Crestor",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786090279": {
    "gtin": "08699786090279",
    "name": "Crestor",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08681308011084": {
    "gtin": "08681308011084",
    "name": "Debrıdat",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08681308011077": {
    "gtin": "08681308011077",
    "name": "Debrıdat",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 40,
    "stockThreshold": 6
  },
  "08681308281043": {
    "gtin": "08681308281043",
    "name": "Debrıdat",
    "amount": "24 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681308011053": {
    "gtin": "08681308011053",
    "name": "Debrıdat Fort Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08681308011060": {
    "gtin": "08681308011060",
    "name": "Debrıdat Fort Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 40,
    "stockThreshold": 6
  },
  "08681308017994": {
    "gtin": "08681308017994",
    "name": "Debrıdat Fort Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699809011625": {
    "gtin": "08699809011625",
    "name": "Delıx",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018396": {
    "gtin": "08699809018396",
    "name": "Delıx",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699809011632": {
    "gtin": "08699809011632",
    "name": "Delix Plus",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018419": {
    "gtin": "08699809018419",
    "name": "Delix Plus",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699809018389": {
    "gtin": "08699809018389",
    "name": "Delıx",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699809011656": {
    "gtin": "08699809011656",
    "name": "Delıx Plus",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018297": {
    "gtin": "08699809018297",
    "name": "Delix Plus",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018303": {
    "gtin": "08699809018303",
    "name": "Delıx Plus",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018402": {
    "gtin": "08699809018402",
    "name": "Delıx Plus",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699809010505": {
    "gtin": "08699809010505",
    "name": "Delıx Protect",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809018440": {
    "gtin": "08699809018440",
    "name": "Delıx Protect",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08681308011152": {
    "gtin": "08681308011152",
    "name": "Deltacortrıl",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699525750426": {
    "gtin": "08699525750426",
    "name": "Devit-3 300.000 I.u. /ml I.m. Çözelti Içeren Ampul",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699525751294": {
    "gtin": "08699525751294",
    "name": "Devit-3 300.000 I.u. /ml I.m. Çözelti Içeren Ampul",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699525750082": {
    "gtin": "08699525750082",
    "name": "Devit-3 300.000 I.u. /ml I.m. Çözelti Içeren Ampul",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699525590435": {
    "gtin": "08699525590435",
    "name": "Devit-3 50.000 I.u./",
    "amount": "15 ml",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699552030058": {
    "gtin": "08699552030058",
    "name": "Diamicron",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699552030065": {
    "gtin": "08699552030065",
    "name": "Diamicron",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699552030072": {
    "gtin": "08699552030072",
    "name": "Diamicron",
    "amount": "60 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699552030089": {
    "gtin": "08699552030089",
    "name": "Diamicron",
    "amount": "60 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699552030096": {
    "gtin": "08699552030096",
    "name": "Diamicron",
    "amount": "60 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699514759416": {
    "gtin": "08699514759416",
    "name": "Dıclomec",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514759409": {
    "gtin": "08699514759409",
    "name": "Dıclomec",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 4,
    "stockThreshold": 3
  },
  "08699514040064": {
    "gtin": "08699514040064",
    "name": "Dıclomec Ec",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699514346302": {
    "gtin": "08699514346302",
    "name": "Dıclomec %",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514340096": {
    "gtin": "08699514340096",
    "name": "Dıclomec Plus %",
    "amount": "30 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514351245": {
    "gtin": "08699514351245",
    "name": "Dıclomec Plus %",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514039280": {
    "gtin": "08699514039280",
    "name": "Dıclomec Sr",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514030010": {
    "gtin": "08699514030010",
    "name": "Dıclomec Sr",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699514030188": {
    "gtin": "08699514030188",
    "name": "Dıclomec Sr",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514030027": {
    "gtin": "08699514030027",
    "name": "Dıclomec Sr",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08682340179008": {
    "gtin": "08682340179008",
    "name": "Dideral",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699504090758": {
    "gtin": "08699504090758",
    "name": "Dıovan",
    "amount": "160 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504091960": {
    "gtin": "08699504091960",
    "name": "Dıovan",
    "amount": "160 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699504091113": {
    "gtin": "08699504091113",
    "name": "Dıovan",
    "amount": "320 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504090703": {
    "gtin": "08699504090703",
    "name": "Dıovan",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699504091953": {
    "gtin": "08699504091953",
    "name": "Dıovan",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699580090130": {
    "gtin": "08699580090130",
    "name": "Dıvator",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699580090352": {
    "gtin": "08699580090352",
    "name": "Dıvator",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699580090093": {
    "gtin": "08699580090093",
    "name": "Dıvator",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699580090369": {
    "gtin": "08699580090369",
    "name": "Dıvator",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699580090109": {
    "gtin": "08699580090109",
    "name": "Dıvator",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699580090376": {
    "gtin": "08699580090376",
    "name": "Dıvator",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699514120131": {
    "gtin": "08699514120131",
    "name": "Dolorex",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699514129110": {
    "gtin": "08699514129110",
    "name": "Dolorex",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699514040019": {
    "gtin": "08699514040019",
    "name": "Ecopırın",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514040040": {
    "gtin": "08699514040040",
    "name": "Ecopırın",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699514040026": {
    "gtin": "08699514040026",
    "name": "Ecopırın",
    "amount": "150 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514040057": {
    "gtin": "08699514040057",
    "name": "Ecopırın",
    "amount": "150 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699514040033": {
    "gtin": "08699514040033",
    "name": "Ecopırın",
    "amount": "300 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514130451": {
    "gtin": "08699514130451",
    "name": "Ecopırın",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699514041238": {
    "gtin": "08699514041238",
    "name": "Ecopırın Pro",
    "amount": "81 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514041245": {
    "gtin": "08699514041245",
    "name": "Ecopırın Pro",
    "amount": "81 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Bol su ile yemekten sonra alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08681308095152": {
    "gtin": "08681308095152",
    "name": "Eliquis",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681308098016": {
    "gtin": "08681308098016",
    "name": "Eliquis",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08681308098023": {
    "gtin": "08681308098023",
    "name": "Eliquis",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08681308010087": {
    "gtin": "08681308010087",
    "name": "Eliquis",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08681308096166": {
    "gtin": "08681308096166",
    "name": "Eliquis",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08681308010094": {
    "gtin": "08681308010094",
    "name": "Eliquis",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699808010056": {
    "gtin": "08699808010056",
    "name": "Euthyrox",
    "amount": "150 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699808010100": {
    "gtin": "08699808010100",
    "name": "Euthyrox",
    "amount": "175 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699808010063": {
    "gtin": "08699808010063",
    "name": "Euthyrox",
    "amount": "200 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699808010032": {
    "gtin": "08699808010032",
    "name": "Euthyrox",
    "amount": "25 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699808010049": {
    "gtin": "08699808010049",
    "name": "Euthyrox",
    "amount": "50 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699808010070": {
    "gtin": "08699808010070",
    "name": "Euthyrox",
    "amount": "75 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699522521500": {
    "gtin": "08699522521500",
    "name": "Flıxotıde",
    "amount": "0.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522521517": {
    "gtin": "08699522521517",
    "name": "Flıxotıde",
    "amount": "2 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553563": {
    "gtin": "08699522553563",
    "name": "Flixotide Diskus",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553570": {
    "gtin": "08699522553570",
    "name": "Flixotide Diskus",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553587": {
    "gtin": "08699522553587",
    "name": "Flixotide Diskus",
    "amount": "250 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553594": {
    "gtin": "08699522553594",
    "name": "Flixotide Diskus",
    "amount": "250 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553556": {
    "gtin": "08699522553556",
    "name": "Flıxotıde Dıskus",
    "amount": "50 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522523610": {
    "gtin": "08699522523610",
    "name": "Flıxotıde",
    "amount": "125 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522523535": {
    "gtin": "08699522523535",
    "name": "Flıxotıde",
    "amount": "125 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522523603": {
    "gtin": "08699522523603",
    "name": "Flıxotıde Inhaler",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522523528": {
    "gtin": "08699522523528",
    "name": "Flıxotıde Inhaler",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699504011401": {
    "gtin": "08699504011401",
    "name": "Galvus",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 180,
    "stockThreshold": 7
  },
  "08699504012163": {
    "gtin": "08699504012163",
    "name": "Galvus",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699504093049": {
    "gtin": "08699504093049",
    "name": "Galvus Met 50/",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 120,
    "stockThreshold": 7
  },
  "08699504093056": {
    "gtin": "08699504093056",
    "name": "Galvus Met 50/",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 180,
    "stockThreshold": 7
  },
  "08699504093018": {
    "gtin": "08699504093018",
    "name": "Galvus Met 50/",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699504093025": {
    "gtin": "08699504093025",
    "name": "Galvus Met 50/",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 120,
    "stockThreshold": 7
  },
  "08699504093032": {
    "gtin": "08699504093032",
    "name": "Galvus Met 50/",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 180,
    "stockThreshold": 7
  },
  "08699504093001": {
    "gtin": "08699504093001",
    "name": "Galvus Met 50/",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08690570700046": {
    "gtin": "08690570700046",
    "name": "Gaviscon",
    "amount": "200 ml",
    "form": "surup",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08690570080001": {
    "gtin": "08690570080001",
    "name": "Gaviscon",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08690570081060": {
    "gtin": "08690570081060",
    "name": "Gaviscon",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08690570701067": {
    "gtin": "08690570701067",
    "name": "Gaviscon Double Action",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08690570701104": {
    "gtin": "08690570701104",
    "name": "Gaviscon Double Action",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08690570250022": {
    "gtin": "08690570250022",
    "name": "Gaviscon",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08690570700039": {
    "gtin": "08690570700039",
    "name": "Gaviscon",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemeklerden sonra ve yatarken iyice çalkalayarak içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569090717": {
    "gtin": "08699569090717",
    "name": "Glifor",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699569090366": {
    "gtin": "08699569090366",
    "name": "Glifor",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699569090359": {
    "gtin": "08699569090359",
    "name": "Glifor",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699569030300": {
    "gtin": "08699569030300",
    "name": "Glifor Plus",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569030317": {
    "gtin": "08699569030317",
    "name": "Glifor Plus",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699569030263": {
    "gtin": "08699569030263",
    "name": "Glifor Plus",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569030270": {
    "gtin": "08699569030270",
    "name": "Glifor Plus",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699569030287": {
    "gtin": "08699569030287",
    "name": "Glifor Plus",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569030294": {
    "gtin": "08699569030294",
    "name": "Glifor Plus",
    "amount": "30 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699569091691": {
    "gtin": "08699569091691",
    "name": "Glifor",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 112,
    "stockThreshold": 7
  },
  "08699569091677": {
    "gtin": "08699569091677",
    "name": "Glifor",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699569091684": {
    "gtin": "08699569091684",
    "name": "Glifor",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699569091530": {
    "gtin": "08699569091530",
    "name": "Glifor",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 112,
    "stockThreshold": 7
  },
  "08699569091509": {
    "gtin": "08699569091509",
    "name": "Glifor",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699636091524": {
    "gtin": "08699636091524",
    "name": "Januvia",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699636090916": {
    "gtin": "08699636090916",
    "name": "Januvia",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699693090119": {
    "gtin": "08699693090119",
    "name": "Jardiance",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699693090126": {
    "gtin": "08699693090126",
    "name": "Jardiance",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536093024": {
    "gtin": "08699536093024",
    "name": "Karum",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699536093031": {
    "gtin": "08699536093031",
    "name": "Karum",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699586092121": {
    "gtin": "08699586092121",
    "name": "Kestıne",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699586092237": {
    "gtin": "08699586092237",
    "name": "Kestıne",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699569280248": {
    "gtin": "08699569280248",
    "name": "Klamoks",
    "amount": "125 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280064": {
    "gtin": "08699569280064",
    "name": "Klamoks",
    "amount": "125 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280057": {
    "gtin": "08699569280057",
    "name": "Klamoks Fort",
    "amount": "250 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280262": {
    "gtin": "08699569280262",
    "name": "Klamoks Fort",
    "amount": "250 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569090458": {
    "gtin": "08699569090458",
    "name": "Klamoks",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569090328": {
    "gtin": "08699569090328",
    "name": "Klamoks-BID",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699569090694": {
    "gtin": "08699569090694",
    "name": "Klamoks-BID",
    "amount": "875 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699569280484": {
    "gtin": "08699569280484",
    "name": "Klamoks-BID",
    "amount": "28 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280231": {
    "gtin": "08699569280231",
    "name": "Klamoks-BID",
    "amount": "28 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280392": {
    "gtin": "08699569280392",
    "name": "Klamoks Fort",
    "amount": "57 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280217": {
    "gtin": "08699569280217",
    "name": "Klamoks Fort",
    "amount": "57 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280224": {
    "gtin": "08699569280224",
    "name": "Klamoks Fort",
    "amount": "57 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569092605": {
    "gtin": "08699569092605",
    "name": "Klamoks",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569090809": {
    "gtin": "08699569090809",
    "name": "Klamoks",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280422": {
    "gtin": "08699569280422",
    "name": "Klamoks Fort",
    "amount": "57 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280453": {
    "gtin": "08699569280453",
    "name": "Klamoks",
    "amount": "600 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280446": {
    "gtin": "08699569280446",
    "name": "Klamoks",
    "amount": "600 mg",
    "form": "surup",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699809754003": {
    "gtin": "08699809754003",
    "name": "Lasix",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 5,
    "stockThreshold": 3
  },
  "08699809014008": {
    "gtin": "08699809014008",
    "name": "Lasix",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 12,
    "stockThreshold": 3
  },
  "08699809018754": {
    "gtin": "08699809018754",
    "name": "Lasix",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514016700": {
    "gtin": "08699514016700",
    "name": "Levotiron",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514011187": {
    "gtin": "08699514011187",
    "name": "Levotiron",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514010951": {
    "gtin": "08699514010951",
    "name": "Levotiron",
    "amount": "125 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514010944": {
    "gtin": "08699514010944",
    "name": "Levotiron",
    "amount": "125 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514010975": {
    "gtin": "08699514010975",
    "name": "Levotiron",
    "amount": "150 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514010968": {
    "gtin": "08699514010968",
    "name": "Levotiron",
    "amount": "150 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514010999": {
    "gtin": "08699514010999",
    "name": "Levotiron",
    "amount": "175 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514010982": {
    "gtin": "08699514010982",
    "name": "Levotiron",
    "amount": "175 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514011019": {
    "gtin": "08699514011019",
    "name": "Levotiron",
    "amount": "200 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514011002": {
    "gtin": "08699514011002",
    "name": "Levotiron",
    "amount": "200 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514010098": {
    "gtin": "08699514010098",
    "name": "Levotiron",
    "amount": "25 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514010173": {
    "gtin": "08699514010173",
    "name": "Levotiron",
    "amount": "25 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514010104": {
    "gtin": "08699514010104",
    "name": "Levotiron",
    "amount": "50 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514010180": {
    "gtin": "08699514010180",
    "name": "Levotiron",
    "amount": "50 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514010111": {
    "gtin": "08699514010111",
    "name": "Levotiron",
    "amount": "75 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514010197": {
    "gtin": "08699514010197",
    "name": "Levotiron",
    "amount": "75 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah aç karnına bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699532090201": {
    "gtin": "08699532090201",
    "name": "Lipitor",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532091420": {
    "gtin": "08699532091420",
    "name": "Lipitor",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699532095015": {
    "gtin": "08699532095015",
    "name": "Lipitor",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532091475": {
    "gtin": "08699532091475",
    "name": "Lipitor",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699532095190": {
    "gtin": "08699532095190",
    "name": "Lipitor",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532095541": {
    "gtin": "08699532095541",
    "name": "Lipitor",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532094964": {
    "gtin": "08699532094964",
    "name": "Lipitor",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699532099693": {
    "gtin": "08699532099693",
    "name": "Lustral",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699532090041": {
    "gtin": "08699532090041",
    "name": "Lustral",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699532095473": {
    "gtin": "08699532095473",
    "name": "Lustral",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699532096739": {
    "gtin": "08699532096739",
    "name": "Lustral",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699532098603": {
    "gtin": "08699532098603",
    "name": "Lustral Specıal",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699532095428": {
    "gtin": "08699532095428",
    "name": "Lustral Specıal",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699532090140": {
    "gtin": "08699532090140",
    "name": "Lustral Specıal",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699536160078": {
    "gtin": "08699536160078",
    "name": "Lansor",
    "amount": "15 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan en az 30 dakika önce aç içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536160016": {
    "gtin": "08699536160016",
    "name": "Lansor",
    "amount": "30 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan en az 30 dakika önce aç içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699536160085": {
    "gtin": "08699536160085",
    "name": "Lansor",
    "amount": "30 mg",
    "form": "kapsul",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan en az 30 dakika önce aç içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699591010028": {
    "gtin": "08699591010028",
    "name": "Magosıt",
    "amount": "365 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536280158": {
    "gtin": "08699536280158",
    "name": "Macrol",
    "amount": "125 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536280011": {
    "gtin": "08699536280011",
    "name": "Macrol",
    "amount": "125 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090139": {
    "gtin": "08699536090139",
    "name": "Macrol",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699536280073": {
    "gtin": "08699536280073",
    "name": "Macrol",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536280028": {
    "gtin": "08699536280028",
    "name": "Macrol",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090146": {
    "gtin": "08699536090146",
    "name": "Macrol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699536030036": {
    "gtin": "08699536030036",
    "name": "Macrol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699536030104": {
    "gtin": "08699536030104",
    "name": "Macrol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699536030029": {
    "gtin": "08699536030029",
    "name": "Macrol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 7,
    "stockThreshold": 3
  },
  "08699536640013": {
    "gtin": "08699536640013",
    "name": "Majezik",
    "amount": "200 ml",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536510019": {
    "gtin": "08699536510019",
    "name": "Majezik",
    "amount": "30 ml",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536510026": {
    "gtin": "08699536510026",
    "name": "Majezik",
    "amount": "50 ml",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090115": {
    "gtin": "08699536090115",
    "name": "Majezik",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 15,
    "stockThreshold": 3
  },
  "08699536090122": {
    "gtin": "08699536090122",
    "name": "Majezik",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536170053": {
    "gtin": "08699536170053",
    "name": "Majezik",
    "amount": "200 mg",
    "form": "kapsul",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 16,
    "stockThreshold": 3
  },
  "08699536170046": {
    "gtin": "08699536170046",
    "name": "Majezik",
    "amount": "200 mg",
    "form": "kapsul",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090092": {
    "gtin": "08699536090092",
    "name": "Majezik",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 15,
    "stockThreshold": 3
  },
  "08699536090108": {
    "gtin": "08699536090108",
    "name": "Majezik",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699514085621": {
    "gtin": "08699514085621",
    "name": "Maltofer Fol",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536092492": {
    "gtin": "08699536092492",
    "name": "Majezik",
    "amount": "100mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699536340043": {
    "gtin": "08699536340043",
    "name": "Majezik",
    "amount": "30 g",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536340074": {
    "gtin": "08699536340074",
    "name": "Majezik",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536510033": {
    "gtin": "08699536510033",
    "name": "Majezik",
    "amount": "50 ml",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536070308": {
    "gtin": "08699536070308",
    "name": "Majezik",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 15,
    "stockThreshold": 3
  },
  "08699536070315": {
    "gtin": "08699536070315",
    "name": "Majezik",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536640020": {
    "gtin": "08699536640020",
    "name": "Majezik Plus",
    "amount": "200 ml",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536340036": {
    "gtin": "08699536340036",
    "name": "Majezik",
    "amount": "30 g",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536340067": {
    "gtin": "08699536340067",
    "name": "Majezik",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699693010087": {
    "gtin": "08699693010087",
    "name": "Mıcardıs",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699693010094": {
    "gtin": "08699693010094",
    "name": "Mıcardıs",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699693010155": {
    "gtin": "08699693010155",
    "name": "Mıcardıs Plus",
    "amount": "80 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010154": {
    "gtin": "08680760010154",
    "name": "Mıcator",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010161": {
    "gtin": "08680760010161",
    "name": "Mıcator-40-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010291": {
    "gtin": "08680760010291",
    "name": "Mıcator-40-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08680760010178": {
    "gtin": "08680760010178",
    "name": "Mıcator-80-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010307": {
    "gtin": "08680760010307",
    "name": "Mıcator-80-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08680760010260": {
    "gtin": "08680760010260",
    "name": "Mıcator-plus-40-12.5-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010277": {
    "gtin": "08680760010277",
    "name": "Mıcator-plus-40-12.5-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08680760010321": {
    "gtin": "08680760010321",
    "name": "Mıcator-plus-80-12.5-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 98,
    "stockThreshold": 7
  },
  "08680760010246": {
    "gtin": "08680760010246",
    "name": "Mıcator-plus-80-12.5-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010253": {
    "gtin": "08680760010253",
    "name": "Mıcator-plus-80-12.5-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08680760010314": {
    "gtin": "08680760010314",
    "name": "Mıcator-plus-80-25-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 98,
    "stockThreshold": 7
  },
  "08680760010222": {
    "gtin": "08680760010222",
    "name": "Mıcator-plus-80-25-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08680760010239": {
    "gtin": "08680760010239",
    "name": "Mıcator-plus-80-25-mg-tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699546015597": {
    "gtin": "08699546015597",
    "name": "Mınoset",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699546575589": {
    "gtin": "08699546575589",
    "name": "Mınoset",
    "amount": "150mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546015627": {
    "gtin": "08699546015627",
    "name": "Mınoset Plus",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699546015610": {
    "gtin": "08699546015610",
    "name": "Mınoset Plus",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536090634": {
    "gtin": "08699536090634",
    "name": "Matofin",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699536030210": {
    "gtin": "08699536030210",
    "name": "Matofin",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699828250074": {
    "gtin": "08699828250074",
    "name": "Mucolator",
    "amount": "1200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828250067": {
    "gtin": "08699828250067",
    "name": "Mucolator",
    "amount": "1200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828570219": {
    "gtin": "08699828570219",
    "name": "Mucolator",
    "amount": "150 ml",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828250036": {
    "gtin": "08699828250036",
    "name": "Mucolator",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828570202": {
    "gtin": "08699828570202",
    "name": "Mucolator Pedıatrık",
    "amount": "100 ml",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699828250043": {
    "gtin": "08699828250043",
    "name": "Mucolator Plus",
    "amount": "600 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699828250050": {
    "gtin": "08699828250050",
    "name": "Mucolator Plus",
    "amount": "600 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536030142": {
    "gtin": "08699536030142",
    "name": "Matofin",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699536030227": {
    "gtin": "08699536030227",
    "name": "Matofin",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699536030449": {
    "gtin": "08699536030449",
    "name": "Matofin",
    "amount": "1000 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699536090610": {
    "gtin": "08699536090610",
    "name": "Matofin",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699536030432": {
    "gtin": "08699536030432",
    "name": "Matofin",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699536030067": {
    "gtin": "08699536030067",
    "name": "Matofin",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699504040050": {
    "gtin": "08699504040050",
    "name": "Myfortic Fort",
    "amount": "180 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Düzenli olarak 12 saat arayla bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699504040104": {
    "gtin": "08699504040104",
    "name": "Myfortic Fort",
    "amount": "360 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Düzenli olarak 12 saat arayla bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699536090627": {
    "gtin": "08699536090627",
    "name": "Matofin",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699786040014": {
    "gtin": "08699786040014",
    "name": "Nexium",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan 30 dakika önce aç karnına içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699786040038": {
    "gtin": "08699786040038",
    "name": "Nexium",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan 30 dakika önce aç karnına içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786040021": {
    "gtin": "08699786040021",
    "name": "Nexium",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan 30 dakika önce aç karnına içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699786040045": {
    "gtin": "08699786040045",
    "name": "Nexium",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan 30 dakika önce aç karnına içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08523025632102": {
    "gtin": "08523025632102",
    "name": "Norvasc",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532059659": {
    "gtin": "08699532059659",
    "name": "Norvasc",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699532059666": {
    "gtin": "08699532059666",
    "name": "Norvasc",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699532011718": {
    "gtin": "08699532011718",
    "name": "Norvasc",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699532015334": {
    "gtin": "08699532015334",
    "name": "Norvasc",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532014085": {
    "gtin": "08699532014085",
    "name": "Norvasc",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699532059635": {
    "gtin": "08699532059635",
    "name": "Norvasc",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699532059642": {
    "gtin": "08699532059642",
    "name": "Norvasc",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699532055767": {
    "gtin": "08699532055767",
    "name": "Norvasc",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532011701": {
    "gtin": "08699532011701",
    "name": "Norvasc",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699532015327": {
    "gtin": "08699532015327",
    "name": "Norvasc",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532014078": {
    "gtin": "08699532014078",
    "name": "Norvasc",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699525044013": {
    "gtin": "08699525044013",
    "name": "Pandev",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699525043924": {
    "gtin": "08699525043924",
    "name": "Pandev",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699525043931": {
    "gtin": "08699525043931",
    "name": "Pandev",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699525043948": {
    "gtin": "08699525043948",
    "name": "Pandev",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699525796981": {
    "gtin": "08699525796981",
    "name": "Pandev",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08682758040037": {
    "gtin": "08682758040037",
    "name": "Pantpas",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08682758790017": {
    "gtin": "08682758790017",
    "name": "Pantpas",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08682758040020": {
    "gtin": "08682758040020",
    "name": "Pantpas",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699717010192": {
    "gtin": "08699717010192",
    "name": "Parol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699717690035": {
    "gtin": "08699717690035",
    "name": "Parol",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699717690011": {
    "gtin": "08699717690011",
    "name": "Parol",
    "amount": "10 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717700062": {
    "gtin": "08699717700062",
    "name": "Parol",
    "amount": "120 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717700093": {
    "gtin": "08699717700093",
    "name": "Parol",
    "amount": "120 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717700079": {
    "gtin": "08699717700079",
    "name": "Parol",
    "amount": "250 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717700109": {
    "gtin": "08699717700109",
    "name": "Parol Plus",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717010109": {
    "gtin": "08699717010109",
    "name": "Parol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699717010093": {
    "gtin": "08699717010093",
    "name": "Parol",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717250024": {
    "gtin": "08699717250024",
    "name": "Parol",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717250017": {
    "gtin": "08699717250017",
    "name": "Parol",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699717010116": {
    "gtin": "08699717010116",
    "name": "Parol Plus",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699560890071": {
    "gtin": "08699560890071",
    "name": "Parol",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Ağrı veya ateş durumunda bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699809097698": {
    "gtin": "08699809097698",
    "name": "Plavix",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Her gün aynı saatte bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809098190": {
    "gtin": "08699809098190",
    "name": "Plavix",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Her gün aynı saatte bol su ile alınız.",
    "defaultStock": 90,
    "stockThreshold": 7
  },
  "08699693150103": {
    "gtin": "08699693150103",
    "name": "Pradaxa",
    "amount": "110 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699693150059": {
    "gtin": "08699693150059",
    "name": "Pradaxa",
    "amount": "110 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699693150127": {
    "gtin": "08699693150127",
    "name": "Pradaxa",
    "amount": "150 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699693150097": {
    "gtin": "08699693150097",
    "name": "Pradaxa",
    "amount": "75 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699693150042": {
    "gtin": "08699693150042",
    "name": "Pradaxa",
    "amount": "75 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699541010504": {
    "gtin": "08699541010504",
    "name": "Prednol",
    "amount": "16 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699541010412": {
    "gtin": "08699541010412",
    "name": "Prednol",
    "amount": "4 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699541010405": {
    "gtin": "08699541010405",
    "name": "Prednol",
    "amount": "4 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699541350013": {
    "gtin": "08699541350013",
    "name": "Prednol %0.125 Krem",
    "amount": "30 g",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699541380010": {
    "gtin": "08699541380010",
    "name": "Prednol %0.125 Merhem",
    "amount": "30 g",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699541350105": {
    "gtin": "08699541350105",
    "name": "Prednol-a 30 Gr Krem",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699541380102": {
    "gtin": "08699541380102",
    "name": "Prednol-a 30 Gr Pomad",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699541790901": {
    "gtin": "08699541790901",
    "name": "Prednol-l",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699541790932": {
    "gtin": "08699541790932",
    "name": "Prednol-l",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699541790925": {
    "gtin": "08699541790925",
    "name": "Prednol-l",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699541791007": {
    "gtin": "08699541791007",
    "name": "Prednol-l",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699541791038": {
    "gtin": "08699541791038",
    "name": "Prednol-l",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699541791014": {
    "gtin": "08699541791014",
    "name": "Prednol-l",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 3,
    "stockThreshold": 3
  },
  "08699541791021": {
    "gtin": "08699541791021",
    "name": "Prednol-l",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699541791205": {
    "gtin": "08699541791205",
    "name": "Prednol-l",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699541791229": {
    "gtin": "08699541791229",
    "name": "Prednol-l",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699541791212": {
    "gtin": "08699541791212",
    "name": "Prednol-l",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Sabah kahvaltıdan sonra tok karnına alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890321": {
    "gtin": "08699043890321",
    "name": "Prograf",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Her gün tam olarak aynı saatte (12 saatte bir) bol su ile alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890338": {
    "gtin": "08699043890338",
    "name": "Prograf",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Her gün tam olarak aynı saatte (12 saatte bir) bol su ile alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890345": {
    "gtin": "08699043890345",
    "name": "Prograf",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Her gün tam olarak aynı saatte (12 saatte bir) bol su ile alınız. Greyfurt yemeyiniz.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699043890352": {
    "gtin": "08699043890352",
    "name": "Prograf",
    "amount": "5 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Her gün tam olarak aynı saatte (12 saatte bir) bol su ile alınız. Greyfurt yemeyiniz.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699540040106": {
    "gtin": "08699540040106",
    "name": "Pulcet",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699540040113": {
    "gtin": "08699540040113",
    "name": "Pulcet",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699540040151": {
    "gtin": "08699540040151",
    "name": "Pulcet",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699540040168": {
    "gtin": "08699540040168",
    "name": "Pulcet",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699786520011": {
    "gtin": "08699786520011",
    "name": "Pulmıcort",
    "amount": "0.25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699786520028": {
    "gtin": "08699786520028",
    "name": "Pulmıcort",
    "amount": "0.50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699786550025": {
    "gtin": "08699786550025",
    "name": "Pulmıcort",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550032": {
    "gtin": "08699786550032",
    "name": "Pulmıcort",
    "amount": "200 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550049": {
    "gtin": "08699786550049",
    "name": "Pulmıcort",
    "amount": "400 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681308015167": {
    "gtin": "08681308015167",
    "name": "Rapamune",
    "amount": "0.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08681308015099": {
    "gtin": "08681308015099",
    "name": "Rapamune",
    "amount": "0.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681308127464": {
    "gtin": "08681308127464",
    "name": "Rapamune",
    "amount": "1 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681308127457": {
    "gtin": "08681308127457",
    "name": "Rapamune",
    "amount": "1 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681308597472": {
    "gtin": "08681308597472",
    "name": "Rapamune",
    "amount": "1 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546085767": {
    "gtin": "08699546085767",
    "name": "Rennıe",
    "amount": "680 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 48,
    "stockThreshold": 7
  },
  "08699546705795": {
    "gtin": "08699546705795",
    "name": "Rennıe Duo",
    "amount": "600 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546705801": {
    "gtin": "08699546705801",
    "name": "Rennıe Duo",
    "amount": "600 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546705757": {
    "gtin": "08699546705757",
    "name": "Rennıe",
    "amount": "680 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699504760057": {
    "gtin": "08699504760057",
    "name": "Sandımmun",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699504190052": {
    "gtin": "08699504190052",
    "name": "Sandımmun Neoral",
    "amount": "100 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699504590005": {
    "gtin": "08699504590005",
    "name": "Sandımmun-neoral",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699504190007": {
    "gtin": "08699504190007",
    "name": "Sandımmun-neoral",
    "amount": "25 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699516038885": {
    "gtin": "08699516038885",
    "name": "Saneloc",
    "amount": "150 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536093147": {
    "gtin": "08699536093147",
    "name": "Selectra",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699536093154": {
    "gtin": "08699536093154",
    "name": "Selectra",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699536093161": {
    "gtin": "08699536093161",
    "name": "Selectra",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699522553242": {
    "gtin": "08699522553242",
    "name": "Seretıde",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522523078": {
    "gtin": "08699522523078",
    "name": "Seretide",
    "amount": "125 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553259": {
    "gtin": "08699522553259",
    "name": "Seretıde",
    "amount": "250 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522523085": {
    "gtin": "08699522523085",
    "name": "Seretide",
    "amount": "250 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522553266": {
    "gtin": "08699522553266",
    "name": "Seretıde",
    "amount": "500 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550124": {
    "gtin": "08699786550124",
    "name": "Symbicort Forte Turbuhaler",
    "amount": "320 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550117": {
    "gtin": "08699786550117",
    "name": "Symbicort Pediatrik Turbuhaler",
    "amount": "80 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550100": {
    "gtin": "08699786550100",
    "name": "Symbicort Pediatrik Turbuhaler",
    "amount": "80 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550094": {
    "gtin": "08699786550094",
    "name": "Symbicort Turbuhaler",
    "amount": "160 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699786550087": {
    "gtin": "08699786550087",
    "name": "Symbicort Turbuhaler",
    "amount": "160 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546080274": {
    "gtin": "08699546080274",
    "name": "Talcıd",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 40,
    "stockThreshold": 6
  },
  "08699546700288": {
    "gtin": "08699546700288",
    "name": "Talcıd",
    "amount": "500 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08682340179053": {
    "gtin": "08682340179053",
    "name": "Valcyte",
    "amount": "450 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08682340179060": {
    "gtin": "08682340179060",
    "name": "Valcyte",
    "amount": "50mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699523010379": {
    "gtin": "08699523010379",
    "name": "Varfarin",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699523010386": {
    "gtin": "08699523010386",
    "name": "Varfarin",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699522521456": {
    "gtin": "08699522521456",
    "name": "Ventolin",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522521494": {
    "gtin": "08699522521494",
    "name": "Ventolin",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699522571413": {
    "gtin": "08699522571413",
    "name": "Ventolin",
    "amount": "2 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699516023867": {
    "gtin": "08699516023867",
    "name": "Vermıdon",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699516251444": {
    "gtin": "08699516251444",
    "name": "Vermıdon Hot Tek Dozluk Toz Içeren Poşet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 12,
    "stockThreshold": 3
  },
  "08681428010592": {
    "gtin": "08681428010592",
    "name": "Vermıdon Plus Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428011940": {
    "gtin": "08681428011940",
    "name": "Vermıdon Plus Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699516010720": {
    "gtin": "08699516010720",
    "name": "Vermıdon Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699516013158": {
    "gtin": "08699516013158",
    "name": "Vermıdon Tablet",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699570570246": {
    "gtin": "08699570570246",
    "name": "A-ferin Zero",
    "amount": "120 mg",
    "form": "surup",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681291040306": {
    "gtin": "08681291040306",
    "name": "Voltaren",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681291040405": {
    "gtin": "08681291040405",
    "name": "Voltaren",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699504040012": {
    "gtin": "08699504040012",
    "name": "Voltaren",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08681291340086": {
    "gtin": "08681291340086",
    "name": "Voltaren Emulgel %1",
    "amount": "100 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681291340079": {
    "gtin": "08681291340079",
    "name": "Voltaren Emulgel %1",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699504030020": {
    "gtin": "08699504030020",
    "name": "Voltaren",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699504030037": {
    "gtin": "08699504030037",
    "name": "Voltaren",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699504030471": {
    "gtin": "08699504030471",
    "name": "Voltaren Sr",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699504030303": {
    "gtin": "08699504030303",
    "name": "Voltaren Sr",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699504890020": {
    "gtin": "08699504890020",
    "name": "Voltaren Suppozituar",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699504890013": {
    "gtin": "08699504890013",
    "name": "Voltaren Suppozituar",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 5,
    "stockThreshold": 3
  },
  "08699546093885": {
    "gtin": "08699546093885",
    "name": "Xarelto",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 10,
    "stockThreshold": 3
  },
  "08699546094110": {
    "gtin": "08699546094110",
    "name": "Xarelto",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699546094103": {
    "gtin": "08699546094103",
    "name": "Xarelto",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699546094097": {
    "gtin": "08699546094097",
    "name": "Xarelto",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 5,
    "stockThreshold": 3
  },
  "08699546093892": {
    "gtin": "08699546093892",
    "name": "Xarelto",
    "amount": "15 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699546094127": {
    "gtin": "08699546094127",
    "name": "Xarelto",
    "amount": "15 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 42,
    "stockThreshold": 6
  },
  "08699546090181": {
    "gtin": "08699546090181",
    "name": "Xarelto",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 168,
    "stockThreshold": 7
  },
  "08699546090174": {
    "gtin": "08699546090174",
    "name": "Xarelto",
    "amount": "2.5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699546093908": {
    "gtin": "08699546093908",
    "name": "Xarelto",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699570090164": {
    "gtin": "08699570090164",
    "name": "A-ferın Forte",
    "amount": "650 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 15,
    "stockThreshold": 3
  },
  "08699569091073": {
    "gtin": "08699569091073",
    "name": "Glifor",
    "amount": "850 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699569091516": {
    "gtin": "08699569091516",
    "name": "Glifor Sr",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Yemek sırasında veya yemekten hemen sonra alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699569280255": {
    "gtin": "08699569280255",
    "name": "Klamoks",
    "amount": "156.25 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699569280279": {
    "gtin": "08699569280279",
    "name": "Klamoks",
    "amount": "312.5 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699809759206": {
    "gtin": "08699809759206",
    "name": "Lasix",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699809759213": {
    "gtin": "08699809759213",
    "name": "Lasix",
    "amount": "20 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514040071": {
    "gtin": "08699514040071",
    "name": "Dıclomec Ec",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699570150189": {
    "gtin": "08699570150189",
    "name": "A-ferin",
    "amount": "300 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08699570150011": {
    "gtin": "08699570150011",
    "name": "A-ferin",
    "amount": "300 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525590442": {
    "gtin": "08699525590442",
    "name": "Devit-3",
    "amount": "200.000 iu",
    "form": "damla",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699536510040": {
    "gtin": "08699536510040",
    "name": "Majezik Plus %0.25 + %0.12 Oral Sprey",
    "amount": "30 ml",
    "form": "tablet",
    "mealCondition": "tok",
    "instructions": "Yemek sonrası bir bardak su ile içiniz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428031917": {
    "gtin": "08681428031917",
    "name": "Saneloc",
    "amount": "100 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08681428031375": {
    "gtin": "08681428031375",
    "name": "Saneloc",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428031894": {
    "gtin": "08681428031894",
    "name": "Saneloc",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 20,
    "stockThreshold": 3
  },
  "08681428031900": {
    "gtin": "08681428031900",
    "name": "Saneloc",
    "amount": "50 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Sabahları çiğnemeden bir bardak su ile yutunuz.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699808010087": {
    "gtin": "08699808010087",
    "name": "Euthyrox",
    "amount": "100 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699808010094": {
    "gtin": "08699808010094",
    "name": "Euthyrox",
    "amount": "125 mcg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah uyanır uyanmaz, kahvaltıdan en az 30 dk önce su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699569280385": {
    "gtin": "08699569280385",
    "name": "Klamoks-BID",
    "amount": "200 mg",
    "form": "tablet",
    "mealCondition": "yemekle",
    "instructions": "Öğün başlangıcında alınız, antibiyotik saatini aksatmayınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681291340420": {
    "gtin": "08681291340420",
    "name": "Voltaren Emulgel Forte %2.32 Jel",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08682758040044": {
    "gtin": "08682758040044",
    "name": "Pantpas",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699540270022": {
    "gtin": "08699540270022",
    "name": "Pulcet",
    "amount": "40 mg",
    "form": "tablet",
    "mealCondition": "ac",
    "instructions": "Sabah kahvaltıdan yarım saat önce aç içiniz.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699786520073": {
    "gtin": "08699786520073",
    "name": "Symbicort Rapihaler 160/4.",
    "amount": "4.5 mcg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525798497": {
    "gtin": "08699525798497",
    "name": "Azitro",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 1,
    "stockThreshold": 3
  },
  "08699525193681": {
    "gtin": "08699525193681",
    "name": "Devit-3 5000 I.u.yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08699514340072": {
    "gtin": "08699514340072",
    "name": "Diclomec Fort %2.32 Jel",
    "amount": "1 tablet",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525193797": {
    "gtin": "08699525193797",
    "name": "Devit-3 10.000 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699525193667": {
    "gtin": "08699525193667",
    "name": "Devit-3 1.000 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699525193810": {
    "gtin": "08699525193810",
    "name": "Devit-3 50.000 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 8,
    "stockThreshold": 3
  },
  "08699809156821": {
    "gtin": "08699809156821",
    "name": "Delix Forte",
    "amount": "10 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809156814": {
    "gtin": "08699809156814",
    "name": "Delix Forte",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699525193780": {
    "gtin": "08699525193780",
    "name": "Devit-3 2.000 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 60,
    "stockThreshold": 7
  },
  "08699525193803": {
    "gtin": "08699525193803",
    "name": "Devit-3 20.000 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 14,
    "stockThreshold": 3
  },
  "08699514750123": {
    "gtin": "08699514750123",
    "name": "Dıclomec",
    "amount": "75 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08681428171538": {
    "gtin": "08681428171538",
    "name": "Dailiport",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428171545": {
    "gtin": "08681428171545",
    "name": "Dailiport",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08681428171552": {
    "gtin": "08681428171552",
    "name": "Dailiport",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08681428171569": {
    "gtin": "08681428171569",
    "name": "Dailiport",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428171576": {
    "gtin": "08681428171576",
    "name": "Dailiport",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08681428171583": {
    "gtin": "08681428171583",
    "name": "Dailiport",
    "amount": "0.5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08681428171590": {
    "gtin": "08681428171590",
    "name": "Dailiport",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428171606": {
    "gtin": "08681428171606",
    "name": "Dailiport",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08681428171613": {
    "gtin": "08681428171613",
    "name": "Dailiport",
    "amount": "1 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08681428171620": {
    "gtin": "08681428171620",
    "name": "Dailiport",
    "amount": "2 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428171637": {
    "gtin": "08681428171637",
    "name": "Dailiport",
    "amount": "2 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08681428171644": {
    "gtin": "08681428171644",
    "name": "Dailiport",
    "amount": "2 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08681428171651": {
    "gtin": "08681428171651",
    "name": "Dailiport",
    "amount": "3 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681428171668": {
    "gtin": "08681428171668",
    "name": "Dailiport",
    "amount": "3 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 50,
    "stockThreshold": 7
  },
  "08681428171675": {
    "gtin": "08681428171675",
    "name": "Dailiport",
    "amount": "3 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514340188": {
    "gtin": "08699514340188",
    "name": "Dolorex %1 Jel",
    "amount": "50 g",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699369070254": {
    "gtin": "08699369070254",
    "name": "Plasorin",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699570700094": {
    "gtin": "08699570700094",
    "name": "A-ferin Zero 6 Plus",
    "amount": "250 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699369070247": {
    "gtin": "08699369070247",
    "name": "Plasorin",
    "amount": "5 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699525193704": {
    "gtin": "08699525193704",
    "name": "Devit-3 400 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699525193711": {
    "gtin": "08699525193711",
    "name": "Devit-3 600 I.u. Yumuşak Kapsül",
    "amount": "1 kapsul",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 100,
    "stockThreshold": 7
  },
  "08699514095910": {
    "gtin": "08699514095910",
    "name": "Citoles",
    "amount": "15 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699514095927": {
    "gtin": "08699514095927",
    "name": "Citoles",
    "amount": "15 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 56,
    "stockThreshold": 7
  },
  "08699514095934": {
    "gtin": "08699514095934",
    "name": "Citoles",
    "amount": "15 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 84,
    "stockThreshold": 7
  },
  "08699809156883": {
    "gtin": "08699809156883",
    "name": "Delix Forte",
    "amount": "5 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699809156890": {
    "gtin": "08699809156890",
    "name": "Delix Forte",
    "amount": "10 mg",
    "form": "kapsul",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699570090409": {
    "gtin": "08699570090409",
    "name": "A-ferin Forte",
    "amount": "500 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681469412089": {
    "gtin": "08681469412089",
    "name": "Empator",
    "amount": "10 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08681469412072": {
    "gtin": "08681469412072",
    "name": "Empator",
    "amount": "25 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 30,
    "stockThreshold": 4
  },
  "08699532095657": {
    "gtin": "08699532095657",
    "name": "Norvasc Duo",
    "amount": "150 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699532095664": {
    "gtin": "08699532095664",
    "name": "Norvasc Duo",
    "amount": "150 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699532095695": {
    "gtin": "08699532095695",
    "name": "Norvasc Duo",
    "amount": "300 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  },
  "08699532095701": {
    "gtin": "08699532095701",
    "name": "Norvasc Duo",
    "amount": "300 mg",
    "form": "tablet",
    "mealCondition": "farketmez",
    "instructions": "Bol su ile alınız.",
    "defaultStock": 28,
    "stockThreshold": 4
  }
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
