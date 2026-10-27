const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Solidify the nav background once the page is scrolled
const nav = document.querySelector('.site-nav');
function updateNavBackground() {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', updateNavBackground, { passive: true });
updateNavBackground();

// Mobile menu
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('nav-links');

function setMenuOpen(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navLinks.classList.toggle('is-open', open);
}

navToggle.addEventListener('click', () => {
    setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
});
navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false);
});
document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) setMenuOpen(false);
});

// Highlight the nav link for the section currently in view
const linkFor = new Map(
    [...navLinks.querySelectorAll('a[href^="#"]')].map((link) => [link.getAttribute('href').slice(1), link])
);
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        linkFor.forEach((link) => link.classList.remove('is-active'));
        linkFor.get(entry.target.id)?.classList.add('is-active');
    });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((section) => sectionObserver.observe(section));

// Type out the hero subtitle
const typed = document.querySelector('.typed');
if (typed && !prefersReducedMotion) {
    const text = typed.textContent;
    typed.textContent = '';
    let i = 0;
    setTimeout(function typeNext() {
        typed.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(typeNext, 55 + Math.random() * 45);
    }, 600);
}

// Copy email to clipboard
const toast = document.querySelector('.toast');
let toastTimer;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

document.querySelectorAll('.copy-email').forEach((button) => {
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(button.dataset.email);
            showToast('Email copied to clipboard');
        } catch {
            showToast(button.dataset.email);
        }
    });
});

document.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
});

document.getElementById('year').textContent = new Date().getFullYear();
