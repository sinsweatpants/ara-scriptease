// Unit Tests for Scene Header Extractor - اختبارات وحدة استخراج ترويسة المشهد
// اختبارات شاملة لكافة حالات استخراج ترويسات المشاهد العربية

import { SceneHeaderExtractor, SceneHeaderParts } from './scene-header-extractor';

describe('SceneHeaderExtractor', () => {

  describe('extractSceneHeaderParts', () => {

    test('should extract scene header with داخلي-نهار format', () => {
      const lines = [
        'مشهد 1 - داخلي-نهار – قصر – غرفة',
        'أحمد يجلس على الأريكة.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 1');
      expect(result!.timeLocation).toBe('داخلي-نهار');
      expect(result!.place).toBe('قصر – غرفة');
      expect(result!.consumedLines).toBe(1);
    });

    test('should extract scene header with ليل-داخلي format (time first)', () => {
      const lines = [
        'مشهد 2 - ليل-داخلي – قصر المُشتكي – غرفة الكهف',
        'الشخصية تدخل الغرفة.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 2');
      expect(result!.timeLocation).toBe('ليل-داخلي');
      expect(result!.place).toBe('قصر المُشتكي – غرفة الكهف');
      expect(result!.consumedLines).toBe(1);
    });

    test('should extract scene header with place on next line', () => {
      const lines = [
        'مشهد 3 - خارجي-صباح',
        'الحديقة الخلفية للمنزل',
        'أحمد يمشي في الحديقة.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 3');
      expect(result!.timeLocation).toBe('خارجي-صباح');
      expect(result!.place).toBe('الحديقة الخلفية للمنزل');
      expect(result!.consumedLines).toBe(2);
    });

    test('should extract scene header with multi-line place description', () => {
      const lines = [
        'مشهد 4 - نهار-داخلي – القصر',
        'الصالة الكبيرة',
        'مع الثريا المعلقة في الوسط',
        'أحمد: مرحباً بكم.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 4');
      expect(result!.timeLocation).toBe('نهار-داخلي');
      expect(result!.place).toBe('القصر – الصالة الكبيرة – مع الثريا المعلقة في الوسط');
      expect(result!.consumedLines).toBe(3);
    });

    test('should handle abbreviated formats (م. and د./خ./ل./ن.)', () => {
      const lines = [
        'م. 5 - د.ن. – المكتب',
        'المدير يراجع الأوراق.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('م. 5');
      expect(result!.timeLocation).toBe('د.-ن.');
      expect(result!.place).toBe('المكتب');
      expect(result!.consumedLines).toBe(1);
    });

    test('should handle different separators (–, —, :, ،)', () => {
      const lines = [
        'مشهد 6 — مساء–خارجي: الشارع الرئيسي',
        'الناس يتجولون في الشارع.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 6');
      expect(result!.timeLocation).toBe('مساء-خارجي');
      expect(result!.place).toBe('الشارع الرئيسي');
      expect(result!.consumedLines).toBe(1);
    });

    test('should handle scene header without time/location', () => {
      const lines = [
        'مشهد 7 - البيت الكبير',
        'أحمد يفتح الباب.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 7');
      expect(result!.timeLocation).toBe('');
      expect(result!.place).toBe('البيت الكبير');
      expect(result!.consumedLines).toBe(1);
    });

    test('should handle scene header with only time/location, no place', () => {
      const lines = [
        'مشهد 8 - فجر-خارجي',
        'أحمد: السلام عليكم.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 8');
      expect(result!.timeLocation).toBe('فجر-خارجي');
      expect(result!.place).toBe('');
      expect(result!.consumedLines).toBe(1);
    });

    test('should stop at character dialogue', () => {
      const lines = [
        'مشهد 9 - ظهر-داخلي',
        'المطبخ الواسع',
        'أحمد: كيف حالك؟',
        'فاطمة: بخير والحمد لله.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 9');
      expect(result!.timeLocation).toBe('ظهر-داخلي');
      expect(result!.place).toBe('المطبخ الواسع');
      expect(result!.consumedLines).toBe(2);
    });

    test('should stop at transition', () => {
      const lines = [
        'مشهد 10 - ليل-خارجي',
        'الحديقة المظلمة',
        'قطع إلى:',
        'مشهد 11'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.place).toBe('الحديقة المظلمة');
      expect(result!.consumedLines).toBe(2);
    });

    test('should return null for non-scene header', () => {
      const lines = [
        'أحمد يمشي في الشارع.',
        'يلتقي بصديقه القديم.'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).toBeNull();
    });

    test('should return null for invalid start index', () => {
      const lines = ['مشهد 1 - داخلي-نهار'];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 5);

      expect(result).toBeNull();
    });

    test('should handle scene at end of lines array', () => {
      const lines = [
        'مشهد 99 - نهار-خارجي – النهاية'
      ];

      const result = SceneHeaderExtractor.extractSceneHeaderParts(lines, 0);

      expect(result).not.toBeNull();
      expect(result!.sceneNum).toBe('مشهد 99');
      expect(result!.timeLocation).toBe('نهار-خارجي');
      expect(result!.place).toBe('النهاية');
      expect(result!.consumedLines).toBe(1);
    });
  });
});