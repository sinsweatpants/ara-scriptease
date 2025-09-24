// Helper function to escape HTML content to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Import advanced dialogue detector
import { formatStyles } from './dialogue-detector';
import { SceneHeaderExtractor } from './scene-header-extractor';
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

// Import the advanced pagination engine
import { paginationEngine } from './pagination-engine';

// Create page-based HTML structure using advanced engine
export function createPagedHTML(content: string): string {
  return paginationEngine.generatePaginatedHTML(content);
}

// Legacy simple pagination for backward compatibility
export function createSimplePagedHTML(content: string): string {
  const pages = paginateContent(content);

  let pagedHTML = '<div class="screenplay-pages">';

  pages.forEach((page) => {
    const pageContent = parseAndFormat(page.content);
    pagedHTML += `
      <div class="page" data-page="${page.pageNumber}">
        <div class="page-content">
          ${pageContent}
        </div>
        <div class="page-number">${page.pageNumber}</div>
      </div>`;
  });

  pagedHTML += '</div>';
  return pagedHTML;
}
