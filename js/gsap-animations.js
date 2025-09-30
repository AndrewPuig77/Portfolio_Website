// GSAP Animations for Portfolio
console.log('🚀 Initializing GSAP Animations...');

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize all animations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initAnimations();
});

function initAnimations() {
    console.log('✨ Starting amazing animations...');
    
    // Hero section entrance animations
    initHeroAnimations();
    
    // Scroll-triggered animations
    initScrollAnimations();
    
    // Interactive hover effects
    initHoverEffects();
    
    // Continuous background animations
    initBackgroundAnimations();
    
    console.log('🎉 All animations initialized!');
}

function initHeroAnimations() {
    // Animate hero content on load
    const tl = gsap.timeline();
    
    // Hide elements initially
    gsap.set(['.hero-content h1', '.hero-content .subtitle', '.hero-content p', '.cta-button'], {
        opacity: 0,
        y: 50
    });
    
    gsap.set('.floating-shapes .shape', {
        scale: 0,
        rotation: 0
    });
    
    gsap.set('.particle', {
        opacity: 0
    });
    
    // Animate in sequence
    tl.to('.hero-content h1', {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out'
    })
    .to('.hero-content .subtitle', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out'
    }, '-=0.5')
    .to('.hero-content p', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out'
    }, '-=0.4')
    .to('.cta-button', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'back.out(1.7)'
    }, '-=0.3')
    .to('.floating-shapes .shape', {
        scale: 1,
        rotation: 360,
        duration: 1.5,
        ease: 'power2.out',
        stagger: 0.2
    }, '-=1')
    .to('.particle', {
        opacity: 1,
        duration: 0.5,
        stagger: 0.1
    }, '-=1');
}

function initScrollAnimations() {
    // Fade in sections as they come into view
    gsap.utils.toArray('section:not(#hero)').forEach(section => {
        gsap.fromTo(section, 
            {
                opacity: 0,
                y: 100
            },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    end: 'bottom 20%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });
    
    // Animate skill tags
    gsap.utils.toArray('.skill-tag').forEach(tag => {
        gsap.fromTo(tag,
            {
                scale: 0,
                rotation: -180
            },
            {
                scale: 1,
                rotation: 0,
                duration: 0.6,
                ease: 'back.out(1.7)',
                scrollTrigger: {
                    trigger: tag,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse'
                },
                stagger: 0.1
            }
        );
    });
    
    // Animate project cards
    gsap.utils.toArray('.project-card').forEach(card => {
        gsap.fromTo(card,
            {
                opacity: 0,
                scale: 0.8,
                rotationY: -45
            },
            {
                opacity: 1,
                scale: 1,
                rotationY: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });
    
    // Parallax effect for floating shapes
    gsap.utils.toArray('.shape').forEach(shape => {
        gsap.to(shape, {
            y: -100,
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    });
}

function initHoverEffects() {
    // Navigation links hover
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('mouseenter', () => {
            gsap.to(link, {
                scale: 1.1,
                color: '#00ffff',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
        
        link.addEventListener('mouseleave', () => {
            gsap.to(link, {
                scale: 1,
                color: '#ffffff',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });
    
    // Project cards hover
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                scale: 1.05,
                rotationY: 5,
                z: 50,
                duration: 0.4,
                ease: 'power2.out'
            });
            
            // Animate project links
            gsap.to(card.querySelectorAll('.project-link'), {
                scale: 1.1,
                duration: 0.3,
                stagger: 0.05,
                ease: 'back.out(1.7)'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                scale: 1,
                rotationY: 0,
                z: 0,
                duration: 0.4,
                ease: 'power2.out'
            });
            
            gsap.to(card.querySelectorAll('.project-link'), {
                scale: 1,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });
    
    // Skill tags hover
    document.querySelectorAll('.skill-tag').forEach(tag => {
        tag.addEventListener('mouseenter', () => {
            gsap.to(tag, {
                scale: 1.2,
                rotation: 5,
                duration: 0.3,
                ease: 'back.out(1.7)'
            });
        });
        
        tag.addEventListener('mouseleave', () => {
            gsap.to(tag, {
                scale: 1,
                rotation: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });
    
    // CTA Button hover
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('mouseenter', () => {
            gsap.to(ctaButton, {
                scale: 1.1,
                boxShadow: '0 0 40px #ff00ff, 0 0 60px #ff00ff',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
        
        ctaButton.addEventListener('mouseleave', () => {
            gsap.to(ctaButton, {
                scale: 1,
                boxShadow: '0 0 20px #ff00ff, inset 0 0 20px rgba(255,0,128,0.1)',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    }
}

function initBackgroundAnimations() {
    console.log('🎨 Initializing background animations...');
    
    // Check if background elements exist
    const bgShapes = document.querySelectorAll('.bg-shape');
    const bgParticles = document.querySelectorAll('.bg-particle');
    const bgLines = document.querySelectorAll('.bg-line');
    
    console.log('Background shapes found:', bgShapes.length);
    console.log('Background particles found:', bgParticles.length);
    console.log('Background lines found:', bgLines.length);
    
    // Global background animations
    gsap.utils.toArray('.bg-shape').forEach((shape, index) => {
        // Make sure they're visible
        gsap.set(shape, { opacity: 0.8, visibility: 'visible' });
        
        gsap.to(shape, {
            rotation: 360,
            duration: 15 + index * 2,
            ease: 'none',
            repeat: -1
        });
        
        // Add floating motion
        gsap.to(shape, {
            y: '+=20',
            duration: 4 + index * 0.5,
            ease: 'power2.inOut',
            yoyo: true,
            repeat: -1
        });
    });
    
    // Background grid animation
    gsap.to('.bg-grid', {
        rotation: 1,
        duration: 60,
        ease: 'none',
        repeat: -1
    });
    
    // Background particles enhanced animation
    gsap.utils.toArray('.bg-particle').forEach((particle, index) => {
        gsap.to(particle, {
            y: -window.innerHeight - 50,
            x: `+=${Math.random() * 100 - 50}`,
            rotation: 360,
            duration: 10 + Math.random() * 5,
            ease: 'none',
            repeat: -1,
            delay: index * 0.8
        });
    });
    
    // Local floating shapes (hero section)
    gsap.utils.toArray('.shape').forEach((shape, index) => {
        gsap.to(shape, {
            rotation: 360,
            duration: 10 + index * 2,
            ease: 'none',
            repeat: -1
        });
    });
    
    // Grid pulsing animation
    gsap.to('.grid-overlay', {
        opacity: 0.8,
        duration: 2,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1
    });
    
    // Particles floating up (hero section)
    gsap.utils.toArray('.particle').forEach((particle, index) => {
        gsap.to(particle, {
            y: -window.innerHeight - 100,
            duration: 8 + Math.random() * 4,
            ease: 'none',
            repeat: -1,
            delay: index * 0.8
        });
    });
    
    // Enhanced mouse movement parallax for global background
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        
        // Global background parallax
        gsap.to('.bg-shapes', {
            x: mouseX * 30,
            y: mouseY * 30,
            duration: 1.5,
            ease: 'power2.out'
        });
        
        gsap.to('.bg-particles', {
            x: mouseX * 15,
            y: mouseY * 15,
            duration: 2,
            ease: 'power2.out'
        });
        
        gsap.to('.bg-lines', {
            x: mouseX * 10,
            y: mouseY * 10,
            duration: 2.5,
            ease: 'power2.out'
        });
        
        // Local hero parallax
        gsap.to('.floating-shapes', {
            x: mouseX * 20,
            y: mouseY * 20,
            duration: 1,
            ease: 'power2.out'
        });
        
        gsap.to('.particles', {
            x: mouseX * 10,
            y: mouseY * 10,
            duration: 1.5,
            ease: 'power2.out'
        });
    });
}

// Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            gsap.to(window, {
                duration: 1.5,
                scrollTo: target,
                ease: 'power3.inOut'
            });
        }
    });
});

// Add loading animation
window.addEventListener('load', () => {
    gsap.from('body', {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out'
    });
});