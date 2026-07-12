const revealItems = [...document.querySelectorAll('.reveal')];
const sections = [...document.querySelectorAll('[data-brief-section]')];
const navLinks = [...document.querySelectorAll('.briefing-subnav a')];
const progressBar = document.getElementById('briefingProgress');
const printButtons = [...document.querySelectorAll('[data-print-briefing]')];
const passwordToggle = document.querySelector('[data-password-toggle]');
const passwordInput = document.getElementById('zeiterionPassword');

if (revealItems.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
  revealItems[0]?.classList.add('is-visible');
}

if (sections.length && navLinks.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const id = visible.target.id;
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      });
    },
    {
      threshold: [0.2, 0.4, 0.6],
      rootMargin: '-22% 0px -55% 0px'
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

function updateProgress() {
  if (!progressBar) return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const percentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

printButtons.forEach((button) => {
  button.addEventListener('click', () => window.print());
});

if (passwordToggle && passwordInput) {
  passwordToggle.addEventListener('click', () => {
    const shouldShow = passwordInput.type === 'password';
    passwordInput.type = shouldShow ? 'text' : 'password';
    passwordToggle.setAttribute('aria-pressed', String(shouldShow));
    passwordToggle.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
    passwordToggle.textContent = shouldShow ? '×' : '○';
    passwordInput.focus();
  });
}
