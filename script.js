// Active nav highlight on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(a => {
                a.style.color = a.getAttribute('href') === `#${id}` ? '#fff' : '';
            });
        }
    });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => observer.observe(s));

// Reveal on scroll
const reveal = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            reveal.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.feature, .price-card, .testi, .stats-grid > div').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity .6s ease ${i * 0.05}s, transform .6s cubic-bezier(.2,.8,.2,1) ${i * 0.05}s`;
    reveal.observe(el);
});

// Mobile menu toggle
const burger = document.querySelector('.burger');
const navLinksContainer = document.querySelector('.nav-links');
if (burger && navLinksContainer) {
    burger.addEventListener('click', () => {
        const isOpen = navLinksContainer.classList.toggle('open');
        if (isOpen) {
            Object.assign(navLinksContainer.style, {
                display: 'flex',
                position: 'absolute',
                top: '72px',
                left: '0',
                right: '0',
                flexDirection: 'column',
                background: 'rgba(7,7,13,.96)',
                padding: '20px',
                borderBottom: '1px solid rgba(255,255,255,.1)',
                backdropFilter: 'blur(20px)'
            });
        } else {
            navLinksContainer.removeAttribute('style');
        }
    });
}

// Demo form
function submitDemo(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input').value;
    form.innerHTML = `<div style="text-align:center;color:#10b981;font-weight:600;font-size:16px;padding:14px 0">✓ Merci ! Nous vous contactons à <strong>${email}</strong> sous 24h.</div>`;
    return false;
}
window.submitDemo = submitDemo;

// Animate stat numbers
const animateNum = (el) => {
    const text = el.textContent.trim();
    const match = text.match(/([\d\s]+)/);
    if (!match) return;
    const target = parseInt(match[0].replace(/\s/g, ''), 10);
    if (isNaN(target) || target < 10) return;
    const suffix = text.substring(text.indexOf(match[0]) + match[0].length);
    const prefix = text.substring(0, text.indexOf(match[0]));
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const current = Math.floor(target * eased);
        el.textContent = prefix + current.toLocaleString('fr-FR') + suffix;
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};
const numObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateNum(entry.target);
            numObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('.kpi-value, .stat-value').forEach(el => numObs.observe(el));

// Parallax effect on dashboard
const dashboard = document.querySelector('.dashboard');
if (dashboard && window.matchMedia('(min-width: 1025px)').matches) {
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 6;
        const y = (e.clientY / window.innerHeight - 0.5) * 4;
        dashboard.style.transform = `perspective(1400px) rotateY(${-8 + x}deg) rotateX(${4 - y}deg)`;
    });
}
