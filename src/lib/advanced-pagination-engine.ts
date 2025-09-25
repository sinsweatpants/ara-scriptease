type BuildFn = () => HTMLElement;

interface PageRefs {
  page: HTMLElement;
  content: HTMLElement;  // .page-content
  footer: HTMLElement;   // .page-footer
}

function outerHeight(el: HTMLElement): number {
  const r = el.getBoundingClientRect().height;
  const cs = window.getComputedStyle(el);
  return r + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
}

function createPage(pageNo: number): PageRefs {
  const page = document.createElement('div');
  page.className = 'page';

  const content = document.createElement('div');
  content.className = 'page-content';

  const footer = document.createElement('div');
  footer.className = 'page-footer';
  footer.textContent = String(pageNo);

  page.appendChild(content);
  page.appendChild(footer);

  return { page, content, footer };
}

/** شريط الفاصل الأصفر بين الصفحات */
function createSeparator(): HTMLElement {
  const sep = document.createElement('div');
  sep.className = 'page-separator';
  return sep;
}

export class AdvancedPaginationEngine {
  private host: HTMLElement;
  private pages: PageRefs[] = [];
  private current!: PageRefs;
  private pageNo = 0;
  private afterPageCreated?: (page: PageRefs) => void;

  constructor(host: HTMLElement, onPageCreated?: (page: PageRefs) => void) {
    this.host = host;
    this.afterPageCreated = onPageCreated;
    this.addPage(/*first*/ true);
  }

  private addPage(isFirst = false) {
    const page = createPage(++this.pageNo);
    if (!isFirst) {
      // أدخل فاصلًا مرئيًا قبل الصفحة الجديدة
      this.host.appendChild(createSeparator());
    }
    this.host.appendChild(page.page);
    this.pages.push(page);
    this.current = page;
    this.afterPageCreated?.(page);
  }

  /** مساحة الكتابة الفعلية المتاحة الآن داخل الصفحة الجارية */
  private remainingHeight(): number {
    const content = this.current.content;
    const rect = content.getBoundingClientRect();
    const total = rect.height;

    let used = 0;
    for (const child of Array.from(content.children)) {
      used += outerHeight(child as HTMLElement);
    }
    // هامش دقّة صغير لمنع قص بيكسل
    return Math.max(0, total - used - 0.5);
  }

  /** أدخل عقدة واحدة مع كسر تلقائي إن لزم */
  appendBlock(build: BuildFn) {
    const probe = build();

    // أدخل مؤقتًا للقياس
    this.current.content.appendChild(probe);

    // انتظر الخطوط إن لزم لضمان قياس صحيح
    if ((document as any).fonts?.ready) {
      // عدم await خارجيًا كي لا يجمّد الخيط إن لم تكن مدعومة
      (document as any).fonts.ready.catch(() => {});
    }

    const H = outerHeight(probe);
    const rem = this.remainingHeight();

    if (H > rem && this.current.content.children.length > 1) {
      // لا يتسع: انقل للصفحة التالية
      this.current.content.removeChild(probe);
      this.addPage();
      this.current.content.appendChild(probe);
    }
  }

  /**
   * إدراج فقرة قابلة للتجزئة (حوار طويل/وصف طويل).
   * تقسم النص على حدود الكلمات ثنائيًّا للوصول لأكبر جزء يلائم الصفحة.
   */
  appendTextParagraph(rawText: string, className: string) {
    const words = rawText.split(/\s+/);
    let lo = 0, hi = words.length, best = 0;

    const build = (cnt: number) => {
      const el = document.createElement('div');
      el.className = className;
      el.textContent = words.slice(0, cnt).join(' ');
      return el;
    };

    // جرّب ملاءمة على الصفحة الحالية
    const rem = this.remainingHeight();
    if (rem <= 0) {
      this.addPage();
    }

    // بحث ثنائي لأكبر مقطع يلائم الصفحة
    while (lo <= hi) {
      const mid = ((lo + hi) >> 1);
      const probe = build(mid);
      this.current.content.appendChild(probe);

      const H = outerHeight(probe);
      const fits = H <= this.remainingHeight() + H; // قياس بعد الإدراج
      this.current.content.removeChild(probe);

      if (fits) { best = mid; lo = mid + 1; }
      else { hi = mid - 1; }
    }

    // أدخل الجزء الملائم
    if (best > 0) {
      const part = build(best);
      this.appendBlock(() => part);
    }

    // الباقي إلى صفحة/صفحات لاحقة
    const rest = words.slice(best).join(' ').trim();
    if (rest) {
      this.addPage();
      this.appendTextParagraph(rest, className);
    }
  }

  /** إنشاء ترويسة مشهد مع التوزيع الصحيح */
  appendSceneHeader(sceneNum: string, timeLocation: string, place?: string) {
    this.appendBlock(() => {
      const wrap = document.createElement('div');
      wrap.className = 'scene-header-container';

      const top = document.createElement('div');
      top.className = 'scene-header-top-line';

      const s1 = document.createElement('span');
      s1.className = 'scene-header-1';
      s1.textContent = sceneNum;

      const s2 = document.createElement('span');
      s2.className = 'scene-header-2';
      s2.textContent = timeLocation;

      top.appendChild(s1);
      top.appendChild(s2);
      wrap.appendChild(top);

      if (place) {
        const s3 = document.createElement('div');
        s3.className = 'scene-header-3';
        s3.textContent = place;
        wrap.appendChild(s3);
      }

      return wrap;
    });
  }

  /** إضافة انتقال في المنتصف */
  appendTransition(text: string) {
    this.appendBlock(() => {
      const tr = document.createElement('div');
      tr.className = 'transition';
      tr.textContent = text;
      return tr;
    });
  }

  /** إضافة حوار مع اسم الشخصية */
  appendDialogue(character: string, dialogue: string, parenthetical?: string) {
    this.appendBlock(() => {
      const char = document.createElement('div');
      char.className = 'character';
      char.textContent = character;
      return char;
    });

    if (parenthetical) {
      this.appendBlock(() => {
        const par = document.createElement('div');
        par.className = 'parenthetical';
        par.textContent = parenthetical;
        return par;
      });
    }

    this.appendTextParagraph(dialogue, 'dialogue');
  }

  /** إضافة وصف حركي */
  appendAction(text: string) {
    this.appendTextParagraph(text, 'action');
  }

  /** الحصول على عدد الصفحات */
  getPageCount(): number {
    return this.pages.length;
  }

  /** مسح جميع الصفحات */
  clear() {
    this.host.innerHTML = '';
    this.pages = [];
    this.pageNo = 0;
    this.addPage(true);
  }
}