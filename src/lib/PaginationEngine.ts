const FONT_READY_MARGIN = 0.5;

type BuildFn = () => HTMLElement;

export interface PageRefs {
  page: HTMLElement;
  content: HTMLElement;
  footer: HTMLElement;
}

function parseMargin(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function outerHeight(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const styles = window.getComputedStyle(el);
  const marginTop = parseMargin(styles.marginTop);
  const marginBottom = parseMargin(styles.marginBottom);
  return rect.height + marginTop + marginBottom;
}

function createPage(pageNo: number): PageRefs {
  const page = document.createElement('div');
  page.className = 'page';
  page.setAttribute('data-page', String(pageNo));

  const content = document.createElement('div');
  content.className = 'page-content';

  const footer = document.createElement('div');
  footer.className = 'page-footer';
  footer.textContent = String(pageNo);

  page.appendChild(content);
  page.appendChild(footer);

  return { page, content, footer };
}

function createSeparator(): HTMLElement {
  const separator = document.createElement('div');
  separator.className = 'page-separator';
  return separator;
}

function getFontReadyPromise(): Promise<unknown> | null {
  const anyDocument = document as typeof document & {
    fonts?: { ready?: Promise<unknown> };
  };

  return anyDocument.fonts?.ready ?? null;
}

export class PaginationEngine {
  private readonly host: HTMLElement;
  private readonly pages: PageRefs[] = [];
  private current: PageRefs;
  private pageNo = 0;
  private readonly afterPageCreated?: (page: PageRefs) => void;

  constructor(host: HTMLElement, onPageCreated?: (page: PageRefs) => void) {
    this.host = host;
    this.afterPageCreated = onPageCreated;
    this.current = this.addPage(true);
  }

  private addPage(isFirst = false): PageRefs {
    const page = createPage(++this.pageNo);
    if (!isFirst) {
      this.host.appendChild(createSeparator());
    }
    this.host.appendChild(page.page);
    this.pages.push(page);
    this.afterPageCreated?.(page);
    this.current = page;
    return page;
  }

  private remainingHeight(): number {
    const total = this.current.content.clientHeight;
    let used = 0;
    const children = Array.from(this.current.content.children) as HTMLElement[];
    for (const child of children) {
      used += outerHeight(child);
    }

    const remaining = total - used - FONT_READY_MARGIN;
    return remaining > 0 ? remaining : 0;
  }

  appendBlock(build: BuildFn) {
    const node = build();
    this.current.content.appendChild(node);

    const fontPromise = getFontReadyPromise();
    if (fontPromise) {
      fontPromise.catch(() => {
        /* ignore font readiness errors */
      });
    }

    const height = outerHeight(node);
    const remaining = this.remainingHeight();

    if (height > remaining && this.current.content.children.length > 1) {
      this.current.content.removeChild(node);
      this.addPage();
      this.current.content.appendChild(node);
    }
  }

  appendTextParagraph(rawText: string, className: string) {
    const words = rawText.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      this.appendBlock(() => {
        const empty = document.createElement('div');
        empty.className = className;
        empty.innerHTML = '&nbsp;';
        return empty;
      });
      return;
    }

    if (this.remainingHeight() <= 0) {
      this.addPage();
    }

    const build = (count: number) => {
      const element = document.createElement('div');
      element.className = className;
      element.textContent = words.slice(0, count).join(' ');
      return element;
    };

    let lo = 1;
    let hi = words.length;
    let best = 0;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const probe = build(mid);
      this.current.content.appendChild(probe);
      const fits = this.remainingHeight() >= 0;
      this.current.content.removeChild(probe);

      if (fits) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best > 0) {
      const part = build(best);
      this.appendBlock(() => part);
    }

    const remainingWords = words.slice(best);
    if (remainingWords.length > 0) {
      this.addPage();
      this.appendTextParagraph(remainingWords.join(' '), className);
    }
  }

  clear() {
    this.host.innerHTML = '';
    this.pages.length = 0;
    this.pageNo = 0;
    this.current = this.addPage(true);
  }

  getPages(): PageRefs[] {
    return [...this.pages];
  }
}
