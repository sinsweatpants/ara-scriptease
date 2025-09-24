import {
  classifyDocument,
  extractSceneHeaderParts,
  isBasmala,
  isCharacterLine,
  isParenthetical,
  parseSceneHeaderFromLine
} from './screenplay-line-classifier';

describe('screenplay-line-classifier', () => {
  test('detects basmala regardless of whitespace and tashkeel', () => {
    expect(isBasmala('  بسم الله الرحمن الرحيم  ')).toBe(true);
    expect(
      isBasmala('بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ')
    ).toBe(true);
  });

  test('parses scene header with eastern digits and collects inline parts', () => {
    const parsed = parseSceneHeaderFromLine('مشهد ١ - داخلي،ليل – القصر');
    expect(parsed).toEqual({
      sceneNum: 'مشهد 1',
      timeLocation: 'داخلي-ليل',
      placeInline: 'القصر'
    });
  });

  test('extractSceneHeaderParts aggregates subsequent place lines', () => {
    const lines = [
      'مشهد 12 - ليل-خارجي',
      'حافة الجبل',
      'مع إضاءة خافتة',
      '',
      'أحمد'
    ];
    const parts = extractSceneHeaderParts(lines, 0);
    expect(parts).toEqual({
      sceneNum: 'مشهد 12',
      timeLocation: 'ليل-خارجي',
      place: 'حافة الجبل – مع إضاءة خافتة',
      consumedLines: 3
    });
  });

  test('character detection ignores transitions and scene headers', () => {
    expect(isCharacterLine('أحمد')).toBe(true);
    expect(isCharacterLine('مشهد 1 - داخلي')).toBe(false);
    expect(isCharacterLine('قطع')).toBe(false);
  });

  test('isParenthetical matches bracketed guidance exactly', () => {
    expect(isParenthetical('(بهمس)')).toBe(true);
    expect(isParenthetical(' ( بسرعة ) ')).toBe(true);
    expect(isParenthetical('(ليست جملة) نعم')).toBe(false);
  });

  test('classifyDocument differentiates Syriac dialogue with Arabic translation', () => {
    const lines = [
      'شمعون',
      'ܫܠܡܐ ܥܠܝܟܘܢ',
      '( السلام عليكم )',
      '',
      'أحمد',
      '(بابتسامة)',
      'مرحباً'
    ];

    const result = classifyDocument(lines);
    expect(result.dialogue).toEqual([
      { character: 'شمعون', text: 'ܫܠܡܐ ܥܠܝܟܘܢ', lang: 'syc' },
      {
        character: 'شمعون',
        text: 'السلام عليكم',
        isTranslation: true,
        lang: 'ar'
      }
    ]);

    expect(result.parenthetical).toEqual(['(بابتسامة)']);
    expect(result.dialogue[result.dialogue.length - 1]).toEqual({
      character: 'أحمد',
      text: 'مرحباً',
      lang: 'ar'
    });
  });

  test('classifyDocument collects scene headers, transitions and action', () => {
    const lines = [
      'بسم الله الرحمن الرحيم',
      'مشهد 5 - نهار-داخلي – القاعة الكبرى',
      'المقاعد ممتلئة',
      'أحمد',
      'يقف وسط الجمهور',
      'قطع'
    ];

    const result = classifyDocument(lines);

    expect(result.basmala).toBe('بسم الله الرحمن الرحيم');
    expect(result['scene-header-1']).toEqual(['مشهد 5']);
    expect(result['scene-header-2']).toEqual(['نهار-داخلي']);
    expect(result['scene-header-3']).toEqual(['القاعة الكبرى – المقاعد ممتلئة']);
    expect(result.character).toEqual(['أحمد']);
    expect(result.action).toEqual(['يقف وسط الجمهور']);
    expect(result.transition).toEqual(['قطع']);
  });
});
