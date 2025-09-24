/* eslint-disable no-control-regex */
/**
 * Screenplay line classifier for Arabic scripts (TypeScript)
 * يدعم:
 * - basmala
 * - scene-header-1 / scene-header-2 / scene-header-3 (بما في ذلك الوقت أولاً أو الداخل/الخارج أولاً)
 * - character / dialogue / parenthetical
 * - transition
 * - action (بالاستبعاد)
 * - التمييز بين "الترجمة العربية لحوار سرياني" و Parenthetical
 */

export type ElementType =
  | 'basmala'
  | 'scene-header-1'
  | 'scene-header-2'
  | 'scene-header-3'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'action';

export interface DialogueEntry {
  character: string;
  text: string;
  /** سطر ترجمة عربي لحوار سرياني سابق */
  isTranslation?: boolean;
  /** لغة السطر إن لزم (ar | syc | ...) */
  lang?: string;
}

export interface ExtractResult {
  basmala?: string;
  'scene-header-1': string[];
  'scene-header-2': string[];
  'scene-header-3': string[];
  action: string[];
  character: string[];
  parenthetical: string[];
  dialogue: DialogueEntry[];
  transition: string[];
}

export const AR_AB_LETTER = '\u0600-\u06FF';
const EASTERN_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const WESTERN_DIGITS = '0123456789';

const SYRIAC_RANGE_RE = /[\u0700-\u074F]/; // حروف سريانية
const ARABIC_RANGE_RE = /[ء-ي]/; // حروف عربية تقريبية
const LATIN_RANGE_RE = /[A-Za-z]/; // حروف لاتينية

function easternToWesternDigits(s: string): string {
  let out = '';
  for (const ch of s) {
    const idx = EASTERN_DIGITS.indexOf(ch);
    out += idx >= 0 ? WESTERN_DIGITS[idx] : ch;
  }
  return out;
}

function stripTashkeel(s: string): string {
  // إزالة التشكيل والعلامات الحركية الشائعة
  return s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '');
}

/** توحيد الشرطات والفواصل إلى "-" عند الحاجة (يُستخدم لعناوين المشهد) */
function normalizeSeparators(s: string): string {
  return s
    .replace(/[–—]/g, '-') // en/em dash → hyphen
    .replace(/[,:،]/g, '-') // فواصل/نقطتين → شرطة
    .replace(/\s*-\s*/g, '-') // إحاطة موحدة للشرطة
    .replace(/\s+/g, ' ') // ضغط الفراغات
    .trim();
}

/** تطبيع عام للسطر */
function normalizeLine(input: string): string {
  let s = input ?? '';
  s = easternToWesternDigits(s);
  s = stripTashkeel(s);
  s = s.replace(/\u200f|\u200e|\ufeff/g, ''); // علامات اتجاه/BOM
  s = s.replace(/\t/g, ' ');
  s = s.replace(/\s+$/g, '');
  return s;
}

/** إزالة أقواس خارجية رخوة (حتى لو غير متوازنة) */
function trimLooseParens(s: string): string {
  let t = s.trim();
  t = t.replace(/^\(\s*/, '').replace(/\s*\)$/, '');
  return t.trim();
}

const BASMALA_RE = /^\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*$/;

const SCENE_PREFIX_RE = new RegExp(
  String.raw`^\s*(?:مشهد|م\.)\s*([0-9]+)\s*(?:[-–—:،]\s*)?(.*)$`,
  'i'
);

// IN/OUT و TIME كما في المواصفات، مع قبول الاختصارات
const INOUT_PART = String.raw`(?:داخلي|خارجي|د\.|خ\.)`;
const TIME_PART = String.raw`(?:ليل|نهار|ل\.|ن\.|صباح|مساء|فجر|ظهر|عصر|مغرب|الغروب|الفجر)`;

// يدعم: (INOUT[-]?TIME | TIME[-]?INOUT)
const TL_REGEX = new RegExp(
  String.raw`(?:${INOUT_PART}\s*-?\s*${TIME_PART}|${TIME_PART}\s*-?\s*${INOUT_PART})`,
  'i'
);

// اسم شخصية عربي محتمل (يسمح بـ"صوت ")
const CHARACTER_RE = new RegExp(
  String.raw`^\s*(?:صوت\s+)?[${AR_AB_LETTER}][${AR_AB_LETTER}\s]{0,40}\s*:?\s*$`
);

// انتقالات عربية/إنجليزية شائعة
const TRANSITION_RE = /^\s*(?:قطع|قطع\s+إلى|إلى|مزج|ذوبان|خارج\s+المشهد|CUT TO:|FADE IN:|FADE OUT:)\s*$/i;

// سطر بين قوسين (إرشاد) — تطابق صارم
const PARENTHETICAL_RE = /^\s*\(.*?\)\s*$/;

// heuristics لمؤشرات أفعال حركة عربية شائعة (للمساعدة فقط)
const ACTION_VERBS = /^(?:يدخل|يخرج|ينظر|يرفع|تبتسم|ترقد|تقف|يبتسم|يضع|يقول|تنظر|تربت|تقوم|يشق|تشق|تضرب|يسحب|يلتفت)\b/;

/** هل السطر فارغ (بعد التطبيع)؟ */
function isBlank(line: string): boolean {
  return !line || !line.trim();
}

/** هل هو سطر Basmala؟ */
export function isBasmala(line: string): boolean {
  const s = normalizeLine(line);
  return BASMALA_RE.test(s);
}

/** هل يبدأ السطر بعنوان مشهد؟ (Scene Header) */
export function isSceneHeaderStart(line: string): boolean {
  const s = normalizeLine(line);
  return SCENE_PREFIX_RE.test(s);
}

/** التقط timeLocation/place من نفس السطر بعد "مشهد N" */
export function parseSceneHeaderFromLine(
  rawLine: string
): { sceneNum: string; timeLocation: string; placeInline: string } | null {
  const line = normalizeSeparators(normalizeLine(rawLine));
  const m = line.match(SCENE_PREFIX_RE);
  if (!m) return null;

  const sceneNumDigits = m[1];
  const rest = m[2] ?? '';

  let timeLocation = '';
  let placeInline = '';

  const tl = rest.match(TL_REGEX);
  if (tl) {
    timeLocation = tl[0].replace(/\s*-\s*/g, '-').trim();
    const after = rest.slice((tl.index ?? 0) + tl[0].length);
    placeInline = after.replace(/^\s*-\s*/, '').trim();
  } else {
    // لم يُلتقط وقت/مكان → اعتبر الباقي مكانًا تفصيليًا
    placeInline = rest.trim();
  }

  // بناء رقم المشهد الموحّد
  const sceneNum = `مشهد ${sceneNumDigits}`;
  return { sceneNum, timeLocation, placeInline };
}

/** هل هو انتقال؟ */
export function isTransition(line: string): boolean {
  const s = normalizeLine(line);
  return TRANSITION_RE.test(s);
}

/** هل هو اسم شخصية؟ (يسمح بدون نقطتين، وبـ"صوت ...") */
export function isCharacterLine(line: string): boolean {
  const s = normalizeLine(line);
  if (isSceneHeaderStart(s)) return false;
  if (isTransition(s)) return false;
  return CHARACTER_RE.test(s);
}

/** هل هو سطر إرشاد داخل الحوار؟ (مطابقة الأقواس فقط) */
export function isParenthetical(line: string): boolean {
  const s = normalizeLine(line);
  return PARENTHETICAL_RE.test(s);
}

/** إرشاد داخل الحوار: دلالة معنوية (قَصير، بدون جُمل ثقيلة) */
function isLikelyParentheticalSemantics(raw: string): boolean {
  const t = trimLooseParens(normalizeLine(raw));
  if (!t) return false;
  // قصير نسبيًا
  if (t.length > 45) return false;
  // لا جُمل حوارية ثقيلة
  if (/[؟!…]/.test(t)) return false;
  // مفردات عربية موجزة مقبولة، دون لاتيني/سرياني
  if (LATIN_RANGE_RE.test(t) || SYRIAC_RANGE_RE.test(t)) return false;
  // وجود كلمة نمط أداء (اختياري)، وإلا نكتفي بالقيود أعلاه
  return true;
}

/** هل يُحتمل أن يكون Action؟ (بالاستبعاد + أفعال) */
export function isLikelyAction(line: string): boolean {
  const s = normalizeLine(line);
  if (!s) return false;
  if (isBasmala(s)) return false;
  if (isSceneHeaderStart(s)) return false;
  if (isTransition(s)) return false;
  if (isParenthetical(s)) return false; // قد يُعاد تصنيفه أدناه عند فحص الترجمة
  if (isCharacterLine(s)) return false;
  return ACTION_VERBS.test(s) || true;
}

/**
 * اجمع المشهد: scene-header-1/2/3
 * يلتقط المكان من نفس السطر ثم يُكمل من أسطر لاحقة طالما لم يبدأ عنصر جديد.
 */
export function extractSceneHeaderParts(
  lines: string[],
  startIndex: number
): {
  sceneNum: string;
  timeLocation: string;
  place: string;
  consumedLines: number;
} | null {
  const first = lines[startIndex] ?? '';
  const parsed = parseSceneHeaderFromLine(first);
  if (!parsed) return null;

  let { sceneNum, timeLocation, placeInline } = parsed;
  let place = placeInline;
  let consumed = 1;

  // اجمع امتدادات المكان من الأسطر التالية
  let i = startIndex + 1;
  while (i < lines.length) {
    const nextRaw = lines[i] ?? '';
    const next = normalizeLine(nextRaw);

    if (isBlank(next)) {
      consumed++;
      i++;
      continue;
    }

    // توقّف عند أول عنصر جديد واضح
    if (
      isSceneHeaderStart(next) ||
      isTransition(next) ||
      isCharacterLine(next) ||
      isParenthetical(next) || // لا نلحق قوسًا كمكان
      isBasmala(next)
    ) {
      break;
    }

    // خلاف ذلك اعتبره استمرارًا للمكان التفصيلي
    const normalizedNext = normalizeSeparators(next).replace(/^\s*-\s*/, '').trim();
    if (normalizedNext) {
      place = place ? `${place} – ${normalizedNext}` : normalizedNext;
    }
    consumed++;
    i++;
  }

  return { sceneNum, timeLocation, place: place.trim(), consumedLines: consumed };
}

/**
 * صنّف وثيقة كاملة (مصفوفة أسطر) وأخرج الهيكل المطلوب.
 * الحوار يُجمع كسجلّات {character, text} مع دعم isTranslation للحالات المترجمة.
 */
export function classifyDocument(lines: string[]): ExtractResult {
  const out: ExtractResult = {
    'scene-header-1': [],
    'scene-header-2': [],
    'scene-header-3': [],
    action: [],
    character: [],
    parenthetical: [],
    dialogue: [],
    transition: []
  };

  let currentCharacter: string | null = null;
  /** آخر سياق حوار: 'syriac' عند وجود حروف سريانية، 'translation' عند إضافة ترجمة عربية، null خلاف ذلك */
  let lastDialogueContext: 'syriac' | 'translation' | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx] ?? '';
    const line = normalizeLine(raw);

    if (isBlank(line)) {
      // إنهاء حوار جارٍ عند فراغ
      currentCharacter = null;
      lastDialogueContext = null;
      continue;
    }

    // 1) Basmala
    if (isBasmala(line)) {
      out.basmala = raw.trim();
      currentCharacter = null;
      lastDialogueContext = null;
      continue;
    }

    // 2) Scene Header (مع تجميع)
    if (isSceneHeaderStart(line)) {
      const parts = extractSceneHeaderParts(lines, idx);
      if (parts) {
        const { sceneNum, timeLocation, place, consumedLines } = parts;
        out['scene-header-1'].push(sceneNum);
        if (timeLocation) out['scene-header-2'].push(timeLocation);
        if (place) out['scene-header-3'].push(place);
        idx += consumedLines - 1;
        currentCharacter = null;
        lastDialogueContext = null;
        continue;
      }
    }

    // 3) Transition
    if (isTransition(line)) {
      out.transition.push(raw.trim());
      currentCharacter = null;
      lastDialogueContext = null;
      continue;
    }

    // 4) Character
    if (isCharacterLine(line)) {
      const name = raw.replace(/:\s*$/, '').trim();
      out.character.push(name);
      currentCharacter = name;
      lastDialogueContext = null;
      continue;
    }

    // 5) سطر بين قوسين: ترجمة أم Parenthetical؟
    if (isParenthetical(line) || /^[\s]*\(|\)[\s]*$/.test(line)) {
      // أولوية: ترجمة عربية إذا جاء بعد حوار سرياني لنفس المتحدث
      const looksArabic = ARABIC_RANGE_RE.test(line) && !SYRIAC_RANGE_RE.test(line);
      if (currentCharacter && (lastDialogueContext === 'syriac' || lastDialogueContext === 'translation') && looksArabic) {
        // ترجمة لحوار سرياني
        out.dialogue.push({
          character: currentCharacter,
          text: trimLooseParens(raw),
          isTranslation: true,
          lang: 'ar'
        });
        lastDialogueContext = 'translation';
        continue;
      }

      // خلاف ذلك: اعتبره Parenthetical فقط إذا كان قصيرًا ودون جمل ثقيلة
      if (isLikelyParentheticalSemantics(raw)) {
        out.parenthetical.push(raw.trim());
        // لا يُنهي الحوار، يمكن أن يتبعه حوار لنفس المتحدث
        continue;
      }
      // وإلا: لا نصنّفه Parenthetical بالقوة — سنسقط للحوارات/الأكشن أدناه
    }

    // 6) Dialogue: إذا هناك متحدث نشط
    if (currentCharacter) {
      const hasSyriac = SYRIAC_RANGE_RE.test(line);
      out.dialogue.push({
        character: currentCharacter,
        text: raw.trim(),
        ...(hasSyriac ? { lang: 'syc' } : { lang: 'ar' })
      });
      lastDialogueContext = hasSyriac ? 'syriac' : null;
      continue;
    }

    // 7) Action (بالاستبعاد)
    if (!isBlank(line)) {
      out.action.push(raw.trim());
      currentCharacter = null;
      lastDialogueContext = null;
      continue;
    }
  }

  return out;
}
