// Entrance and scroll-reveal animations. Elements are only hidden from JS, so if GSAP
// fails to load or the visitor prefers reduced motion, everything simply stays visible.
(function () {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.from('.hero-content > *', {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        delay: 0.15
    });
    gsap.from('.scroll-cue', { opacity: 0, duration: 1, delay: 1.2 });

    const reveals = gsap.utils.toArray('[data-reveal]');
    gsap.set(reveals, { y: 36, opacity: 0 });

    ScrollTrigger.batch(reveals, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.12,
            overwrite: true
        })
    });
})();
