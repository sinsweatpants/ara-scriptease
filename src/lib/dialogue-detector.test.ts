// Unit Test for Dialogue Detection and Parsing
// اختبار وحدة كشف الحوار والتحليل

import DialogueDetector from './dialogue-detector';
import { parseAndFormat } from './screenplay-parser';

describe('Dialogue Detection and Parsing', () => {

  it('should correctly identify an Arabic character name with a colon', () => {
    const line = "شيماء:";
    expect(DialogueDetector.isCharacterName(line)).toBe(true);
  });

  it('should correctly identify character names with different Arabic names', () => {
    const testCases = [
      "أحمد:",
      "فاطمة:",
      "محمد علي:",
      "نور الدين:",
      "عبد الرحمن:",
      "أم كلثوم:",
      "هند:"
    ];
    
    testCases.forEach(testCase => {
      expect(DialogueDetector.isCharacterName(testCase)).toBe(true);
    });
  });

  it('should not identify action lines as character names', () => {
    const actionLines = [
      "يسير أحمد في الشارع",
      "تجلس فاطمة على الكرسي",
      "المشهد يبدأ في الصباح",
      "الكاميرا تتحرك ببطء"
    ];
    
    actionLines.forEach(line => {
      expect(DialogueDetector.isCharacterName(line)).toBe(false);
    });
  });

  it('should correctly parse a line with a character name and dialogue', () => {
    const text = `شيماء:
استاهل خير... ما هواتي جرحته`;
    
    const formatted = parseAndFormat(text);
    
    // Create a temporary DOM element to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = formatted;

    // Check for inline styles instead of classes
    const characterElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.fontWeight === 'bold'
    );
    const dialogueElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.lineHeight === '1.2'
    );

    expect(characterElements.length).toBeGreaterThan(0);
    expect(characterElements[0]?.textContent).toBe('شيماء');
    expect(dialogueElements.length).toBeGreaterThan(0);
    expect(dialogueElements[0]?.textContent).toBe('استاهل خير... ما هواتي جرحته');
  });

  it('should not classify a dialogue line as an action', () => {
    const text = "شيماء: هذا حوار.";
    const formatted = parseAndFormat(text);
    const div = document.createElement('div');
    div.innerHTML = formatted;

    // Should have character and dialogue elements with proper styles
    const characterElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.fontWeight === 'bold'
    );
    const actionElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'right' && el.style.margin === '0rem 0px'
    );

    expect(characterElements.length).toBeGreaterThan(0);
    expect(actionElements.length).toBe(0);
  });

  it('should handle multi-line dialogue correctly', () => {
    const text = `هند:
أعطني الحبر، أعطني بس... ما هو أي رجعة إلى فلسطين... بدي واحدة شايلة تكتب مع بلحن`;
    
    const formatted = parseAndFormat(text);
    const div = document.createElement('div');
    div.innerHTML = formatted;

    // Check for inline styles instead of classes
    const characterElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.fontWeight === 'bold'
    );
    const dialogueElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.lineHeight === '1.2'
    );

    expect(characterElements.length).toBeGreaterThan(0);
    expect(characterElements[0]?.textContent).toBe('هند');
    expect(dialogueElements.length).toBeGreaterThan(0);
    expect(dialogueElements[0]?.textContent).toContain('أعطني الحبر');
  });

  it('should handle dialogue on same line as character name', () => {
    const text = "شيماء: استاهل خير... ما هواتي جرحته";
    
    const formatted = parseAndFormat(text);
    const div = document.createElement('div');
    div.innerHTML = formatted;

    // Check for inline styles
    const characterElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.fontWeight === 'bold'
    );
    const dialogueElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.lineHeight === '1.2'
    );

    expect(characterElements.length).toBeGreaterThan(0);
    expect(characterElements[0]?.textContent).toBe('شيماء');
    expect(dialogueElements.length).toBeGreaterThan(0);
    expect(dialogueElements[0]?.textContent).toBe('استاهل خير... ما هواتي جرحته');
  });

  it('should handle parentheticals in dialogue', () => {
    const text = `أحمد:
(بصوت منخفض)
لا أستطيع أن أصدق ما حدث`;
    
    const formatted = parseAndFormat(text);
    const div = document.createElement('div');
    div.innerHTML = formatted;

    const characterElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.fontWeight === 'bold'
    );
    const parentheticalElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.fontStyle === 'italic'
    );
    const dialogueElements = Array.from(div.querySelectorAll('div')).filter(el => 
      el.style.textAlign === 'center' && el.style.lineHeight === '1.2'
    );

    expect(characterElements[0]?.textContent).toBe('أحمد');
    expect(parentheticalElements[0]?.textContent).toBe('(بصوت منخفض)');
    expect(dialogueElements[0]?.textContent).toBe('لا أستطيع أن أصدق ما حدث');
  });

  it('should extract complete dialogue blocks correctly', () => {
    const lines = [
      "فاطمة:",
      "(تبتسم)",
      "مرحباً بك",
      "كيف حالك اليوم؟",
      "",
      "أحمد:",
      "بخير، شكراً لك"
    ];
    
    const dialogueBlock = DialogueDetector.extractDialogueBlock(lines, 0);
    
    expect(dialogueBlock).not.toBeNull();
    expect(dialogueBlock?.characterName).toBe('فاطمة');
    expect(dialogueBlock?.parentheticals).toContain('(تبتسم)');
    expect(dialogueBlock?.dialogueLines).toContain('مرحباً بك');
    expect(dialogueBlock?.dialogueLines).toContain('كيف حالك اليوم؟');
  });
});

// Mock DOM for testing environment
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tagName: string) => ({
      innerHTML: '',
      textContent: '',
      querySelector: () => null,
      querySelectorAll: () => []
    })
  } as any;
}