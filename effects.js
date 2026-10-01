/* =========================================================
   AAKASH EARTH
   LIGHTWEIGHT PREMIUM EFFECTS
   No 3D Cursor
   No Mouse Tracking
   No Heavy Particles
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const isMobile =
    window.matchMedia(
      "(max-width: 768px)"
    ).matches;


  /* =========================================
     1. SCROLL REVEAL
  ========================================= */

  const revealItems =
    document.querySelectorAll(
      [
        "section",
        ".card",
        ".service-card",
        ".member-card",
        ".volunteer-card",
        ".festival-card",
        ".sports-card",
        ".gallery-card",
        ".ranking-row",
        ".podium-card",
        ".stat-card"
      ].join(",")
    );


  revealItems.forEach((element, index) => {

    element.classList.add(
      "ae-reveal"
    );

    /*
      Small stagger only.
      Large delays can make site feel slow.
    */

    element.style.setProperty(
      "--ae-delay",
      `${Math.min(index % 4, 3) * 60}ms`
    );

  });


  if (reduceMotion) {

    revealItems.forEach(
      element =>
        element.classList.add(
          "ae-visible"
        )
    );

  } else {

    const observer =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              "ae-visible"
            );

            observer.unobserve(
              entry.target
            );

          });

        },
        {
          threshold: 0.08,
          rootMargin:
            "0px 0px -35px 0px"
        }
      );


    revealItems.forEach(
      element =>
        observer.observe(element)
    );

  }


  /* =========================================
     2. HEADER SCROLL EFFECT
  ========================================= */

  const header =
    document.querySelector(
      "#mainHeader, .site-header, .task-header"
    );


  let ticking = false;


  function updateHeader() {

    if (!header) {
      return;
    }

    header.classList.toggle(
      "ae-header-scrolled",
      window.scrollY > 25
    );

    ticking = false;

  }


  window.addEventListener(
    "scroll",
    () => {

      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(
        updateHeader
      );

    },
    {
      passive: true
    }
  );


  updateHeader();


  /* =========================================
     3. IMAGE FADE-IN
  ========================================= */

  function prepareImage(image) {

    if (
      image.dataset.aeEffectReady === "1"
    ) {
      return;
    }

    image.dataset.aeEffectReady = "1";

    image.classList.add(
      "ae-image"
    );


    if (image.complete) {

      image.classList.add(
        "ae-image-loaded"
      );

      return;

    }


    image.addEventListener(
      "load",
      () => {

        image.classList.add(
          "ae-image-loaded"
        );

      },
      {
        once: true
      }
    );


    image.addEventListener(
      "error",
      () => {

        image.classList.add(
          "ae-image-loaded"
        );

      },
      {
        once: true
      }
    );

  }


  document
    .querySelectorAll("img")
    .forEach(prepareImage);


  /*
    Firebase dynamically creates cards/images,
    so watch only for newly-added elements.
  */

  const imageObserver =
    new MutationObserver(
      mutations => {

        mutations.forEach(mutation => {

          mutation.addedNodes.forEach(node => {

            if (
              !(node instanceof HTMLElement)
            ) {
              return;
            }


            if (
              node.tagName === "IMG"
            ) {

              prepareImage(node);

            }


            node
              .querySelectorAll?.("img")
              .forEach(prepareImage);

          });

        });

      }
    );


  imageObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );


  /* =========================================
     4. BUTTON GOLD SHINE
  ========================================= */

  const buttons =
    document.querySelectorAll(
      [
        ".primary-btn",
        ".submit-btn",
        ".portal-btn",
        ".login-btn",
        ".sports-register-btn",
        ".hero-primary",
        ".btn-primary"
      ].join(",")
    );


  buttons.forEach(button => {

    button.classList.add(
      "ae-gold-button"
    );

  });


  /* =========================================
     5. PREMIUM CARD HOVER
     Desktop only
  ========================================= */

  if (
    !isMobile &&
    !reduceMotion
  ) {

    const cards =
      document.querySelectorAll(
        [
          ".card",
          ".service-card",
          ".member-card",
          ".volunteer-card",
          ".festival-card",
          ".sports-card",
          ".gallery-card",
          ".ranking-row",
          ".podium-card",
          ".stat-card"
        ].join(",")
      );


    cards.forEach(card => {

      card.classList.add(
        "ae-hover-card"
      );

    });

  }


  /* =========================================
     6. SMOOTH INTERNAL LINKS
  ========================================= */

  document.addEventListener(
    "click",
    event => {

      const link =
        event.target.closest(
          'a[href^="#"]'
        );


      if (!link) {
        return;
      }


      const href =
        link.getAttribute(
          "href"
        );


      if (
        !href ||
        href === "#"
      ) {
        return;
      }


      const target =
        document.querySelector(
          href
        );


      if (!target) {
        return;
      }


      event.preventDefault();


      target.scrollIntoView({
        behavior:
          reduceMotion
            ? "auto"
            : "smooth",

        block:
          "start"
      });

    }
  );


  /* =========================================
     7. BACK TO TOP
  ========================================= */

  const backToTop =
    document.getElementById(
      "backToTop"
    );


  if (backToTop) {

    let backTicking = false;


    const updateBackButton =
      () => {

        backToTop.classList.toggle(
          "ae-back-visible",
          window.scrollY > 450
        );

        backTicking = false;

      };


    window.addEventListener(
      "scroll",
      () => {

        if (backTicking) {
          return;
        }

        backTicking = true;

        requestAnimationFrame(
          updateBackButton
        );

      },
      {
        passive: true
      }
    );


    backToTop.addEventListener(
      "click",
      () => {

        window.scrollTo({
          top: 0,

          behavior:
            reduceMotion
              ? "auto"
              : "smooth"
        });

      }
    );


    updateBackButton();

  }


  /* =========================================
     8. HERO DECORATION
     Light effect only
  ========================================= */

  const heroDecorations =
    document.querySelectorAll(
      [
        ".hero-ring",
        ".hero-circle",
        ".decorative-circle",
        ".community-ring"
      ].join(",")
    );


  if (
    !reduceMotion &&
    !isMobile
  ) {

    heroDecorations.forEach(
      (element, index) => {

        element.classList.add(
          "ae-float"
        );

        element.style.setProperty(
          "--ae-float-delay",
          `${index * -1.3}s`
        );

      }
    );

  }


  /* =========================================
     9. FINAL SAFETY
     Never keep content hidden.
  ========================================= */

  setTimeout(
    () => {

      document
        .querySelectorAll(
          ".ae-reveal"
        )
        .forEach(
          element =>
            element.classList.add(
              "ae-visible"
            )
        );

    },
    1800
  );

});


/* =========================================================
   EFFECT CSS
   Inject once.
========================================================= */

const effectStyle =
  document.createElement("style");


effectStyle.textContent = `

/* ================================
   SCROLL REVEAL
================================ */

.ae-reveal {
  opacity: 0;
  transform: translateY(20px);

  transition:
    opacity .55s ease var(--ae-delay, 0ms),
    transform .55s ease var(--ae-delay, 0ms);
}

.ae-reveal.ae-visible {
  opacity: 1;
  transform: translateY(0);
}


/* ================================
   HEADER
================================ */

.ae-header-scrolled {
  box-shadow:
    0 10px 30px rgba(0,0,0,.16) !important;

  border-bottom-color:
    rgba(214,165,54,.38) !important;
}


/* ================================
   IMAGE
================================ */

.ae-image {
  opacity: 0;

  transition:
    opacity .4s ease;
}

.ae-image.ae-image-loaded {
  opacity: 1;
}


/* ================================
   CARD HOVER
================================ */

.ae-hover-card {
  transition:
    transform .22s ease,
    box-shadow .22s ease,
    border-color .22s ease !important;
}

.ae-hover-card:hover {
  transform:
    translateY(-5px);

  border-color:
    rgba(214,165,54,.55) !important;

  box-shadow:
    0 15px 32px rgba(7,28,42,.10) !important;
}


/* ================================
   GOLD BUTTON SHINE
================================ */

.ae-gold-button {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.ae-gold-button::after {
  content: "";

  position: absolute;

  top: -40%;
  left: -70%;

  width: 35%;
  height: 180%;

  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.55),
      transparent
    );

  transform:
    rotate(20deg);

  transition:
    left .55s ease;

  pointer-events: none;
}

.ae-gold-button:hover::after {
  left: 130%;
}


/* ================================
   BACK TO TOP
================================ */

#backToTop {
  opacity: 0;
  visibility: hidden;

  transform:
    translateY(10px);

  transition:
    opacity .2s ease,
    transform .2s ease,
    visibility .2s ease;
}

#backToTop.ae-back-visible {
  opacity: 1;
  visibility: visible;

  transform:
    translateY(0);
}


/* ================================
   HERO FLOAT
================================ */

.ae-float {
  animation:
    aeFloat 7s ease-in-out
    var(--ae-float-delay, 0s)
    infinite;
}

@keyframes aeFloat {

  0%,
  100% {
    transform:
      translateY(0);
  }

  50% {
    transform:
      translateY(-8px);
  }

}


/* ================================
   ACCESSIBILITY / PERFORMANCE
================================ */

@media (max-width: 768px) {

  .ae-hover-card:hover {
    transform: none;
  }

  .ae-gold-button::after {
    display: none;
  }

}


@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
  }

  .ae-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  .ae-image {
    opacity: 1 !important;
    transition: none !important;
  }

  .ae-float {
    animation: none !important;
  }

  .ae-hover-card {
    transition: none !important;
  }

  .ae-gold-button::after {
    display: none !important;
  }

}

`;


document.head.appendChild(
  effectStyle
);