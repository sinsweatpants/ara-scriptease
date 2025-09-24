// Text Flow Monitor - مراقب تدفق النص التلقائي
// Monitors text flow and handles automatic page transitions

export interface TextFlowConfig {
  maxPageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  lineHeight: number;
}

export class TextFlowMonitor {
  private config: TextFlowConfig;
  private observer: MutationObserver | null = null;
  private currentPageHeight = 0;
  private pageElements: HTMLElement[] = [];

  constructor(config?: Partial<TextFlowConfig>) {
    this.config = {
      maxPageHeight: 698, // A4 height (842pt) - margins (144pt)
      marginTop: 72,      // 1 inch
      marginBottom: 72,   // 1 inch
      marginLeft: 108,    // 1.5 inches
      marginRight: 72,    // 1 inch
      lineHeight: 18,     // 12pt * 1.5 line spacing
      ...config
    };
  }

  // Initialize monitoring for a container
  startMonitoring(container: HTMLElement, onPageOverflow: (pageNumber: number) => void) {
    this.stopMonitoring();
    
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          shouldCheck = true;
        }
      });
      
      if (shouldCheck) {
        this.checkTextFlow(container, onPageOverflow);
      }
    });
    
    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Initial check
    this.checkTextFlow(container, onPageOverflow);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  // Check text flow and handle overflow
  private checkTextFlow(container: HTMLElement, onPageOverflow: (pageNumber: number) => void) {
    const pages = container.querySelectorAll('.page');
    
    pages.forEach((page, index) => {
      const pageContent = page.querySelector('.page-content');
      if (!pageContent) return;
      
      const contentHeight = this.calculateContentHeight(pageContent as HTMLElement);
      
      if (contentHeight > this.config.maxPageHeight) {
        // Mark page as overflowing
        page.classList.add('overflow');
        onPageOverflow(index + 1);
        
        // Handle overflow by moving content to next page
        this.handlePageOverflow(page as HTMLElement, container);
      } else {
        page.classList.remove('overflow');
      }
    });
  }

  // Calculate actual content height
  private calculateContentHeight(element: HTMLElement): number {
    let totalHeight = 0;
    const children = Array.from(element.children);
    
    children.forEach((child) => {
      const rect = child.getBoundingClientRect();
      const styles = window.getComputedStyle(child);
      const marginTop = parseInt(styles.marginTop) || 0;
      const marginBottom = parseInt(styles.marginBottom) || 0;
      
      totalHeight += rect.height + marginTop + marginBottom;
    });
    
    return totalHeight;
  }

  // Handle page overflow by moving content
  private handlePageOverflow(overflowPage: HTMLElement, container: HTMLElement) {
    const pageContent = overflowPage.querySelector('.page-content');
    if (!pageContent) return;
    
    const elements = Array.from(pageContent.children);
    let currentHeight = 0;
    let overflowElements: Element[] = [];
    
    // Find elements that cause overflow
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const elementHeight = this.getElementHeight(element as HTMLElement);
      
      if (currentHeight + elementHeight > this.config.maxPageHeight) {
        overflowElements = elements.slice(i);
        break;
      }
      
      currentHeight += elementHeight;
    }
    
    if (overflowElements.length > 0) {
      // Create or get next page
      const nextPage = this.getOrCreateNextPage(overflowPage, container);
      const nextPageContent = nextPage.querySelector('.page-content');
      
      if (nextPageContent) {
        // Move overflow elements to next page
        overflowElements.forEach((element) => {
          nextPageContent.appendChild(element);
        });
        
        // Update page numbers
        this.updatePageNumbers(container);
      }
    }
  }

  // Get element height including margins
  private getElementHeight(element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    const marginTop = parseInt(styles.marginTop) || 0;
    const marginBottom = parseInt(styles.marginBottom) || 0;
    
    return rect.height + marginTop + marginBottom;
  }

  // Get or create next page
  private getOrCreateNextPage(currentPage: HTMLElement, container: HTMLElement): HTMLElement {
    const currentPageNumber = parseInt(currentPage.dataset.page || '1');
    const nextPageNumber = currentPageNumber + 1;
    
    // Look for existing next page
    let nextPage = container.querySelector(`[data-page="${nextPageNumber}"]`) as HTMLElement;
    
    if (!nextPage) {
      // Create new page
      nextPage = this.createNewPage(nextPageNumber);
      
      // Insert after current page
      const nextSibling = currentPage.nextElementSibling;
      if (nextSibling) {
        container.insertBefore(nextPage, nextSibling);
      } else {
        container.appendChild(nextPage);
      }
    }
    
    return nextPage;
  }

  // Create new page element
  private createNewPage(pageNumber: number): HTMLElement {
    const page = document.createElement('div');
    page.className = 'page';
    page.dataset.page = pageNumber.toString();
    
    const pageContent = document.createElement('div');
    pageContent.className = 'page-content';
    
    const pageNumberElement = document.createElement('div');
    pageNumberElement.className = 'page-number';
    pageNumberElement.textContent = pageNumber.toString();
    
    page.appendChild(pageContent);
    page.appendChild(pageNumberElement);
    
    return page;
  }

  // Update page numbers after changes
  private updatePageNumbers(container: HTMLElement) {
    const pages = container.querySelectorAll('.page');
    
    pages.forEach((page, index) => {
      const pageNumber = index + 1;
      page.setAttribute('data-page', pageNumber.toString());
      
      const pageNumberElement = page.querySelector('.page-number');
      if (pageNumberElement) {
        pageNumberElement.textContent = pageNumber.toString();
      }
    });
  }

  // Get current page count
  getPageCount(container: HTMLElement): number {
    return container.querySelectorAll('.page').length;
  }

  // Check if content fits within A4 specifications
  validateA4Compliance(container: HTMLElement): boolean {
    const pages = container.querySelectorAll('.page');
    let isCompliant = true;
    
    pages.forEach((page) => {
      const pageContent = page.querySelector('.page-content');
      if (!pageContent) return;
      
      const contentHeight = this.calculateContentHeight(pageContent as HTMLElement);
      if (contentHeight > this.config.maxPageHeight) {
        isCompliant = false;
      }
    });
    
    return isCompliant;
  }
}

// Export singleton instance
export const textFlowMonitor = new TextFlowMonitor();