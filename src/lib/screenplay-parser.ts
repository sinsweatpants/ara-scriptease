// Helper function to escape HTML content to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Import advanced dialogue detector
import DialogueDetector, { formatStyles } from './dialogue-detector';
import type { CSSProperties } from 'react';

// Helper function to convert style object to string
function styleObjectToString(style: CSSProperties): string {
    return Object.entries(style).map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
    }).join('; ');
}

// Helper function to detect character names - محسن باستخدام كاشف الحوار
function isCharacterName(line: string): boolean {
  return DialogueDetector.isCharacterName(line);
}

// Helper function to detect parenthetical (stage directions) - محسن للنصوص الإرشادية
function isParenthetical(line: string): boolean {
  return line.match(/^\(.*\)$/) !== null;
}

// Helper function to detect transitions - محسن لمؤشرات الانتقال
function isTransition(line: string): boolean {
  const transitionPatterns = [
    /قطع\s+إلى/i,
    /انتقال\s+إلى/i,
    /قطع\./i,
    /انتقال/i,
    /فيد\s+إلى/i,
    /فيد\s+من/i,
    /تلاشي\s+إلى/i,
    /تلاشي\s+من/i,
    /ذوبان\s+إلى/i,
    /انتهاء/i,
    /النهاية/i
  ];
  
  return transitionPatterns.some(pattern => pattern.test(line));
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
    
    // 1. Basmala detection - البسملة
    if (line.includes('بسم الله الرحمن الرحيم')) {
      formattedHTML += `<div style="${basmalaStyle}">${escapeHtml(line)}</div>`;
    }
    
    // 2. Scene header detection - رأس المشهد (محسن)
    else if (line.match(/^(مشهد|م\.)\s*(\d+)\s*[-–—]?\s*(.*)/i)) {
      const sceneHeaderMatch = line.match(/^(مشهد|م\.)\s*(\d+)\s*[-–—]?\s*(.*)/i);
      if (sceneHeaderMatch) {
        const sceneNum = `${sceneHeaderMatch[1]} ${sceneHeaderMatch[2]}`;
        const restOfLine = sceneHeaderMatch[3] || '';
        
        // Parse time and location from the rest of the line
        const timeLocationMatch = restOfLine.match(/(داخلي|خارجي|د\.|خ\.)\s*[-–—]?\s*(ليل|نهار|ل\.|ن\.|صباح|مساء|فجر|ظهر)/i);
        let timeLocation = '';
        let place = '';
        
        if (timeLocationMatch) {
          timeLocation = timeLocationMatch[0];
          place = restOfLine.replace(timeLocationMatch[0], '').replace(/^\s*[-–—]?\s*/, '').trim();
        } else {
          place = restOfLine;
        }
        
        // Check if place is on the next line
        if (!place && i + 1 < lines.length && lines[i + 1].trim() && 
            !lines[i + 1].trim().match(/^(مشهد|م\.)\s*(\d+)/i) &&
            !isCharacterName(lines[i + 1].trim()) &&
            !isTransition(lines[i + 1].trim())) {
          i++;
          place = lines[i].trim();
        }
        
        const sceneHeaderTopLineStyle = styleObjectToString(formatStyles['scene-header-top-line']);
        const sceneHeader3Style = styleObjectToString(formatStyles['scene-header-3']);

        formattedHTML += `
          <div>
            <div style="${sceneHeaderTopLineStyle}">
              <span>${escapeHtml(sceneNum)}</span>
              <span>${escapeHtml(timeLocation)}</span>
            </div>
            <div style="${sceneHeader3Style}">${escapeHtml(place)}</div>
          </div>`;
      }
    }
    
    // 4. Character name and dialogue block detection (PRIORITIZED)
    // 4. الكشف عن اسم الشخصية وكتلة الحوار (أولوية التنفيذ)
    else if (isCharacterName(line)) {
      // Use advanced dialogue detector
      const dialogueBlock = DialogueDetector.extractDialogueBlock(lines, i);
      
      if (dialogueBlock) {
        const characterStyle = styleObjectToString(formatStyles.character);
        const parentheticalStyle = styleObjectToString(formatStyles.parenthetical);
        const dialogueStyle = styleObjectToString(formatStyles.dialogue);

        // Generate HTML for the complete dialogue block
        let dialogueHTML = '<div>';
        dialogueHTML += `<div style="${characterStyle}">${escapeHtml(dialogueBlock.characterName)}</div>`;
        
        // Add parentheticals first
        for (const parenthetical of dialogueBlock.parentheticals) {
          dialogueHTML += `<div style="${parentheticalStyle}">${escapeHtml(parenthetical)}</div>`;
        }
        
        // Add dialogue lines
        for (const dialogueLine of dialogueBlock.dialogueLines) {
          dialogueHTML += `<div style="${dialogueStyle}">${escapeHtml(dialogueLine)}</div>`;
        }
        
        dialogueHTML += '</div>';
        formattedHTML += dialogueHTML;
        
        // Skip to the end of the dialogue block
        i = dialogueBlock.endIndex;
      } else {
        // Fallback to treating as action if dialogue detection fails
        formattedHTML += `<div style="${actionStyle}">${escapeHtml(line)}</div>`;
      }
    }
    
    // 5. Transition detection - مؤشرات الانتقال
    else if (isTransition(line)) {
      formattedHTML += `<div style="${transitionStyle}">${escapeHtml(line)}</div>`;
    }
    
    // 3. Default to action (LAST RESORT)
    // 3. الافتراضي هو السرد الحركي (الحل الأخير)
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
  const formattedContent = parseAndFormat(content);
  const pages = paginateContent(content);
  
  let pagedHTML = '<div class="screenplay-pages">';
  
  pages.forEach((page, index) => {
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
