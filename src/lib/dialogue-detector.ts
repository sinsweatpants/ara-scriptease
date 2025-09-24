import type { CSSProperties } from 'react';

// Advanced Dialogue Detection - كاشف الحوار المتقدم
// Specialized module for detecting Arabic dialogue patterns

export interface DialogueBlock {
  characterName: string;
  parentheticals: string[];
  dialogueLines: string[];
  startIndex: number;
  endIndex: number;
}

// A4 Screenplay Format Styles - Mandatory Standards
// Based on: A4 (210mm x 297mm), Margins: 1" top/bottom, 1.5" right, 1" left
export const formatStyles: { [key: string]: CSSProperties } = {
    basmala: {
        textAlign: 'left',
        margin: '0 0 2rem 0',
        fontWeight: 'bold',
        fontSize: '14pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    'scene-header-top-line': {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        margin: '1rem 0 0.5rem 0',
        fontWeight: 'bold',
        fontSize: '12pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    'scene-header-3': {
        textAlign: 'center',
        fontWeight: 'bold',
        margin: '0 0 1rem 0',
        fontSize: '12pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    action: {
        textAlign: 'right',
        margin: '1rem 0',
        fontSize: '12pt',
        lineHeight: '1.5',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    character: {
        textAlign: 'center',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        margin: '1rem auto 0 auto',
        width: '2.5in',
        fontSize: '12pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    parenthetical: {
        textAlign: 'center',
        fontStyle: 'italic',
        margin: '0 auto',
        width: '2.0in',
        fontSize: '11pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    dialogue: {
        textAlign: 'center',
        margin: '0 auto 0.3rem auto',
        width: '2.5in',
        lineHeight: '1.2',
        fontSize: '12pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    },
    transition: {
        textAlign: 'center',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        margin: '1rem 0',
        fontSize: '12pt',
        fontFamily: 'var(--font-arabic), Times New Roman, serif'
    }
};

export class DialogueDetector {
  
  // Enhanced character name detection
  // تم تحسينه للتعرف على أسماء الشخصيات العربية المتبوعة بنقطتين، حتى مع وجود حوار على نفس السطر
  static isCharacterName(line: string): boolean {
    const trimmed = line.trim();
    
    // Primary pattern: Arabic name followed by a colon. Allows dialogue on the same line.
    // النمط الأساسي: اسم عربي متبوع بنقطتين رأسيتين. يسمح بوجود حوار على نفس السطر
    const match = trimmed.match(/^([\u0600-\u06FF\s()]+)(:|：)/);
    if (match && !this.containsCommonWords(match[1])) {
      return true;
    }
    
    // Secondary pattern: short Arabic name without common words, stricter conditions
    const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount <= 3 && // Max 3 words for a character name
        trimmed.length <= 30 && 
        trimmed.match(/^[\u0600-\u06FF\s]+$/) !== null &&
        !this.containsCommonWords(trimmed) &&
        !this.isLikelyAction(trimmed)) {
      return true;
    }
    
    return false;
  }
  
  // Check if line contains common words that indicate it's not a character name
  private static containsCommonWords(line: string): boolean {
    const commonWords = [
      'في', 'على', 'من', 'إلى', 'عند', 'مع', 'بعد', 'قبل', 'أمام', 'خلف',
      'يقول', 'تقول', 'يفعل', 'تفعل', 'يذهب', 'تذهب', 'يأتي', 'تأتي',
      'الذي', 'التي', 'هذا', 'هذه', 'ذلك', 'تلك', 'كان', 'كانت',
      'يسير', 'تسير', 'يجلس', 'تجلس', 'يقف', 'تقف', 'ينظر', 'تنظر',
      'أهلاً', 'مرحباً', 'نعم', 'لا', 'حسناً'
    ];
    
    return commonWords.some(word => line.includes(word));
  }
  
  // Check if line is likely an action description
  private static isLikelyAction(line: string): boolean {
    const actionIndicators = [
      'يسير', 'تسير', 'يمشي', 'تمشي', 'يجري', 'تجري',
      'يجلس', 'تجلس', 'يقف', 'تقف', 'ينظر', 'تنظر',
      'يفتح', 'تفتح', 'يغلق', 'تغلق', 'يدخل', 'تدخل',
      'يخرج', 'تخرج', 'يضع', 'تضع', 'يأخذ', 'تأخذ',
      'تخرج', 'يدخل', 'تلتفت', 'ينظر', 'ترقد'
    ];
    
    return actionIndicators.some(indicator => line.trim().startsWith(indicator));
  }
  
  // Extract complete dialogue block
  static extractDialogueBlock(lines: string[], startIndex: number): DialogueBlock | null {
    if (startIndex >= lines.length) return null;
    
    const firstLine = lines[startIndex].trim();
    if (!this.isCharacterName(firstLine)) return null;
    
    let characterName = '';
    let dialogueOnFirstLine = '';
    const colonMatch = firstLine.match(/:|：/);

    if (colonMatch && colonMatch.index) {
        characterName = firstLine.substring(0, colonMatch.index).trim();
        dialogueOnFirstLine = firstLine.substring(colonMatch.index + 1).trim();
    } else {
        // This handles the case for character name on a line by itself without a colon
        characterName = firstLine;
    }

    const parentheticals: string[] = [];
    const dialogueLines: string[] = [];
    let currentIndex = startIndex + 1;
    
    if (dialogueOnFirstLine) {
        if (this.isParenthetical(dialogueOnFirstLine)) {
            parentheticals.push(dialogueOnFirstLine);
        } else {
            dialogueLines.push(dialogueOnFirstLine);
        }
    }
    
    // Process subsequent lines
    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();
      
      // Empty line - check if dialogue continues
      if (!line) {
        // Look ahead to see if dialogue continues
        let nextNonEmptyIndex = currentIndex + 1;
        while (nextNonEmptyIndex < lines.length && !lines[nextNonEmptyIndex].trim()) {
          nextNonEmptyIndex++;
        }
        
        if (nextNonEmptyIndex >= lines.length) {
          break; // End of text
        }
        
        const nextNonEmptyLine = lines[nextNonEmptyIndex].trim();
        
        // If next non-empty line is a new structural element, end dialogue
        if (this.isStructuralElement(nextNonEmptyLine)) {
          break;
        }
        
        // If it looks like continuation of dialogue, skip empty lines and continue
        if (this.isLikelyContinuation(nextNonEmptyLine)) {
          currentIndex = nextNonEmptyIndex;
          continue;
        } else {
          break;
        }
      }
      
      // Check for structural elements that end dialogue
      if (this.isStructuralElement(line)) {
        break;
      }
      
      // Process dialogue content
      if (this.isParenthetical(line)) {
        parentheticals.push(line);
      } else {
        dialogueLines.push(line);
      }
      
      currentIndex++;
    }
    
    return {
      characterName,
      parentheticals,
      dialogueLines,
      startIndex,
      endIndex: currentIndex - 1
    };
  }
  
  // Check if line is parenthetical (stage direction)
  private static isParenthetical(line: string): boolean {
    return line.match(/^\(.*\)$/) !== null;
  }
  
  // Check if line is a structural element (scene header, transition, etc.)
  private static isStructuralElement(line: string): boolean {
    return (
      line.match(/^(مشهد|م\.)\s*(\d+)/i) !== null ||
      this.isTransition(line) ||
      this.isCharacterName(line) ||
      line.includes('بسم الله الرحمن الرحيم')
    );
  }
  
  // Check if line is a transition
  private static isTransition(line: string): boolean {
    const transitionPatterns = [
      /قطع\s+إلى/i, /انتقال\s+إلى/i, /قطع\./i, /انتقال/i,
      /فيد\s+إلى/i, /فيد\s+من/i, /تلاشي\s+إلى/i, /ذوبان\s+إلى/i,
      /انتهاء/i, /النهاية/i
    ];
    
    return transitionPatterns.some(pattern => pattern.test(line));
  }
  
  // Check if line is likely continuation of dialogue
  private static isLikelyContinuation(line: string): boolean {
    // If it's not a structural element and not too long, likely continuation
    return !this.isStructuralElement(line) && 
           !this.isLikelyAction(line) &&
           line.length < 200; // Reasonable dialogue line length
  }
  
  // Generate HTML for dialogue block
  static generateDialogueHTML(block: DialogueBlock): string {
    let html = '<div class="dialogue-block">';
    html += `<div class="character-name">${this.escapeHtml(block.characterName)}</div>`;
    
    // Add parentheticals and dialogue lines in order they appeared
    const allLines = [...block.parentheticals, ...block.dialogueLines];
    
    for (const line of block.dialogueLines) {
      html += `<div class="dialogue-text">${this.escapeHtml(line)}</div>`;
    }
    
    for (const parenthetical of block.parentheticals) {
      html += `<div class="parenthetical">${this.escapeHtml(parenthetical)}</div>`;
    }
    
    html += '</div>';
    return html;
  }
  
  // Escape HTML content
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default DialogueDetector;