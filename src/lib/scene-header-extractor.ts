// Scene Header Extraction Utility - دالة استخراج ترويسة المشهد الموحدة
// مكتبة موحدة لاستخراج وتحليل ترويسات المشاهد العربية

export interface SceneHeaderParts {
  sceneNum: string;        // "مشهد 1" أو "م. 1"
  timeLocation: string;    // "داخلي-نهار" أو "ليل-داخلي" مع توحيد الشرطات
  place: string;           // المكان التفصيلي
  consumedLines: number;   // عدد الأسطر المستهلكة من الترويسة
}

export class SceneHeaderExtractor {

  // أنماط التعبيرات المنتظمة الشاملة
  private static readonly INOUT_PATTERN = '(?:داخلي|خارجي|د\\.|خ\\.)';
  private static readonly TIME_PATTERN = '(?:ليل|نهار|ل\\.|ن\\.|صباح|مساء|فجر|ظهر)';
  private static readonly SEPARATOR_PATTERN = '[-–—:،]?\\s*';

  // التعبير المنتظم الشامل للوقت والمكان (كلا الترتيبين)
  private static readonly TIME_LOCATION_REGEX = new RegExp(
    `((?:${this.INOUT_PATTERN}${this.SEPARATOR_PATTERN}${this.TIME_PATTERN})|(?:${this.TIME_PATTERN}${this.SEPARATOR_PATTERN}${this.INOUT_PATTERN}))`,
    'i'
  );

  /**
   * استخراج أجزاء ترويسة المشهد من مصفوفة الأسطر
   * @param lines مصفوفة أسطر النص
   * @param startIndex فهرس البداية
   * @returns كائن SceneHeaderParts أو null إذا لم يتم العثور على ترويسة
   */
  static extractSceneHeaderParts(lines: string[], startIndex: number): SceneHeaderParts | null {
    if (startIndex >= lines.length) return null;

    const firstLine = lines[startIndex].trim();

    // فحص ما إذا كان السطر الأول هو ترويسة مشهد
    const sceneMatch = firstLine.match(/^(مشهد|م\.)\s*(\d+)\s*[-–—]?\s*(.*)/i);
    if (!sceneMatch) return null;

    const sceneNum = `${sceneMatch[1]} ${sceneMatch[2]}`;
    const restOfLine = sceneMatch[3] || '';

    let timeLocation = '';
    let place = '';
    let consumedLines = 1;

    // استخراج الوقت والمكان من بقية السطر الأول
    const timeLocationMatch = restOfLine.match(this.TIME_LOCATION_REGEX);
    if (timeLocationMatch) {
      // توحيد شكل الشرطة وتنظيف النص
      timeLocation = timeLocationMatch[0]
        .replace(/[-–—:،]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

      // استخراج المكان من بقية النص بعد إزالة الوقت/المكان
      place = restOfLine.replace(timeLocationMatch[0], '')
        .replace(/^\s*[-–—]?\s*/, '')
        .trim();
    } else {
      // إذا لم يتم العثور على الوقت/المكان، اعتبر النص كله مكان
      place = restOfLine.trim();
    }

    // تجميع أسطر إضافية كجزء من المكان
    let nextLineIndex = startIndex + 1;
    while (nextLineIndex < lines.length) {
      const nextLine = lines[nextLineIndex].trim();

      // تحقق من أن السطر التالي ليس عنصراً جديداً
      if (!nextLine || this.isNewStructuralElement(nextLine)) {
        break;
      }

      // أضف السطر التالي إلى المكان
      place += (place ? ' – ' : '') + nextLine;
      consumedLines++;
      nextLineIndex++;
    }

    return {
      sceneNum,
      timeLocation,
      place,
      consumedLines
    };
  }

  /**
   * فحص ما إذا كان السطر عنصر هيكلي جديد
   * @param line النص المراد فحصه
   * @returns true إذا كان عنصر هيكلي جديد
   */
  private static isNewStructuralElement(line: string): boolean {
    return (
      line.match(/^(مشهد|م\.)\s*\d+/i) !== null ||
      this.isTransition(line) ||
      this.isCharacterName(line) ||
      line.includes('بسم الله الرحمن الرحيم') ||
      this.isParenthetical(line) ||
      this.isLikelyAction(line)
    );
  }

  /**
   * فحص ما إذا كان السطر انتقال
   */
  private static isTransition(line: string): boolean {
    const transitionPatterns = [
      /قطع\s+إلى/i, /انتقال\s+إلى/i, /قطع\./i, /انتقال/i,
      /فيد\s+إلى/i, /فيد\s+من/i, /تلاشي\s+إلى/i, /تلاشي\s+من/i,
      /ذوبان\s+إلى/i, /انتهاء/i, /النهاية/i
    ];
    return transitionPatterns.some(pattern => pattern.test(line));
  }

  /**
   * فحص ما إذا كان السطر اسم شخصية
   */
  private static isCharacterName(line: string): boolean {
    const trimmed = line.trim();
    const match = trimmed.match(/^([\u0600-\u06FF\s()]+)(:|：)/);
    return match !== null && !this.containsCommonWords(match[1]);
  }

  /**
   * فحص ما إذا كان السطر نص إرشادي (بين قوسين)
   */
  private static isParenthetical(line: string): boolean {
    return line.match(/^\(.*\)$/) !== null;
  }

  /**
   * فحص ما إذا كان السطر حركة محتملة
   */
  private static isLikelyAction(line: string): boolean {
    const actionIndicators = [
      'يسير', 'تسير', 'يمشي', 'تمشي', 'يجري', 'تجري',
      'يجلس', 'تجلس', 'يقف', 'تقف', 'ينظر', 'تنظر',
      'يفتح', 'تفتح', 'يغلق', 'تغلق', 'يدخل', 'تدخل',
      'يخرج', 'تخرج', 'يضع', 'تضع', 'يأخذ', 'تأخذ'
    ];
    return actionIndicators.some(indicator => line.trim().startsWith(indicator));
  }

  /**
   * فحص وجود كلمات شائعة في النص
   */
  private static containsCommonWords(line: string): boolean {
    const commonWords = [
      'في', 'على', 'من', 'إلى', 'عند', 'مع', 'بعد', 'قبل',
      'يقول', 'تقول', 'يفعل', 'تفعل', 'الذي', 'التي'
    ];
    return commonWords.some(word => line.includes(word));
  }
}