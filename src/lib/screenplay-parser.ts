// Helper function to escape HTML content to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to detect character names
function isCharacterName(line: string): boolean {
  return (
    line.match(/^[أ-ي\s]+:$/) !== null ||
    (line === line.toUpperCase() && line.match(/^[أ-ي\s]+$/) !== null) ||
    line.match(/^[أ-ي][أ-ي\s]{1,20}$/) !== null
  );
}

// Helper function to detect parenthetical (stage directions)
function isParenthetical(line: string): boolean {
  return line.match(/^\(.+\)$/) !== null;
}

// Helper function to detect transitions
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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Handle empty lines
    if (!line) {
      formattedHTML += '<div class="action"><br></div>';
      continue;
    }
    
    // 1. Basmala detection - البسملة
    if (line.includes('بسم الله الرحمن الرحيم')) {
      formattedHTML += `<div class="basmala">${escapeHtml(line)}</div>`;
    }
    
    // 2. Scene header detection - رأس المشهد
    else if (line.match(/^(مشهد|م\.)\s*\d+/i)) {
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
            !lines[i + 1].trim().match(/^(مشهد|م\.)\s*\d+/i) &&
            !isCharacterName(lines[i + 1].trim())) {
          i++;
          place = lines[i].trim();
        }
        
        formattedHTML += `
          <div class="scene-header-container">
            <div class="scene-header-top-line">
              <span class="scene-header-1">${escapeHtml(sceneNum)}</span>
              <span class="scene-header-2">${escapeHtml(timeLocation)}</span>
            </div>
            <div class="scene-header-3">${escapeHtml(place)}</div>
          </div>`;
      }
    }
    
    // 5. Transition detection - مؤشرات الانتقال
    else if (isTransition(line)) {
      formattedHTML += `<div class="transition">${escapeHtml(line)}</div>`;
    }
    
    // 4. Character name and dialogue block detection - الكتلة الحوارية
    else if (isCharacterName(line)) {
      let dialogueBlock = `<div class="dialogue-block">`;
      dialogueBlock += `<div class="character-name">${escapeHtml(line.replace(':', ''))}</div>`;
      
      // Check for parenthetical (stage directions) in next line
      if (i + 1 < lines.length && isParenthetical(lines[i + 1].trim())) {
        i++;
        dialogueBlock += `<div class="parenthetical">${escapeHtml(lines[i].trim())}</div>`;
      }
      
      // Collect dialogue text from subsequent lines
      while (i + 1 < lines.length && lines[i + 1].trim() && 
             !lines[i + 1].trim().match(/^(مشهد|م\.)\s*\d+/i) &&
             !isTransition(lines[i + 1].trim()) &&
             !isCharacterName(lines[i + 1].trim())) {
        i++;
        const dialogueLine = lines[i].trim();
        
        if (isParenthetical(dialogueLine)) {
          dialogueBlock += `<div class="parenthetical">${escapeHtml(dialogueLine)}</div>`;
        } else {
          dialogueBlock += `<div class="dialogue-text">${escapeHtml(dialogueLine)}</div>`;
        }
      }
      
      dialogueBlock += `</div>`;
      formattedHTML += dialogueBlock;
    }
    
    // 3. Default to action - السرد الحركي
    else {
      formattedHTML += `<div class="action">${escapeHtml(line)}</div>`;
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
