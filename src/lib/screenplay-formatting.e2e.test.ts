// E2E Visual Tests for Screenplay Formatting - اختبارات التحقق البصري النهائية
// اختبارات تكاملية للتحقق البصري من التنسيقات والمحاذاة

import { parseAndFormat } from './screenplay-parser';

/**
 * E2E Visual Tests for Arabic Screenplay Formatting
 * These tests verify visual alignment and formatting compliance
 */
describe('Screenplay Formatting E2E Tests', () => {

  // Helper function to create DOM element for visual inspection
  const createVisualElement = (html: string): HTMLElement => {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.direction = 'rtl';
    container.style.fontFamily = 'Amiri, serif';
    container.style.width = '8.5in';
    container.style.margin = '0 auto';
    container.style.padding = '1in';
    container.style.background = 'white';
    return container;
  };

  // Helper function to check computed styles
  const getComputedStyles = (element: HTMLElement) => {
    document.body.appendChild(element);
    const styles = window.getComputedStyle(element);
    document.body.removeChild(element);
    return styles;
  };

  test('Visual Test: Basmala should align left', () => {
    const input = 'بسم الله الرحمن الرحيم';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const basmalaElement = element.querySelector('[style*="text-align: left"]') as HTMLElement;
    expect(basmalaElement).not.toBeNull();
    expect(basmalaElement.textContent?.trim()).toBe('بسم الله الرحمن الرحيم');

    // Visual inspection data
    console.log('✅ Basmala Visual Check:', {
      text: basmalaElement.textContent?.trim(),
      alignment: 'left',
      fontWeight: 'bold',
      element: basmalaElement.outerHTML.substring(0, 100) + '...'
    });
  });

  test('Visual Test: Scene header top line should have proper RTL distribution', () => {
    const input = 'مشهد 1 - ليل-داخلي – قصر المُشتكي – غرفة الكهف';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const topLineElement = element.querySelector('.scene-header-container div') as HTMLElement;
    const sceneNumberElement = topLineElement?.querySelector('.scene-header-1') as HTMLElement;
    const timeLocationElement = topLineElement?.querySelector('.scene-header-2') as HTMLElement;

    expect(topLineElement).not.toBeNull();
    expect(sceneNumberElement?.textContent?.trim()).toBe('مشهد 1');
    expect(timeLocationElement?.textContent?.trim()).toBe('ليل-داخلي');

    // Check flexbox distribution
    const topLineStyles = topLineElement.style;
    expect(topLineStyles.display).toBe('flex');
    expect(topLineStyles.justifyContent).toBe('space-between');

    console.log('✅ Scene Header Top Line Visual Check:', {
      sceneNumber: {
        text: sceneNumberElement.textContent?.trim(),
        position: 'right (RTL first)',
      },
      timeLocation: {
        text: timeLocationElement.textContent?.trim(),
        position: 'left (RTL second)',
      },
      layout: 'flex space-between with RTL direction'
    });
  });

  test('Visual Test: Scene header place should be centered', () => {
    const input = 'مشهد 2 - داخلي-نهار – قصر المُشتكي – غرفة الكهف';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const placeElement = element.querySelector('[style*="text-align: center"]') as HTMLElement;
    expect(placeElement).not.toBeNull();
    expect(placeElement.textContent?.trim()).toBe('قصر المُشتكي – غرفة الكهف');

    console.log('✅ Scene Header Place Visual Check:', {
      text: placeElement.textContent?.trim(),
      alignment: 'center',
      fontWeight: 'bold'
    });
  });

  test('Visual Test: Character names should be centered with 2.5in width', () => {
    const input = 'أحمد: مرحباً بكم في منزلنا.';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const characterElement = element.querySelector('[style*="width: 2.5in"]') as HTMLElement;
    expect(characterElement).not.toBeNull();
    expect(characterElement.textContent?.trim()).toBe('أحمد');

    const styles = characterElement.style;
    expect(styles.textAlign).toBe('center');
    expect(styles.width).toBe('2.5in');
    expect(styles.textTransform).toBe('uppercase');

    console.log('✅ Character Name Visual Check:', {
      text: characterElement.textContent?.trim(),
      alignment: 'center',
      width: '2.5in',
      textTransform: 'uppercase'
    });
  });

  test('Visual Test: Dialogue should be centered with 2.5in width', () => {
    const input = `أحمد: مرحباً بكم في منزلنا.
كيف حالكم اليوم؟`;

    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    // Find dialogue elements (not character)
    const dialogueElements = Array.from(element.querySelectorAll('[style*="width: 2.5in"]'))
      .filter(el => el.textContent?.trim() !== 'أحمد') as HTMLElement[];

    expect(dialogueElements.length).toBeGreaterThan(0);

    dialogueElements.forEach((dialogueEl, index) => {
      const styles = dialogueEl.style;
      expect(styles.textAlign).toBe('center');
      expect(styles.width).toBe('2.5in');
      expect(styles.lineHeight).toBe('1.2');

      console.log(`✅ Dialogue ${index + 1} Visual Check:`, {
        text: dialogueEl.textContent?.trim().substring(0, 30) + '...',
        alignment: 'center',
        width: '2.5in',
        lineHeight: '1.2'
      });
    });
  });

  test('Visual Test: Parenthetical should be centered with 2.0in width', () => {
    const input = 'أحمد: (بصوت خافت) لا تخبر أحداً بما رأيت.';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const parentheticalElement = element.querySelector('[style*="width: 2.0in"]') as HTMLElement;
    expect(parentheticalElement).not.toBeNull();
    expect(parentheticalElement.textContent?.trim()).toBe('(بصوت خافت)');

    const styles = parentheticalElement.style;
    expect(styles.textAlign).toBe('center');
    expect(styles.width).toBe('2.0in');
    expect(styles.fontStyle).toBe('italic');

    console.log('✅ Parenthetical Visual Check:', {
      text: parentheticalElement.textContent?.trim(),
      alignment: 'center',
      width: '2.0in',
      fontStyle: 'italic'
    });
  });

  test('Visual Test: Action lines should be right-aligned', () => {
    const input = 'يسير أحمد ببطء نحو النافذة ويطل على الحديقة الجميلة.';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const actionElement = element.querySelector('[style*="text-align: right"]') as HTMLElement;
    expect(actionElement).not.toBeNull();
    expect(actionElement.textContent?.trim()).toBe(input);

    console.log('✅ Action Line Visual Check:', {
      text: actionElement.textContent?.trim().substring(0, 50) + '...',
      alignment: 'right'
    });
  });

  test('Visual Test: Transitions should be centered and bold', () => {
    const input = 'قطع إلى:';
    const html = parseAndFormat(input);
    const element = createVisualElement(html);

    const transitionElement = element.querySelector('[style*="text-align: center"][style*="font-weight: bold"]') as HTMLElement;
    expect(transitionElement).not.toBeNull();
    expect(transitionElement.textContent?.trim()).toBe('قطع إلى:');

    const styles = transitionElement.style;
    expect(styles.textAlign).toBe('center');
    expect(styles.fontWeight).toBe('bold');

    console.log('✅ Transition Visual Check:', {
      text: transitionElement.textContent?.trim(),
      alignment: 'center',
      fontWeight: 'bold',
      textTransform: 'uppercase'
    });
  });

  test('Complete Visual Integration Test', () => {
    const complexInput = `بسم الله الرحمن الرحيم

مشهد 1 - داخلي-نهار – البيت الكبير
الصالة الرئيسية مع الأثاث الفاخر

يدخل أحمد من الباب الرئيسي ويبدو متعباً من العمل.

أحمد: (يتنهد بعمق) كان يوماً طويلاً.
أخيراً وصلت إلى البيت المريح.

يجلس على الأريكة ويضع حقيبته على الطاولة.

فاطمة: (تدخل من المطبخ) أهلاً وسهلاً بك.
كيف كان يومك في العمل؟

قطع إلى:`;

    const html = parseAndFormat(complexInput);
    const element = createVisualElement(html);

    // Comprehensive visual checks
    const basmala = element.querySelector('[style*="text-align: left"]');
    const sceneContainer = element.querySelector('.scene-header-container');
    const sceneNumber = element.querySelector('.scene-header-1');
    const timeLocation = element.querySelector('.scene-header-2');
    const actions = element.querySelectorAll('[style*="text-align: right"]');
    const characters = element.querySelectorAll('[style*="width: 2.5in"][style*="text-transform: uppercase"]');
    const dialogues = element.querySelectorAll('[style*="width: 2.5in"][style*="line-height: 1.2"]');
    const parentheticals = element.querySelectorAll('[style*="width: 2.0in"][style*="font-style: italic"]');
    const transitions = element.querySelectorAll('[style*="text-align: center"][style*="font-weight: bold"]');

    // Assertions for all elements
    expect(basmala).not.toBeNull();
    expect(sceneContainer).not.toBeNull();
    expect(sceneNumber?.textContent?.trim()).toBe('مشهد 1');
    expect(timeLocation?.textContent?.trim()).toBe('داخلي-نهار');
    expect(actions.length).toBeGreaterThan(0);
    expect(characters.length).toBeGreaterThan(0);
    expect(parentheticals.length).toBeGreaterThan(0);
    expect(transitions.length).toBeGreaterThan(0);

    console.log('✅ Complete Integration Visual Summary:', {
      basmala: basmala?.textContent?.trim(),
      sceneHeader: {
        number: sceneNumber?.textContent?.trim(),
        timeLocation: timeLocation?.textContent?.trim(),
      },
      counts: {
        actions: actions.length,
        characters: characters.length,
        dialogues: dialogues.length,
        parentheticals: parentheticals.length,
        transitions: transitions.length
      },
      htmlPreview: html.substring(0, 200) + '...'
    });
  });
});