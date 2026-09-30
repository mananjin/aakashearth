/* =========================================================
   AAKASH EARTH
   PUBLIC WEBSITE - MAIN JAVASCRIPT
   firebase.js KO TOUCH NAHI KARNA
========================================================= */

import {
  db,
  ref,
  onValue
} from "./firebase.js";


/* =========================================================
   BASIC HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImage(url = "") {
  const value = String(url || "").trim();

  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("data:image/")
  ) {
    return value;
  }

  return "";
}

function formatDate(value) {
  if (!value) return "";

  let date;

  if (typeof value === "number") {
    date = new Date(value);
  } else {
    date = new Date(String(value));
  }

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function objectToArray(data) {
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.entries(data).map(([key, value]) => ({
    key,
    ...(value || {})
  }));
}

function normalizeStatus(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeYear(value = "") {
  return String(value || "").trim();
}


/* =========================================================
   PAGE LOADER
========================================================= */

const pageLoader = $("#pageLoader");

window.addEventListener("load", () => {
  setTimeout(() => {
    pageLoader?.classList.add("hidden");
  }, 450);
});

// Safety: loader kabhi stuck na rahe.
setTimeout(() => {
  pageLoader?.classList.add("hidden");
}, 2500);


/* =========================================================
   CURRENT YEAR
========================================================= */

const currentYear = $("#currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}


/* =========================================================
   MOBILE MENU
========================================================= */

const mobileMenuBtn = $("#mobileMenuBtn");
const mobileNav = $("#mobileNav");

mobileMenuBtn?.addEventListener("click", () => {
  const isOpen = mobileNav?.classList.toggle("open");

  document.body.classList.toggle(
    "menu-open",
    Boolean(isOpen)
  );
});

$$(".mobile-nav-link, .mobile-nav-special").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav?.classList.remove("open");
    document.body.classList.remove("menu-open");
  });
});


/* =========================================================
   ACTIVE NAVIGATION ON SCROLL
========================================================= */

const navLinks = $$(".desktop-nav .nav-link");

const sectionIds = [
  "home",
  "members",
  "festivals",
  "volunteers",
  "committee",
  "sports",
  "updates",
  "gallery"
];

const sections = sectionIds
  .map((id) => document.getElementById(id))
  .filter(Boolean);

function updateActiveNav() {
  const scrollPosition = window.scrollY + 160;

  let currentSection = "home";

  sections.forEach((section) => {
    if (scrollPosition >= section.offsetTop) {
      currentSection = section.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    link.classList.toggle(
      "active",
      href === `#${currentSection}`
    );
  });
}

window.addEventListener("scroll", updateActiveNav, {
  passive: true
});

updateActiveNav();


/* =========================================================
   HERO SLIDER
========================================================= */

const heroSlides = $$(".hero-slide");
const heroDots = $$(".hero-dot");
const heroPrev = $("#heroPrev");
const heroNext = $("#heroNext");

let heroIndex = 0;
let heroTimer = null;

function showHeroSlide(index) {
  if (!heroSlides.length) return;

  if (index < 0) {
    index = heroSlides.length - 1;
  }

  if (index >= heroSlides.length) {
    index = 0;
  }

  heroIndex = index;

  heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle(
      "active",
      slideIndex === heroIndex
    );
  });

  heroDots.forEach((dot, dotIndex) => {
    dot.classList.toggle(
      "active",
      dotIndex === heroIndex
    );
  });
}

function nextHeroSlide() {
  showHeroSlide(heroIndex + 1);
}

function previousHeroSlide() {
  showHeroSlide(heroIndex - 1);
}

function startHeroSlider() {
  stopHeroSlider();

  heroTimer = setInterval(() => {
    nextHeroSlide();
  }, 6000);
}

function stopHeroSlider() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

heroNext?.addEventListener("click", () => {
  nextHeroSlide();
  startHeroSlider();
});

heroPrev?.addEventListener("click", () => {
  previousHeroSlide();
  startHeroSlider();
});

heroDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    const index = Number(dot.dataset.heroSlide);

    if (Number.isFinite(index)) {
      showHeroSlide(index);
      startHeroSlider();
    }
  });
});

const heroSection = $("#home");

heroSection?.addEventListener("mouseenter", stopHeroSlider);
heroSection?.addEventListener("mouseleave", startHeroSlider);

showHeroSlide(0);
startHeroSlider();


/* =========================================================
   BACK TO TOP
========================================================= */

const backToTop = $("#backToTop");

window.addEventListener(
  "scroll",
  () => {
    backToTop?.classList.toggle(
      "show",
      window.scrollY > 500
    );
  },
  { passive: true }
);

backToTop?.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});


/* =========================================================
   DATABASE STATE
========================================================= */

let allMembers = [];
let allVolunteers = [];
let allFestivals = [];
let allCommittee = [];
let allSports = [];
let allUpdates = [];
let allGallery = [];

let selectedMemberYear = "all";
let selectedVolunteerYear = "all";


/* =========================================================
   MEMBERS
========================================================= */

const memberGrid = $("#memberGrid");
const memberCount = $("#memberCount");
const publicMemberCount = $("#publicMemberCount");
const memberYearSelect = $("#memberYearSelect");

function getPublicMembers() {
  return allMembers
    .filter((member) => {
      return normalizeStatus(member.status) === "active";
    })
    .filter((member) => {
      if (selectedMemberYear === "all") {
        return true;
      }

      return normalizeYear(member.year) === selectedMemberYear;
    })
    .sort((a, b) => {
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;

      if (yearA !== yearB) {
        return yearB - yearA;
      }

      return String(a.name || "")
        .localeCompare(String(b.name || ""));
    });
}

function createMemberCard(member) {
  const name = escapeHTML(member.name || "Member");
  const position = escapeHTML(
    member.position || "Member"
  );

  const year = escapeHTML(member.year || "");
  const memberId = escapeHTML(member.memberId || "");
  const photo = safeImage(member.photoURL);

  const verificationURL = member.memberId
    ? `verify.html?id=${encodeURIComponent(member.memberId)}`
    : "#";

  return `
    <a
      class="member-card"
      href="${verificationURL}"
      ${member.memberId ? "" : 'onclick="return false;"'}
      aria-label="View ${name}"
    >
      <div class="member-card-photo">
        ${
          photo
            ? `
              <img
                src="${photo}"
                alt="${name}"
                loading="lazy"
                onerror="
                  this.style.display='none';
                  this.nextElementSibling.style.display='grid';
                "
              >
              <div
                class="member-photo-fallback"
                style="display:none;"
              >
                👤
              </div>
            `
            : `
              <div class="member-photo-fallback">
                👤
              </div>
            `
        }
      </div>

      <div class="member-card-content">
        <strong>${name}</strong>

        <span>${position}</span>

        <small>
          ${year ? `Year ${year}` : ""}
          ${
            year && memberId
              ? " • "
              : ""
          }
          ${memberId}
        </small>
      </div>
    </a>
  `;
}

function renderMembers() {
  const members = getPublicMembers();

  if (publicMemberCount) {
    publicMemberCount.textContent = members.length;
  }

  if (!memberGrid) return;

  if (!members.length) {
    memberGrid.innerHTML = `
      <div class="slider-empty">
        No members available for this year.
      </div>
    `;

    stopMemberAutoSlide();
    return;
  }

  memberGrid.innerHTML = members
    .map(createMemberCard)
    .join("");

  resetMemberSlider();
  startMemberAutoSlide();
}

memberYearSelect?.addEventListener("change", () => {
  selectedMemberYear =
    memberYearSelect.value || "all";

  renderMembers();
});

onValue(
  ref(db, "members"),

  (snapshot) => {
    allMembers = objectToArray(snapshot.val());

    const activeMembers = allMembers.filter(
      (member) =>
        normalizeStatus(member.status) === "active"
    );

    if (memberCount) {
      memberCount.textContent = activeMembers.length;
    }

    renderMembers();
  },

  (error) => {
    console.error("Members load error:", error);

    if (memberGrid) {
      memberGrid.innerHTML = `
        <div class="slider-empty">
          Unable to load members.
        </div>
      `;
    }
  }
);


/* =========================================================
   FLOATING MEMBER AUTO SLIDER
========================================================= */

const memberSlider = $("#memberSlider");
const memberPrev = $("#memberPrev");
const memberNext = $("#memberNext");

let memberAutoTimer = null;
let memberScrollPosition = 0;

function getMemberStep() {
  const firstCard =
    memberGrid?.querySelector(".member-card");

  if (!firstCard) {
    return 265;
  }

  return firstCard.getBoundingClientRect().width + 20;
}

function resetMemberSlider() {
  memberScrollPosition = 0;

  if (memberGrid) {
    memberGrid.style.transform = "translateX(0px)";
  }

  if (memberSlider) {
    memberSlider.scrollLeft = 0;
  }
}

function moveMemberSlider(direction = 1) {
  if (!memberGrid || !memberSlider) return;

  // Mobile uses natural swipe/scroll.
  if (window.innerWidth <= 600) {
    memberSlider.scrollBy({
      left: getMemberStep() * direction,
      behavior: "smooth"
    });

    return;
  }

  const cards =
    memberGrid.querySelectorAll(".member-card");

  if (!cards.length) return;

  const step = getMemberStep();

  const totalWidth =
    memberGrid.scrollWidth;

  const visibleWidth =
    memberSlider.clientWidth;

  const maxScroll =
    Math.max(0, totalWidth - visibleWidth);

  memberScrollPosition += step * direction;

  if (memberScrollPosition > maxScroll) {
    memberScrollPosition = 0;
  }

  if (memberScrollPosition < 0) {
    memberScrollPosition = maxScroll;
  }

  memberGrid.style.transform =
    `translateX(-${memberScrollPosition}px)`;
}

function startMemberAutoSlide() {
  stopMemberAutoSlide();

  const cardCount =
    memberGrid?.querySelectorAll(".member-card").length || 0;

  if (cardCount <= 1) {
    return;
  }

  memberAutoTimer = setInterval(() => {
    moveMemberSlider(1);
  }, 2800);
}

function stopMemberAutoSlide() {
  if (memberAutoTimer) {
    clearInterval(memberAutoTimer);
    memberAutoTimer = null;
  }
}

memberNext?.addEventListener("click", () => {
  moveMemberSlider(1);
  startMemberAutoSlide();
});

memberPrev?.addEventListener("click", () => {
  moveMemberSlider(-1);
  startMemberAutoSlide();
});

memberSlider?.addEventListener(
  "mouseenter",
  stopMemberAutoSlide
);

memberSlider?.addEventListener(
  "mouseleave",
  startMemberAutoSlide
);

memberSlider?.addEventListener(
  "touchstart",
  stopMemberAutoSlide,
  { passive: true }
);

memberSlider?.addEventListener(
  "touchend",
  () => {
    setTimeout(startMemberAutoSlide, 1800);
  },
  { passive: true }
);


/* =========================================================
   VOLUNTEERS
========================================================= */

const volunteerGrid = $("#volunteerGrid");
const volunteerCount = $("#volunteerCount");
const publicVolunteerCount =
  $("#publicVolunteerCount");

const volunteerYearSelect =
  $("#volunteerYearSelect");

function getPublicVolunteers() {
  return allVolunteers
    .filter((volunteer) => {
      return normalizeStatus(volunteer.status) === "approved";
    })
    .filter((volunteer) => {
      if (selectedVolunteerYear === "all") {
        return true;
      }

      return normalizeYear(volunteer.year) ===
        selectedVolunteerYear;
    })
    .sort((a, b) => {
      const rankA = Number(a.rank) || 999999;
      const rankB = Number(b.rank) || 999999;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return String(a.name || "")
        .localeCompare(String(b.name || ""));
    });
}

function createVolunteerCard(volunteer) {
  const name = escapeHTML(
    volunteer.name || "Volunteer"
  );

  const volunteerId = escapeHTML(
    volunteer.volunteerId || ""
  );

  const year = escapeHTML(
    volunteer.year || ""
  );

  const photo = safeImage(
    volunteer.photoURL
  );

  const points =
    Number(volunteer.points) || 0;

  const verificationURL =
    volunteer.volunteerId
      ? `verify.html?id=${encodeURIComponent(
          volunteer.volunteerId
        )}`
      : "#";

  return `
    <a
      class="volunteer-card"
      href="${verificationURL}"
      ${volunteer.volunteerId ? "" : 'onclick="return false;"'}
    >
      <div class="volunteer-photo">

        ${
          photo
            ? `
              <img
                src="${photo}"
                alt="${name}"
                loading="lazy"
              >
            `
            : `
              <div class="member-photo-fallback">
                🤝
              </div>
            `
        }

      </div>

      <div class="volunteer-info">

        <strong>${name}</strong>

        <span>
          Approved Volunteer
        </span>

        <small>
          ${year ? `Year ${year}` : ""}
          ${
            year && volunteerId
              ? " • "
              : ""
          }
          ${volunteerId}
        </small>

        ${
          points > 0
            ? `
              <small>
                ⭐ ${points} Points
              </small>
            `
            : ""
        }

      </div>
    </a>
  `;
}

function renderVolunteers() {
  const volunteers = getPublicVolunteers();

  if (publicVolunteerCount) {
    publicVolunteerCount.textContent =
      volunteers.length;
  }

  if (!volunteerGrid) return;

  if (!volunteers.length) {
    volunteerGrid.innerHTML = `
      <div class="slider-empty">
        No approved volunteers available.
      </div>
    `;

    return;
  }

  volunteerGrid.innerHTML =
    volunteers
      .map(createVolunteerCard)
      .join("");
}

volunteerYearSelect?.addEventListener(
  "change",
  () => {
    selectedVolunteerYear =
      volunteerYearSelect.value || "all";

    renderVolunteers();
  }
);

onValue(
  ref(db, "volunteers"),

  (snapshot) => {
    allVolunteers =
      objectToArray(snapshot.val());

    const approved =
      allVolunteers.filter(
        (volunteer) =>
          normalizeStatus(volunteer.status) ===
          "approved"
      );

    if (volunteerCount) {
      volunteerCount.textContent =
        approved.length;
    }

    renderVolunteers();
  },

  (error) => {
    console.error(
      "Volunteers load error:",
      error
    );

    if (volunteerGrid) {
      volunteerGrid.innerHTML = `
        <div class="slider-empty">
          Unable to load volunteers.
        </div>
      `;
    }
  }
);


/* =========================================================
   GENERIC CARD
========================================================= */

function createContentCard(
  item,
  options = {}
) {
  const title = escapeHTML(
    item.title ||
    item.name ||
    options.defaultTitle ||
    "AAKASH EARTH"
  );

  const description = escapeHTML(
    item.description ||
    item.details ||
    item.message ||
    ""
  );

  const imageURL = safeImage(
    item.photoURL ||
    item.imageURL ||
    item.bannerURL ||
    item.image ||
    ""
  );

  const dateValue =
    item.date ||
    item.eventDate ||
    item.createdAt ||
    "";

  const dateText =
    dateValue
      ? formatDate(dateValue)
      : "";

  return `
    <article class="content-card">

      <div class="content-card-image">

        ${
          imageURL
            ? `
              <img
                src="${imageURL}"
                alt="${title}"
                loading="lazy"
              >
            `
            : `
              <div class="member-photo-fallback">
                ${options.icon || "✦"}
              </div>
            `
        }

      </div>

      <div class="content-card-body">

        <strong>${title}</strong>

        ${
          dateText
            ? `
              <p>
                📅 ${dateText}
              </p>
            `
            : ""
        }

        ${
          description
            ? `
              <p>
                ${description}
              </p>
            `
            : ""
        }

      </div>

    </article>
  `;
}


/* =========================================================
   FESTIVALS
========================================================= */

const festivalGrid = $("#festivalGrid");
const festivalCount = $("#festivalCount");

function renderFestivals() {
  if (!festivalGrid) return;

  const visibleFestivals =
    allFestivals
      .filter((item) => {
        const status =
          normalizeStatus(item.status);

        return (
          !status ||
          status === "active" ||
          status === "approved" ||
          status === "published" ||
          status === "upcoming"
        );
      })
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      );

  if (festivalCount) {
    festivalCount.textContent =
      visibleFestivals.length;
  }

  if (!visibleFestivals.length) {
    festivalGrid.innerHTML = `
      <div class="slider-empty">
        Festival information will appear here.
      </div>
    `;
    return;
  }

  festivalGrid.innerHTML =
    visibleFestivals
      .map((item) =>
        createContentCard(item, {
          icon: "🪔",
          defaultTitle: "Festival"
        })
      )
      .join("");
}

onValue(
  ref(db, "festivals"),
  (snapshot) => {
    allFestivals =
      objectToArray(snapshot.val());

    renderFestivals();
  },
  (error) => {
    console.error(
      "Festivals load error:",
      error
    );

    if (festivalCount) {
      festivalCount.textContent = "0";
    }
  }
);


/* =========================================================
   COMMITTEE
   Supports "committee" database node
========================================================= */

const committeeGrid = $("#committeeGrid");

function renderCommittee() {
  if (!committeeGrid) return;

  const committee =
    allCommittee
      .filter((item) => {
        const status =
          normalizeStatus(item.status);

        return (
          !status ||
          status === "active" ||
          status === "approved"
        );
      })
      .sort((a, b) => {
        const orderA =
          Number(a.order) || 9999;

        const orderB =
          Number(b.order) || 9999;

        return orderA - orderB;
      });

  if (!committee.length) {
    committeeGrid.innerHTML = `
      <div class="slider-empty light-empty">
        Committee information will appear here.
      </div>
    `;

    return;
  }

  committeeGrid.innerHTML =
    committee
      .map((person) => {
        const name = escapeHTML(
          person.name || "Committee Member"
        );

        const role = escapeHTML(
          person.position ||
          person.designation ||
          person.role ||
          "Committee"
        );

        const year = escapeHTML(
          person.year || ""
        );

        const photo = safeImage(
          person.photoURL
        );

        return `
          <article class="content-card">

            <div class="content-card-image">

              ${
                photo
                  ? `
                    <img
                      src="${photo}"
                      alt="${name}"
                      loading="lazy"
                    >
                  `
                  : `
                    <div class="member-photo-fallback">
                      👑
                    </div>
                  `
              }

            </div>

            <div class="content-card-body">

              <strong>${name}</strong>

              <p>${role}</p>

              ${
                year
                  ? `<p>Year ${year}</p>`
                  : ""
              }

            </div>

          </article>
        `;
      })
      .join("");
}

onValue(
  ref(db, "committee"),
  (snapshot) => {
    allCommittee =
      objectToArray(snapshot.val());

    renderCommittee();
  },
  (error) => {
    console.error(
      "Committee load error:",
      error
    );
  }
);


/* =========================================================
   SPORTS
========================================================= */

const sportsGrid = $("#sportsGrid");
const sportsCount = $("#sportsCount");

function renderSports() {
  if (!sportsGrid) return;

  const sports =
    allSports
      .filter((item) => {
        const status =
          normalizeStatus(item.status);

        return (
          !status ||
          status === "active" ||
          status === "approved" ||
          status === "published" ||
          status === "upcoming"
        );
      })
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      );

  if (sportsCount) {
    sportsCount.textContent =
      sports.length;
  }

  if (!sports.length) {
    sportsGrid.innerHTML = `
      <div class="slider-empty">
        Sports activities will appear here.
      </div>
    `;
    return;
  }

  sportsGrid.innerHTML =
    sports
      .map((item) =>
        createContentCard(item, {
          icon: "🏆",
          defaultTitle: "Sports Activity"
        })
      )
      .join("");
}

onValue(
  ref(db, "sports"),
  (snapshot) => {
    allSports =
      objectToArray(snapshot.val());

    renderSports();
  },
  (error) => {
    console.error(
      "Sports load error:",
      error
    );

    if (sportsCount) {
      sportsCount.textContent = "0";
    }
  }
);


/* =========================================================
   UPDATES
========================================================= */

const updatesGrid = $("#updatesGrid");

function renderUpdates() {
  if (!updatesGrid) return;

  const updates =
    allUpdates
      .filter((item) => {
        const status =
          normalizeStatus(item.status);

        return (
          !status ||
          status === "active" ||
          status === "approved" ||
          status === "published"
        );
      })
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      );

  if (!updates.length) {
    updatesGrid.innerHTML = `
      <div class="slider-empty">
        Community updates will appear here.
      </div>
    `;
    return;
  }

  updatesGrid.innerHTML =
    updates
      .map((item) =>
        createContentCard(item, {
          icon: "📢",
          defaultTitle: "Community Update"
        })
      )
      .join("");
}

onValue(
  ref(db, "updates"),
  (snapshot) => {
    allUpdates =
      objectToArray(snapshot.val());

    renderUpdates();
  },
  (error) => {
    console.error(
      "Updates load error:",
      error
    );
  }
);


/* =========================================================
   GALLERY
========================================================= */

const galleryGrid = $("#galleryGrid");

function renderGallery() {
  if (!galleryGrid) return;

  const gallery =
    allGallery
      .filter((item) => {
        const status =
          normalizeStatus(item.status);

        return (
          !status ||
          status === "active" ||
          status === "approved" ||
          status === "published"
        );
      })
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      );

  if (!gallery.length) {
    galleryGrid.innerHTML = `
      <div class="slider-empty">
        Gallery photos will appear here.
      </div>
    `;
    return;
  }

  galleryGrid.innerHTML =
    gallery
      .map((item) => {
        const imageURL =
          safeImage(
            item.photoURL ||
            item.imageURL ||
            item.image
          );

        const title =
          escapeHTML(
            item.title ||
            item.caption ||
            "AAKASH EARTH"
          );

        if (!imageURL) {
          return "";
        }

        return `
          <article class="gallery-item">

            <img
              src="${imageURL}"
              alt="${title}"
              loading="lazy"
            >

            <div class="gallery-caption">
              ${title}
            </div>

          </article>
        `;
      })
      .join("");

  if (!galleryGrid.innerHTML.trim()) {
    galleryGrid.innerHTML = `
      <div class="slider-empty">
        Gallery photos will appear here.
      </div>
    `;
  }
}

onValue(
  ref(db, "gallery"),
  (snapshot) => {
    allGallery =
      objectToArray(snapshot.val());

    renderGallery();
  },
  (error) => {
    console.error(
      "Gallery load error:",
      error
    );
  }
);


/* =========================================================
   GENERIC SLIDER BUTTONS
========================================================= */

function scrollSlider(sliderId, direction) {
  const slider =
    document.getElementById(sliderId);

  if (!slider) return;

  const track =
    slider.querySelector(
      ".content-slider-track, .gallery-track"
    );

  if (!track) return;

  const amount =
    Math.min(
      680,
      Math.max(
        280,
        track.clientWidth * 0.75
      )
    );

  track.scrollBy({
    left: amount * direction,
    behavior: "smooth"
  });
}

$$("[data-slider-prev]").forEach((button) => {
  button.addEventListener("click", () => {
    scrollSlider(
      button.dataset.sliderPrev,
      -1
    );
  });
});

$$("[data-slider-next]").forEach((button) => {
  button.addEventListener("click", () => {
    scrollSlider(
      button.dataset.sliderNext,
      1
    );
  });
});


/* =========================================================
   VOLUNTEER SLIDER BUTTONS
========================================================= */

const volunteerPrev = $("#volunteerPrev");
const volunteerNext = $("#volunteerNext");

function moveVolunteerSlider(direction) {
  if (!volunteerGrid) return;

  volunteerGrid.scrollBy({
    left: 540 * direction,
    behavior: "smooth"
  });
}

volunteerPrev?.addEventListener(
  "click",
  () => moveVolunteerSlider(-1)
);

volunteerNext?.addEventListener(
  "click",
  () => moveVolunteerSlider(1)
);


/* =========================================================
   REVEAL ON SCROLL
========================================================= */

function prepareRevealAnimations() {
  const targets = [
    ...$$(".section-heading"),
    ...$$(".stat-card"),
    ...$$(".portal-copy"),
    ...$$(".mini-portal-card"),
    ...$$(".complaint-container")
  ];

  targets.forEach((element) => {
    element.classList.add("reveal-item");
  });

  if (!("IntersectionObserver" in window)) {
    targets.forEach((element) => {
      element.classList.add("revealed");
    });

    return;
  }

  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(
              "revealed"
            );

            observer.unobserve(
              entry.target
            );
          }
        });
      },
      {
        threshold: 0.12
      }
    );

  targets.forEach((element) => {
    observer.observe(element);
  });
}

prepareRevealAnimations();


/* =========================================================
   WINDOW RESIZE
========================================================= */

let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    resetMemberSlider();
    startMemberAutoSlide();

    if (window.innerWidth > 1150) {
      mobileNav?.classList.remove("open");
      document.body.classList.remove(
        "menu-open"
      );
    }
  }, 180);
});


/* =========================================================
   VISIBILITY CONTROL
   Browser tab hidden ho to unnecessary animations stop.
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
      stopHeroSlider();
      stopMemberAutoSlide();
    } else {
      startHeroSlider();
      startMemberAutoSlide();
    }
  }
);


/* =========================================================
   STARTUP
========================================================= */

console.log(
  "AAKASH EARTH public portal loaded."
);