async function loadNavbar() {
    const container = document.getElementById("navbar-container");

    if (!container) return;

    const root = container.dataset.root || "";

    try {
        const response = await fetch(`${root}components/navbar.html`);

        if (!response.ok) {
            throw new Error(`Navbar failed to load: ${response.status}`);
        }

        container.innerHTML = await response.text();

        container.querySelectorAll("[data-href]").forEach(link => {
            link.href = `${root}${link.dataset.href}`;
        });

        container.querySelectorAll("[data-src]").forEach(img => {
            img.src = `${root}${img.dataset.src}`;
        });

        const toggle = document.getElementById("navbar-toggle");
        const links = document.getElementById("nav-links");

        if (toggle && links) {
            toggle.addEventListener("click", () => {
                links.classList.toggle("nav-links-open");
            });
        }
    } catch (error) {
        console.error("Error loading navbar:", error);
    }
}

loadNavbar();