interface ProcessStep {
  index: string;
  title: string;
  description: string;
  icon: string;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    index: '01',
    title: 'Consultation & Custom Design',
    description:
      "We start with a conversation \u2014 dimensions, wood species, and whether you need a kiosk, table, or cabinet. Every build begins tailored to your space.",
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 40L14 34M14 34L34 14L40 20L20 40H14V34Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M28 10L38 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    index: '02',
    title: '3D Preview & Approval',
    description:
      'Before a single board is cut, you see it: a detailed 3D visualization of the finished piece, refined with your feedback until it is exactly right.',
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 6L42 16V32L24 42L6 32V16L24 6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M24 6V24M24 24L42 16M24 24L6 16M24 24V42" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    index: '03',
    title: 'Precision Craftsmanship',
    description:
      'In the workshop: cutting, assembling, recessed LED accents fitted by hand, and protective clearcoats applied for a glossy, lasting finish.',
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="32" r="6" stroke="currentColor" stroke-width="2"/>
      <path d="M20 28L38 10L42 14L24 32" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M33 15L37 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    index: '04',
    title: 'Quality Check & Delivery',
    description:
      'A final durability inspection confirms every joint and finish meets our standard, then we deliver and set up your piece exactly where it belongs.',
    icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 24L18 34L40 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6" y="8" width="36" height="32" rx="4" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"/>
    </svg>`,
  },
];

function buildStepCard(step: ProcessStep, position: number, total: number): HTMLElement {
  const card = document.createElement('article');
  card.className = 'process-step';
  card.style.setProperty('--step-delay', `${position * 90}ms`);
  card.setAttribute('data-step', step.index);

  card.innerHTML = `
    <div class="process-step__badge" aria-hidden="true">${step.index}</div>
    <div class="process-step__icon">${step.icon}</div>
    <h3 class="process-step__title">${step.title}</h3>
    <p class="process-step__desc">${step.description}</p>
  `;

  if (position < total - 1) {
    const connector = document.createElement('span');
    connector.className = 'process-step__connector';
    connector.setAttribute('aria-hidden', 'true');
    card.appendChild(connector);
  }

  return card;
}

function buildHeader(): HTMLElement {
  const header = document.createElement('div');
  header.className = 'process-header';
  header.innerHTML = `
    <span class="process-eyebrow">How We Work</span>
    <h2 class="process-title">Our Crafting Process</h2>
    <p class="process-lead">
      From first sketch to final delivery, every WMA piece moves through four
      deliberate stages \u2014 built for precision, finished for a lifetime.
    </p>
  `;
  return header;
}

function buildCta(): HTMLElement {
  const cta = document.createElement('div');
  cta.className = 'process-cta';
  cta.innerHTML = `
    <div class="process-cta__text">
      <h3>Ready to start your build?</h3>
      <p>Tell us what you're picturing \u2014 we'll take it from sketch to finished piece.</p>
    </div>
    <button type="button" class="btn btn--accent process-cta__btn" id="process-cta-btn">
      Start a Project
    </button>
  `;

  const button = cta.querySelector<HTMLButtonElement>('#process-cta-btn');
  button?.addEventListener('click', () => {

    const notCancelled = document.dispatchEvent(
      new CustomEvent('wma:open-inquiry', { cancelable: true })
    );

    if (notCancelled) {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return cta;
}

function observeReveal(root: HTMLElement): void {
  const steps = root.querySelectorAll<HTMLElement>('.process-step');

  if (!('IntersectionObserver' in window)) {
    steps.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
  );

  steps.forEach((el) => observer.observe(el));
}

export function createProcessSection(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'section wrap process-section';
  section.id = 'process';

  const grid = document.createElement('div');
  grid.className = 'process-grid';
  PROCESS_STEPS.forEach((step, i) => {
    grid.appendChild(buildStepCard(step, i, PROCESS_STEPS.length));
  });

  section.appendChild(buildHeader());
  section.appendChild(grid);
  section.appendChild(buildCta());

  requestAnimationFrame(() => observeReveal(section));

  return section;
}