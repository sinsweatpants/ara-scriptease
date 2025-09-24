// Helper function to escape HTML content to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Import advanced dialogue detector
import { formatStyles } from './dialogue-detector';
import { SceneHeaderExtractor } from './scene-header-extractor';
import { analyzeContent, type ScreenplayElement } from './pagination-engine';
import { PaginationEngine } from './PaginationEngine';
import type { CSSProperties } from 'react';

// Helper function to convert style object to string
function styleObjectToString(style: CSSProperties | null | undefined): string {
    if (!style) {
        return '';
    }
    return Object.entries(style).map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
    }).join('; ');
}

// Helper function to detect parenthetical (stage directions) - محسن للنصوص الإرشادية
function isParenthetical(line: string): boolean {
  return line.match(/^\(.*\)$/) !== null;
}

// Normalization function - تهيئة أولية وفق القواعد المحددة (محفوظة للمستقبل)
// function normalizeLine(line: string): string {
//   return line
//     .trim() // إزالة المسافات الزائدة في الأطراف
//     .replace(/\s*[–—:،]\s*/g, '-') // توحيد الشرطة
//     .replace(/\s+/g, ' '); // توحيد المسافات المتعددة
// }

// Enhanced Basmala detection - كشف البسملة بدقة
function isBasmala(line: string): boolean {
  return /^\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*$/.test(line);
}

// Enhanced Transition detection - كشف الانتقالات بدقة
function isTransition(line: string): boolean {
  return /^\s*(?:قطع|إلى|ذوبان|مزج|قطع إلى|خارج المشهد)\s*$/.test(line);
}

// Enhanced Character detection - كشف اسم الشخصية بدقة أكبر
function isCharacterName(line: string): boolean {
  const characterPattern = /^\s*[\u0600-\u06FF][\u0600-\u06FF\s]{0,40}\s*:\s*$/;
  return characterPattern.test(line);
}

// Enhanced Arabic screenplay parser with improved pattern recognition
export function parseAndFormat(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  let formattedHTML = '';

  const actionStyle = styleObjectToString(formatStyles.action);
  const basmalaStyle = styleObjectToString(formatStyles.basmala);
  const transitionStyle = styleObjectToString(formatStyles.transition);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle empty lines
    if (!line) {
      formattedHTML += `<div style="${actionStyle}"><br></div>`;
      continue;
    }

    // تطبيق ترتيب الأولوية وفق القواعد المحددة:
    // 1. Basmala detection - البسملة (بدقة عالية)
    if (isBasmala(line)) {
      formattedHTML += `<div style="${basmalaStyle}">${escapeHtml(line)}</div>`;
    }

    // 2. Scene header detection - رأس المشهد (أولوية ثانية)
    else if (line.match(/^(مشهد|م\.)\s*(\d+)/i)) {
      const sceneHeaderParts = SceneHeaderExtractor.extractSceneHeaderParts(lines, i);
      if (sceneHeaderParts) {
        const sceneHeaderTopLineStyle = styleObjectToString(formatStyles['scene-header-top-line']);
        const sceneHeader3Style = styleObjectToString(formatStyles['scene-header-3']);

        formattedHTML += `
          <div class="scene-header-container">
            <div style="${sceneHeaderTopLineStyle}">
              <span class="scene-header-1">${escapeHtml(sceneHeaderParts.sceneNum)}</span>
              <span class="scene-header-2">${escapeHtml(sceneHeaderParts.timeLocation)}</span>
            </div>
            ${sceneHeaderParts.place ? `<div style="${sceneHeader3Style}">${escapeHtml(sceneHeaderParts.place)}</div>` : ''}
          </div>`;

        // Skip the consumed lines
        i += sceneHeaderParts.consumedLines - 1;
      }
    }

    // 3. Transition detection - مؤشرات الانتقال (أولوية ثالثة)
    else if (isTransition(line)) {
      formattedHTML += `<div style="${transitionStyle}">${escapeHtml(line)}</div>`;
    }

    // 4. Character name detection - اسم الشخصية (أولوية رابعة)
    else if (isCharacterName(line)) {
      const characterStyle = styleObjectToString(formatStyles.character);
      const parentheticalStyle = styleObjectToString(formatStyles.parenthetical);
      const dialogueStyle = styleObjectToString(formatStyles.dialogue);

      // Extract character name (remove colon)
      const characterName = line.replace(/:\s*$/, '').trim();
      formattedHTML += `<div style="${characterStyle}">${escapeHtml(characterName)}</div>`;

      // Look for dialogue and parentheticals on following lines
      i++; // Move to next line
      while (i < lines.length && lines[i].trim()) {
        const nextLine = lines[i].trim();

        // Check if next line is a new structural element
        if (isBasmala(nextLine) ||
            nextLine.match(/^(مشهد|م\.)\s*(\d+)/i) ||
            isTransition(nextLine) ||
            isCharacterName(nextLine)) {
          i--; // Step back so main loop processes this line
          break;
        }

        // Process parenthetical or dialogue
        if (isParenthetical(nextLine)) {
          formattedHTML += `<div style="${parentheticalStyle}">${escapeHtml(nextLine)}</div>`;
        } else {
          formattedHTML += `<div style="${dialogueStyle}">${escapeHtml(nextLine)}</div>`;
        }
        i++;
      }
      i--; // Adjust for main loop increment
    }

    // 5. Parenthetical detection (standalone) - الإرشادات المنفردة (أولوية خامسة)
    else if (isParenthetical(line)) {
      const parentheticalStyle = styleObjectToString(formatStyles.parenthetical);
      formattedHTML += `<div style="${parentheticalStyle}">${escapeHtml(line)}</div>`;
    }

    // 6. Default to action - الافتراضي هو السرد الحركي (آخر خيار)
    else {
      formattedHTML += `<div style="${actionStyle}">${escapeHtml(line)}</div>`;
    }
  }
  
  return formattedHTML;
}

export function extractPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function countElements(text: string) {
  const scenes = (text.match(/(مشهد|م\.)\s*\d+/gi) || []).length;
  const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const pages = Math.max(1, Math.ceil(words / 250));
  
  return { scenes, words, pages };
}

// Advanced pagination system for screenplay
export interface PageBreakInfo {
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  content: string;
}

export function paginateContent(content: string, wordsPerPage: number = 250): PageBreakInfo[] {
  const words = content.trim().split(/\s+/);
  const pages: PageBreakInfo[] = [];
  
  let currentPage = 1;
  let startIndex = 0;
  
  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + wordsPerPage, words.length);
    const pageContent = words.slice(startIndex, endIndex).join(' ');
    
    pages.push({
      pageNumber: currentPage,
      startIndex,
      endIndex,
      content: pageContent
    });
    
    startIndex = endIndex;
    currentPage++;
  }
  
  return pages;
}

function buildSceneHeaderElement(lines: string[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'scene-header-container';

  const topLine = document.createElement('div');
  topLine.className = 'scene-header-top-line';

  const firstLine = lines[0] ?? '';
  const secondLine = lines[1] ?? '';
  const match = firstLine.match(/^(مشهد|م\.)\s*(\d+)\s*[-–—]?\s*(.*)$/i);

  const sceneNumEl = document.createElement('span');
  sceneNumEl.className = 'scene-header-1';
  sceneNumEl.textContent = match ? `${match[1]} ${match[2]}` : firstLine;

  const timeLocationEl = document.createElement('span');
  timeLocationEl.className = 'scene-header-2';
  timeLocationEl.textContent = match ? match[3].trim() : '';

  topLine.appendChild(sceneNumEl);
  topLine.appendChild(timeLocationEl);
  container.appendChild(topLine);

  const placeText = secondLine || '';
  if (placeText) {
    const placeEl = document.createElement('div');
    placeEl.className = 'scene-header-3';
    placeEl.textContent = placeText;
    container.appendChild(placeEl);
  }

  return container;
}

function buildDialogueElement(lines: string[]): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'dialogue-block';

  if (lines.length === 0) {
    return wrapper;
  }

  const [rawName, ...rest] = lines;
  const characterEl = document.createElement('div');
  characterEl.className = 'character';
  characterEl.textContent = rawName.replace(/:\s*$/, '').trim();
  wrapper.appendChild(characterEl);

  rest.forEach((line) => {
    const target = document.createElement('div');
    if (isParenthetical(line)) {
      target.className = 'parenthetical';
    } else {
      target.className = 'dialogue';
    }
    target.textContent = line;
    wrapper.appendChild(target);
  });

  return wrapper;
}

function appendElement(engine: PaginationEngine, element: ScreenplayElement) {
  switch (element.type) {
    case 'basmala':
      engine.appendBlock(() => {
        const node = document.createElement('div');
        node.className = 'basmala';
        node.textContent = element.content;
        return node;
      });
      break;

    case 'scene-header':
      engine.appendBlock(() => buildSceneHeaderElement(element.lines));
      break;

    case 'transition':
      engine.appendBlock(() => {
        const node = document.createElement('div');
        node.className = 'transition';
        node.textContent = element.content;
        return node;
      });
      break;

    case 'dialogue':
      engine.appendBlock(() => buildDialogueElement(element.lines));
      break;

    case 'action':
    default:
      if (!element.content) {
        engine.appendBlock(() => {
          const placeholder = document.createElement('div');
          placeholder.className = 'action';
          placeholder.innerHTML = '<br />';
          return placeholder;
        });
      } else if (isParenthetical(element.content)) {
        engine.appendBlock(() => {
          const node = document.createElement('div');
          node.className = 'parenthetical';
          node.textContent = element.content;
          return node;
        });
      } else {
        engine.appendTextParagraph(element.content, 'action');
      }
      break;
  }
}

// Create page-based HTML structure using advanced engine
export function createPagedHTML(content: string): string {
  if (typeof document === 'undefined') {
    return createSimplePagedHTML(content);
  }

  const host = document.createElement('div');
  host.className = 'pages-host';
  host.style.position = 'absolute';
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.left = '-10000px';
  host.style.top = '0';

  document.body.appendChild(host);

  try {
    const engine = new PaginationEngine(host);
    const elements = analyzeContent(content);
    elements.forEach((element) => appendElement(engine, element));
    return `<div class="pages-host">${host.innerHTML}</div>`;
  } finally {
    document.body.removeChild(host);
  }
}

// Legacy simple pagination for backward compatibility
export function createSimplePagedHTML(content: string): string {
  const pages = paginateContent(content);
  const parts: string[] = [];

  parts.push('<div class="pages-host">');

  pages.forEach((page, index) => {
    if (index > 0) {
      parts.push('<div class="page-separator"></div>');
    }
    const pageContent = parseAndFormat(page.content);
    parts.push(`
      <div class="page" data-page="${page.pageNumber}">
        <div class="page-content">
          ${pageContent}
        </div>
        <div class="page-footer">${page.pageNumber}</div>
      </div>`);
  });

  if (pages.length === 0) {
    parts.push(`
      <div class="page" data-page="1">
        <div class="page-content"></div>
        <div class="page-footer">1</div>
      </div>`);
  }

  parts.push('</div>');
  return parts.join('');
}
