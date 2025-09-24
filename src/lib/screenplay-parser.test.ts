// Unit Tests for Screenplay Parser - اختبارات وحدة محلل السيناريو
// اختبارات تكاملية لضمان التنسيق الصحيح لعناصر السيناريو العربي

import { parseAndFormat } from './screenplay-parser';

describe('ScreenplayParser', () => {

  describe('parseAndFormat', () => {

    test('should format Basmala with left alignment', () => {
      const input = 'بسم الله الرحمن الرحيم';
      const result = parseAndFormat(input);

      expect(result).toContain('<div style="text-align: left');
      expect(result).toContain('بسم الله الرحمن الرحيم');
    });

    test('should format scene header with proper structure - داخلي first', () => {
      const input = 'مشهد 1 - داخلي-نهار – قصر المُشتكي – غرفة الكهف';
      const result = parseAndFormat(input);

      // Check for scene header container
      expect(result).toContain('class="scene-header-container"');

      // Check for top line structure
      expect(result).toContain('justify-content: space-between');
      expect(result).toContain('class="scene-header-1">مشهد 1');
      expect(result).toContain('class="scene-header-2">داخلي-نهار');

      // Check for place in center
      expect(result).toContain('text-align: center');
      expect(result).toContain('قصر المُشتكي – غرفة الكهف');
    });

    test('should format scene header with proper structure - ليل first', () => {
      const input = 'مشهد 2 - ليل-داخلي – قصر المُشتكي – غرفة الكهف';
      const result = parseAndFormat(input);

      expect(result).toContain('class="scene-header-1">مشهد 2');
      expect(result).toContain('class="scene-header-2">ليل-داخلي');
      expect(result).toContain('قصر المُشتكي – غرفة الكهف');
    });

    test('should handle multi-line scene headers', () => {
      const input = `مشهد 3 - خارجي-صباح
الحديقة الخلفية للمنزل
مع أشجار النخيل العالية`;

      const result = parseAndFormat(input);

      expect(result).toContain('مشهد 3');
      expect(result).toContain('خارجي-صباح');
      expect(result).toContain('الحديقة الخلفية للمنزل – مع أشجار النخيل العالية');
    });

    test('should format character and dialogue with proper widths', () => {
      const input = `أحمد: مرحباً بكم في منزلنا.
كيف حالكم؟`;

      const result = parseAndFormat(input);

      // Check character formatting
      expect(result).toContain('text-align: center');
      expect(result).toContain('width: 2.5in');
      expect(result).toContain('text-transform: uppercase');
      expect(result).toContain('>أحمد<');

      // Check dialogue formatting
      expect(result).toContain('width: 2.5in');
      expect(result).toContain('line-height: 1.2');
      expect(result).toContain('مرحباً بكم في منزلنا.');
      expect(result).toContain('كيف حالكم؟');
    });

    test('should format parenthetical with correct width', () => {
      const input = `أحمد: (بصوت خافت) لا تخبر أحداً بما رأيت.`;

      const result = parseAndFormat(input);

      expect(result).toContain('width: 2.0in');
      expect(result).toContain('font-style: italic');
      expect(result).toContain('(بصوت خافت)');
    });

    test('should format transitions with center alignment', () => {
      const input = 'قطع إلى:';
      const result = parseAndFormat(input);

      expect(result).toContain('text-align: center');
      expect(result).toContain('font-weight: bold');
      expect(result).toContain('text-transform: uppercase');
      expect(result).toContain('قطع إلى:');
    });

    test('should format action lines with right alignment', () => {
      const input = 'يسير أحمد ببطء نحو النافذة ويطل على الحديقة.';
      const result = parseAndFormat(input);

      expect(result).toContain('text-align: right');
      expect(result).toContain('يسير أحمد ببطء نحو النافذة');
    });

    test('should handle complex screenplay with all elements', () => {
      const input = `بسم الله الرحمن الرحيم

مشهد 1 - داخلي-نهار – البيت الكبير
الصالة الرئيسية مع الأثاث الفاخر

يدخل أحمد من الباب الرئيسي ويبدو متعباً.

أحمد: (يتنهد بعمق) كان يوماً طويلاً.
أخيراً وصلت إلى البيت.

قطع إلى:`;

      const result = parseAndFormat(input);

      // Check all elements are present and formatted
      expect(result).toContain('بسم الله الرحمن الرحيم');
      expect(result).toContain('مشهد 1');
      expect(result).toContain('داخلي-نهار');
      expect(result).toContain('البيت الكبير – الصالة الرئيسية مع الأثاث الفاخر');
      expect(result).toContain('يدخل أحمد');
      expect(result).toContain('أحمد');
      expect(result).toContain('(يتنهد بعمق)');
      expect(result).toContain('كان يوماً طويلاً');
      expect(result).toContain('قطع إلى:');
    });

    test('should handle empty input', () => {
      const result = parseAndFormat('');
      expect(result).toBe('');
    });

    test('should handle whitespace-only input', () => {
      const result = parseAndFormat('   \n  \n  ');
      expect(result).toContain('<br>');
    });

    test('should escape HTML content to prevent XSS', () => {
      const input = 'أحمد: <script>alert("test")</script> مرحباً';
      const result = parseAndFormat(input);

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('مرحباً');
    });

    test('should normalize separator characters in time/location', () => {
      const input1 = 'مشهد 1 – داخلي—نهار';
      const input2 = 'مشهد 2 - ليل:خارجي';
      const input3 = 'مشهد 3 - نهار،داخلي';

      const result1 = parseAndFormat(input1);
      const result2 = parseAndFormat(input2);
      const result3 = parseAndFormat(input3);

      expect(result1).toContain('داخلي-نهار');
      expect(result2).toContain('ليل-خارجي');
      expect(result3).toContain('نهار-داخلي');
    });
  });
});