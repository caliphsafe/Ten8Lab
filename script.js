const slidesContainer = document.querySelector('.slides');
const slides = [...document.querySelectorAll('.slide')];
const navDots = [...document.querySelectorAll('.nav-dot')];
const currentSlideEl = document.getElementById('currentSlide');
const progressEl = document.getElementById('scrollProgress');
const restartButton = document.getElementById('restartPresentation');

let activeIndex = 0;
let scrollLock = false;

function padSlideNumber(number) {
  return String(number).padStart(2, '0');
}

function updatePresentationUI(index) {
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));

  currentSlideEl.textContent = padSlideNumber(activeIndex + 1);

  navDots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === activeIndex);
  });

  const percentage = slides.length > 1
    ? (activeIndex / (slides.length - 1)) * 100
    : 100;

  progressEl.style.width = `${percentage}%`;
}

function goToSlide(index) {
  const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
  slides[safeIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const slideObserver = new IntersectionObserver(
  (entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visibleEntries.length) return;

    const visibleSlide = visibleEntries[0].target;
    const index = slides.indexOf(visibleSlide);

    visibleSlide.classList.add('is-visible');
    updatePresentationUI(index);
  },
  {
    root: slidesContainer,
    threshold: [0.45, 0.6, 0.75]
  }
);

slides.forEach((slide) => slideObserver.observe(slide));

navDots.forEach((dot, index) => {
  dot.addEventListener('click', (event) => {
    event.preventDefault();
    goToSlide(index);
  });
});

function handleKeyNavigation(event) {
  const targetTag = event.target.tagName.toLowerCase();
  const isInteractive = ['input', 'textarea', 'select', 'button', 'a', 'summary'].includes(targetTag);

  if (isInteractive) return;

  if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    goToSlide(activeIndex + 1);
  }

  if (['ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    goToSlide(activeIndex - 1);
  }

  if (event.key === 'Home') {
    event.preventDefault();
    goToSlide(0);
  }

  if (event.key === 'End') {
    event.preventDefault();
    goToSlide(slides.length - 1);
  }
}

document.addEventListener('keydown', handleKeyNavigation);

slidesContainer.addEventListener(
  'wheel',
  (event) => {
    if (window.matchMedia('(max-width: 820px)').matches) return;
    if (Math.abs(event.deltaY) < 24 || scrollLock) return;

    scrollLock = true;

    if (event.deltaY > 0) {
      goToSlide(activeIndex + 1);
    } else {
      goToSlide(activeIndex - 1);
    }

    window.setTimeout(() => {
      scrollLock = false;
    }, 650);
  },
  { passive: true }
);

restartButton?.addEventListener('click', () => goToSlide(0));

window.addEventListener('load', () => {
  slides[0]?.classList.add('is-visible');
  updatePresentationUI(0);
});
