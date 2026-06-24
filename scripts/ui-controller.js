/**
 * UI Controller for LMS CNDPR
 * Handles App Shell interactions like mobile menu toggle and accessibility.
 */

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('lms-sidebar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-button');

    // Exit if essential elements are missing
    if (!sidebar || !mobileMenuBtn) return;

    /**
     * Toggles the sidebar visibility on mobile
     * @param {boolean} force - Force a specific state
     */
    const toggleSidebar = (force) => {
        const isOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');
        
        sidebar.classList.toggle('is-open', isOpen);
        mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    };

    // Toggle on button click
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
            toggleSidebar(false);
            mobileMenuBtn.focus();
        }
    });

    // Close when clicking outside the sidebar
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('is-open') && 
            !sidebar.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            toggleSidebar(false);
        }
    });

    // Close when clicking a nav-link (mobile UX)
    sidebar.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) { // Typical desktop breakpoint
                toggleSidebar(false);
            }
        });
    });
});
