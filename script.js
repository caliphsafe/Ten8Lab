const executiveSummary =
  document.getElementById('executiveSummary');

const pitchShell =
  document.querySelector('.site-shell');

const enterPitchButtons = [
  ...document.querySelectorAll('[data-enter-pitch]')
];

const backToSummaryButtons = [
  ...document.querySelectorAll('[data-back-to-summary]')
];

const summaryRevealItems = [
  ...document.querySelectorAll('.summary-reveal')
];


const slidesContainer =
  document.querySelector('.slides');

const slides = [
  ...document.querySelectorAll('.slide')
];

const navDots = [
  ...document.querySelectorAll('.nav-dot')
];

const currentSlideEl =
  document.getElementById('currentSlide');

const progressEl =
  document.getElementById('scrollProgress');

const restartButton =
  document.getElementById('restartPresentation');


let activeIndex = 0;
let scrollLock = false;
let presentationIsOpen = false;


/* =========================================================
   HELPERS
   ========================================================= */

function padSlideNumber(number) {
  return String(number).padStart(2, '0');
}


function updatePresentationUI(index) {
  activeIndex = Math.max(
    0,
    Math.min(index, slides.length - 1)
  );


  if (currentSlideEl) {
    currentSlideEl.textContent =
      padSlideNumber(activeIndex + 1);
  }


  navDots.forEach((dot, dotIndex) => {
    dot.classList.toggle(
      'is-active',
      dotIndex === activeIndex
    );
  });


  const percentage =
    slides.length > 1
      ? (
          activeIndex /
          (slides.length - 1)
        ) * 100
      : 100;


  if (progressEl) {
    progressEl.style.width =
      `${percentage}%`;
  }
}


function goToSlide(
  index,
  behavior = 'smooth'
) {
  if (!slides.length) return;


  const safeIndex = Math.max(
    0,
    Math.min(index, slides.length - 1)
  );


  slides[safeIndex].scrollIntoView({
    behavior,
    block: 'start'
  });
}


function getSlideIndexFromHash() {
  const match =
    window.location.hash.match(
      /^#slide-(\d+)$/
    );


  if (!match) return null;


  const index =
    Number(match[1]) - 1;


  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < slides.length
  )
    ? index
    : null;
}


/* =========================================================
   OPEN FULL PRESENTATION
   ========================================================= */

function openPresentation(
  index = 0,
  updateHistory = true
) {
  presentationIsOpen = true;


  executiveSummary.hidden = true;
  pitchShell.hidden = false;


  document.body.classList.add(
    'presentation-open'
  );


  const safeIndex = Math.max(
    0,
    Math.min(index, slides.length - 1)
  );


  slides[safeIndex]?.classList.add(
    'is-visible'
  );


  updatePresentationUI(safeIndex);


  requestAnimationFrame(() => {
    goToSlide(
      safeIndex,
      'auto'
    );
  });


  if (updateHistory) {
    history.pushState(
      {
        view: 'pitch',
        slide: safeIndex + 1
      },
      '',
      `#slide-${safeIndex + 1}`
    );
  }
}


/* =========================================================
   RETURN TO EXECUTIVE SUMMARY
   ========================================================= */

function showExecutiveSummary(
  updateHistory = true
) {
  presentationIsOpen = false;


  pitchShell.hidden = true;
  executiveSummary.hidden = false;


  document.body.classList.remove(
    'presentation-open'
  );


  window.scrollTo({
    top: 0,
    behavior: 'auto'
  });


  if (updateHistory) {
    history.pushState(
      {
        view: 'summary'
      },
      '',
      `${window.location.pathname}${window.location.search}`
    );
  }
}


/* =========================================================
   EXECUTIVE SUMMARY BUTTONS
   ========================================================= */

enterPitchButtons.forEach((button) => {
  button.addEventListener(
    'click',
    () => openPresentation(0)
  );
});


backToSummaryButtons.forEach((button) => {
  button.addEventListener(
    'click',
    (event) => {
      event.preventDefault();

      showExecutiveSummary();
    }
  );
});


/* =========================================================
   EXECUTIVE SUMMARY SCROLL REVEALS
   ========================================================= */

const summaryObserver =
  new IntersectionObserver(
    (entries) => {

      entries.forEach((entry) => {

        if (entry.isIntersecting) {

          entry.target.classList.add(
            'is-visible'
          );

          summaryObserver.unobserve(
            entry.target
          );
        }

      });

    },
    {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    }
  );


summaryRevealItems.forEach((item) => {
  summaryObserver.observe(item);
});


/* =========================================================
   PRESENTATION SLIDE OBSERVER
   ========================================================= */

const slideObserver =
  new IntersectionObserver(
    (entries) => {

      const visibleEntries =
        entries
          .filter(
            (entry) =>
              entry.isIntersecting
          )
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio
          );


      if (!visibleEntries.length) return;


      const visibleSlide =
        visibleEntries[0].target;


      const index =
        slides.indexOf(visibleSlide);


      visibleSlide.classList.add(
        'is-visible'
      );


      updatePresentationUI(index);


      if (
        presentationIsOpen &&
        window.location.hash !==
          `#slide-${index + 1}`
      ) {

        history.replaceState(
          {
            view: 'pitch',
            slide: index + 1
          },
          '',
          `#slide-${index + 1}`
        );

      }

    },
    {
      root: slidesContainer,
      threshold: [
        0.45,
        0.6,
        0.75
      ]
    }
  );


slides.forEach((slide) => {
  slideObserver.observe(slide);
});


/* =========================================================
   PRESENTATION DOT NAVIGATION
   ========================================================= */

navDots.forEach((dot, index) => {

  dot.addEventListener(
    'click',
    (event) => {

      event.preventDefault();

      goToSlide(index);

    }
  );

});


/* =========================================================
   KEYBOARD NAVIGATION
   ========================================================= */

function handleKeyNavigation(event) {

  const targetTag =
    event.target.tagName.toLowerCase();


  const isInteractive = [
    'input',
    'textarea',
    'select',
    'button',
    'a',
    'summary'
  ].includes(targetTag);


  if (isInteractive) return;


  /*
   * Escape returns from the full pitch
   * to the executive summary.
   */

  if (
    event.key === 'Escape' &&
    presentationIsOpen
  ) {

    event.preventDefault();

    showExecutiveSummary();

    return;
  }


  if (!presentationIsOpen) return;


  /*
   * Next slide
   */

  if (
    [
      'ArrowDown',
      'PageDown',
      ' '
    ].includes(event.key)
  ) {

    event.preventDefault();

    goToSlide(activeIndex + 1);
  }


  /*
   * Previous slide
   */

  if (
    [
      'ArrowUp',
      'PageUp'
    ].includes(event.key)
  ) {

    event.preventDefault();

    goToSlide(activeIndex - 1);
  }


  /*
   * First slide
   */

  if (event.key === 'Home') {

    event.preventDefault();

    goToSlide(0);
  }


  /*
   * Final slide
   */

  if (event.key === 'End') {

    event.preventDefault();

    goToSlide(
      slides.length - 1
    );
  }
}


document.addEventListener(
  'keydown',
  handleKeyNavigation
);


/* =========================================================
   DESKTOP WHEEL NAVIGATION
   ========================================================= */

slidesContainer?.addEventListener(
  'wheel',

  (event) => {

    if (!presentationIsOpen) return;


    if (
      window.matchMedia(
        '(max-width: 820px)'
      ).matches
    ) {
      return;
    }


    if (
      Math.abs(event.deltaY) < 24 ||
      scrollLock
    ) {
      return;
    }


    scrollLock = true;


    if (event.deltaY > 0) {

      goToSlide(
        activeIndex + 1
      );

    } else {

      goToSlide(
        activeIndex - 1
      );

    }


    window.setTimeout(() => {
      scrollLock = false;
    }, 650);

  },

  {
    passive: true
  }
);


/* =========================================================
   RESTART PRESENTATION
   ========================================================= */

restartButton?.addEventListener(
  'click',
  () => goToSlide(0)
);


/* =========================================================
   BROWSER BACK / FORWARD
   ========================================================= */

window.addEventListener(
  'popstate',
  () => {

    const hashIndex =
      getSlideIndexFromHash();


    if (hashIndex !== null) {

      openPresentation(
        hashIndex,
        false
      );

    } else {

      showExecutiveSummary(false);

    }

  }
);


/* =========================================================
   INITIAL PAGE LOAD
   ========================================================= */

window.addEventListener(
  'load',
  () => {

    const hashIndex =
      getSlideIndexFromHash();


    /*
     * Direct slide links continue working.
     *
     * Example:
     * yoursite.com/#slide-9
     */

    if (hashIndex !== null) {

      openPresentation(
        hashIndex,
        false
      );

    } else {

      showExecutiveSummary(false);

    }


    /*
     * Make sure the hero is immediately visible.
     */

    summaryRevealItems[0]
      ?.classList.add(
        'is-visible'
      );

  }
);
