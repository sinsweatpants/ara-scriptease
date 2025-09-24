export type ScreenplayElementType =
  | 'basmala'
  | 'scene-header'
  | 'action'
  | 'dialogue'
  | 'transition';

export interface ScreenplayElement {
  type: ScreenplayElementType;
  content: string;
  lines: string[];
}

function isBasmala(line: string): boolean {
  return /^\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*$/.test(line);
}

function isTransition(line: string): boolean {
  return /^(?:\s*(?:قطع|انتقال|فيد|ذوبان|تلاشي|النهاية|انتهاء).*)$/i.test(line);
}

function isCharacterName(line: string): boolean {
  return /^\s*[\u0600-\u06FF][\u0600-\u06FF\s]{0,40}\s*:\s*$/.test(line);
}

function isParenthetical(line: string): boolean {
  return /^\s*\(.*\)\s*$/.test(line);
}

function isSceneHeader(line: string): boolean {
  return /^(مشهد|م\.)\s*\d+/i.test(line);
}

function isNewElement(line: string): boolean {
  return (
    !line ||
    isBasmala(line) ||
    isSceneHeader(line) ||
    isTransition(line) ||
    isCharacterName(line)
  );
}

export function analyzeContent(text: string): ScreenplayElement[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const elements: ScreenplayElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      elements.push({
        type: 'action',
        content: '',
        lines: ['']
      });
      continue;
    }

    if (isBasmala(trimmed)) {
      elements.push({
        type: 'basmala',
        content: trimmed,
        lines: [trimmed]
      });
      continue;
    }

    if (isSceneHeader(trimmed)) {
      let header = trimmed;
      const headerLines = [trimmed];

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !isNewElement(nextLine)) {
          header += `\n${nextLine}`;
          headerLines.push(nextLine);
          i++;
        }
      }

      elements.push({
        type: 'scene-header',
        content: header,
        lines: headerLines
      });
      continue;
    }

    if (isTransition(trimmed)) {
      elements.push({
        type: 'transition',
        content: trimmed,
        lines: [trimmed]
      });
      continue;
    }

    if (isCharacterName(trimmed)) {
      const dialogueLines: string[] = [trimmed];
      let block = trimmed;

      while (i + 1 < lines.length) {
        const nextLineRaw = lines[i + 1];
        const nextLine = nextLineRaw.trim();
        if (!nextLine) {
          break;
        }
        if (isNewElement(nextLine)) {
          break;
        }
        dialogueLines.push(nextLine);
        block += `\n${nextLine}`;
        i++;
      }

      elements.push({
        type: 'dialogue',
        content: block,
        lines: dialogueLines
      });
      continue;
    }

    if (isParenthetical(trimmed)) {
      elements.push({
        type: 'action',
        content: trimmed,
        lines: [trimmed]
      });
      continue;
    }

    elements.push({
      type: 'action',
      content: trimmed,
      lines: [trimmed]
    });
  }

  return elements;
}
