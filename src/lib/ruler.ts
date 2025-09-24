export type RulerOrientation = 'horizontal' | 'vertical';

export const PIXELS_PER_CM = 37.7952755906;

const RULER_LENGTH: Record<RulerOrientation, number> = {
  horizontal: 1000,
  vertical: 1123,
};

function rulerIterationCount(orientation: RulerOrientation): number {
  return Math.floor(RULER_LENGTH[orientation] / PIXELS_PER_CM);
}

export function getRulerMarkup(orientation: RulerOrientation): string {
  const iterations = rulerIterationCount(orientation);
  const labels: string[] = [];

  for (let i = 1; i <= iterations; i++) {
    const position = i * PIXELS_PER_CM;
    const positionStyle =
      orientation === 'horizontal'
        ? `right: ${position}px; transform: translateX(50%);`
        : `top: ${position}px; transform: translateY(-50%);`;

    labels.push(`<span class="ruler-number" style="${positionStyle}">${i}</span>`);
  }

  return `<div class="ruler-container ${orientation}" aria-hidden="true" dir="ltr">${labels.join('')}</div>`;
}

export function createRulerElement(orientation: RulerOrientation): HTMLElement {
  const container = document.createElement('div');
  container.className = `ruler-container ${orientation}`;
  container.setAttribute('aria-hidden', 'true');
  container.dir = 'ltr';

  const iterations = rulerIterationCount(orientation);

  for (let i = 1; i <= iterations; i++) {
    const position = i * PIXELS_PER_CM;
    const label = document.createElement('span');
    label.className = 'ruler-number';
    if (orientation === 'horizontal') {
      label.style.right = `${position}px`;
      label.style.transform = 'translateX(50%)';
    } else {
      label.style.top = `${position}px`;
      label.style.transform = 'translateY(-50%)';
    }
    label.textContent = String(i);
    container.appendChild(label);
  }

  return container;
}

export const HORIZONTAL_RULER_HTML = getRulerMarkup('horizontal');
export const VERTICAL_RULER_HTML = getRulerMarkup('vertical');
