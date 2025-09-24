// Advanced Pagination Engine for Arabic Screenplay
// محرك الترحيل التلقائي للصفحات المتقدم

export interface PageDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface PageContent {
  pageNumber: number;
  elements: ScreenplayElement[];
  height: number;
  overflow: boolean;
}

export interface ScreenplayElement {
  type: 'basmala' | 'scene-header' | 'action' | 'dialogue' | 'transition';
  content: string;
  estimatedHeight: number;
  lineCount: number;
}

export class PaginationEngine {
  private dimensions: PageDimensions;
  private maxPageHeight: number;

  constructor(dimensions?: Partial<PageDimensions>) {
    this.dimensions = {
      width: 595, // A4 width: 210mm * 2.83 points/mm
      height: 842, // A4 height: 297mm * 2.83 points/mm
      marginTop: 72, // 1 inch = 72 points
      marginBottom: 72, // 1 inch = 72 points
      marginLeft: 108, // 1.5 inches = 108 points
      marginRight: 72, // 1 inch = 72 points
      ...dimensions
    };
    
    // Calculate available content height (A4 height minus top/bottom margins)
    this.maxPageHeight = this.dimensions.height - this.dimensions.marginTop - this.dimensions.marginBottom;
  }

  // Analyze text and create screenplay elements
  analyzeContent(text: string): ScreenplayElement[] {
    const lines = text.split('\n');
    const elements: ScreenplayElement[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        elements.push({
          type: 'action',
          content: '',
          estimatedHeight: 12, // Empty line height
          lineCount: 1
        });
        continue;
      }

      // Basmala detection
      if (/^\s*بسم\s+الله\s+الرحمن\s+الرحيم\s*$/.test(line)) {
        elements.push({
          type: 'basmala',
          content: line,
          estimatedHeight: 36, // 18pt font + margins
          lineCount: 1
        });
      }
      
      // Scene header detection
      else if (line.match(/^(مشهد|م\.)\s*\d+/i)) {
        let sceneContent = line;
        let lineCount = 1;
        
        // Check if location is on next line
        if (i + 1 < lines.length && lines[i + 1].trim() && 
            !this.isNewElement(lines[i + 1].trim())) {
          i++;
          sceneContent += '\n' + lines[i].trim();
          lineCount = 2;
        }
        
        elements.push({
          type: 'scene-header',
          content: sceneContent,
          estimatedHeight: lineCount * 18 + 20, // Scene header spacing
          lineCount
        });
      }
      
      // Transition detection
      else if (this.isTransition(line)) {
        elements.push({
          type: 'transition',
          content: line,
          estimatedHeight: 24, // Bold text + margins
          lineCount: 1
        });
      }
      
      // Character name and dialogue
      else if (this.isCharacterName(line)) {
        let dialogueContent = line;
        let dialogueHeight = 18; // Character name
        let lineCount = 1;
        
        // Collect dialogue block
        while (i + 1 < lines.length && lines[i + 1].trim() && 
               !this.isNewElement(lines[i + 1].trim())) {
          i++;
          const dialogueLine = lines[i].trim();
          dialogueContent += '\n' + dialogueLine;
          lineCount++;
          
          if (this.isParenthetical(dialogueLine)) {
            dialogueHeight += 16; // Smaller font for parenthetical
          } else {
            dialogueHeight += 18; // Regular dialogue line
          }
        }
        
        elements.push({
          type: 'dialogue',
          content: dialogueContent,
          estimatedHeight: dialogueHeight + 15, // Dialogue block padding
          lineCount
        });
      }
      
      // Default to action
      else {
        const lineCount = Math.ceil(line.length / 80); // Estimate line wrapping
        elements.push({
          type: 'action',
          content: line,
          estimatedHeight: lineCount * 18 + 6, // Line height + small margin
          lineCount
        });
      }
    }

    return elements;
  }

  // Create pages from screenplay elements
  createPages(elements: ScreenplayElement[]): PageContent[] {
    const pages: PageContent[] = [];
    let currentPage: PageContent = {
      pageNumber: 1,
      elements: [],
      height: 0,
      overflow: false
    };

    for (const element of elements) {
      // Dynamic pagination with A4 compliance
      const willOverflow = currentPage.height + element.estimatedHeight > this.maxPageHeight;
      
      if (willOverflow && currentPage.elements.length > 0) {
        // Complete current page and start new one
        pages.push(currentPage);
        
        // Create new page with mandatory A4 margins
        currentPage = {
          pageNumber: pages.length + 1,
          elements: [element],
          height: element.estimatedHeight,
          overflow: false
        };
      } else {
        // Add element to current page
        currentPage.elements.push(element);
        currentPage.height += element.estimatedHeight;
        
        // Mark overflow if approaching limit
        if (currentPage.height > this.maxPageHeight * 0.95) {
          currentPage.overflow = true;
        }
      }
    }

    // Add the last page if it has content
    if (currentPage.elements.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [{
      pageNumber: 1,
      elements: [],
      height: 0,
      overflow: false
    }];
  }

  // Generate HTML for paginated content
  generatePaginatedHTML(text: string): string {
    const elements = this.analyzeContent(text);
    const pages = this.createPages(elements);
    
    let html = '<div class="screenplay-pages">';
    
    for (const page of pages) {
      const overflowClass = page.overflow ? ' overflow' : '';
      html += `<div class="page${overflowClass}" data-page="${page.pageNumber}">`;
      html += '<div class="page-content">';
      
      for (const element of page.elements) {
        html += this.elementToHTML(element);
      }
      
      html += '</div>';
      html += `<div class="page-number">${page.pageNumber}</div>`;
      
      // Add overflow indicator if needed
      if (page.overflow) {
        html += '<div class="page-overflow-indicator">تجاوز الصفحة</div>';
      }
      
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  // Convert screenplay element to HTML
  private elementToHTML(element: ScreenplayElement): string {
    const content = this.escapeHtml(element.content);
    
    switch (element.type) {
      case 'basmala':
        return `<div class="basmala">${content}</div>`;
        
      case 'scene-header':
        return this.formatSceneHeader(content);
        
      case 'action':
        return element.content ? `<div class="action">${content}</div>` : '<div class="action"><br></div>';
        
      case 'dialogue':
        return this.formatDialogue(content);
        
      case 'transition':
        return `<div class="transition">${content}</div>`;
        
      default:
        return `<div class="action">${content}</div>`;
    }
  }

  // Format scene header with proper structure
  private formatSceneHeader(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0];
    const secondLine = lines[1] || '';
    
    const sceneMatch = firstLine.match(/^(مشهد|م\.)\s*(\d+)\s*[-–—]?\s*(.*)/i);
    if (sceneMatch) {
      const sceneNum = `${sceneMatch[1]} ${sceneMatch[2]}`;
      const timeLocation = sceneMatch[3] || '';
      const place = secondLine || '';
      
      return `
        <div class="scene-header-container">
          <div class="scene-header-top-line">
            <span class="scene-header-1">${this.escapeHtml(sceneNum)}</span>
            <span class="scene-header-2">${this.escapeHtml(timeLocation)}</span>
          </div>
          <div class="scene-header-3">${this.escapeHtml(place)}</div>
        </div>`;
    }
    
    return `<div class="scene-header-container">${this.escapeHtml(content)}</div>`;
  }

  // Format dialogue block
  private formatDialogue(content: string): string {
    const lines = content.split('\n');
    let html = '<div class="dialogue-block">';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (i === 0) {
        // First line is character name
        html += `<div class="character-name">${this.escapeHtml(line.replace(':', ''))}</div>`;
      } else if (this.isParenthetical(line)) {
        html += `<div class="parenthetical">${this.escapeHtml(line)}</div>`;
      } else {
        html += `<div class="dialogue-text">${this.escapeHtml(line)}</div>`;
      }
    }
    
    html += '</div>';
    return html;
  }

  // Helper methods
  private isCharacterName(line: string): boolean {
    return /^\s*[\u0600-\u06FF][\u0600-\u06FF\s]{0,40}\s*:\s*$/.test(line);
  }

  private isParenthetical(line: string): boolean {
    return line.match(/^\(.*\)$/) !== null;
  }

  private isTransition(line: string): boolean {
    const patterns = [
      /قطع\s+إلى/i, /انتقال\s+إلى/i, /قطع\./i, /انتقال/i,
      /فيد\s+إلى/i, /فيد\s+من/i, /تلاشي\s+إلى/i, /ذوبان\s+إلى/i,
      /انتهاء/i, /النهاية/i
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private isNewElement(line: string): boolean {
    return (
      line.match(/^(مشهد|م\.)\s*\d+/i) !== null ||
      this.isTransition(line) ||
      this.isCharacterName(line) ||
      line.includes('بسم الله الرحمن الرحيم')
    );
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton instance
export const paginationEngine = new PaginationEngine();