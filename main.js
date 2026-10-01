/* =========================================================
   AAKASH EARTH
   PUBLIC WEBSITE ENGINE
   main.js
========================================================= */

import {
  db,
  ref,
  set,
  push,
  onValue,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const clean = (value) =>
  String(value ?? "").trim();

const lower = (value) =>
  clean(value).toLowerCase();

const escapeHTML = (value) =>
  clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const safeImage = (item = {}) =>
  clean(
    item.photoURL ||
    item.photoUrl ||
    item.imageURL ||
    item.imageUrl ||
    item.url ||
    ""
  );

const toArray = (snapshotValue) => {
  if (!snapshotValue) return [];

  return Object.entries(snapshotValue).map(
    ([key, value]) => ({
      key,
      ...(value || {})
    })
  );
};

const setText = (id, value) => {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return clean(value) || "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
};

const formatMoney = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return clean(value) || "Free";
  }

  if (amount <= 0) return "Free";

  return `₹${amount.toLocaleString("en-IN")}`;
};

const withTimeout = (
  promise,
  milliseconds,
  message
) => {
  return Promise.race([
    promise,

    new Promise((_, reject) => {
      setTimeout(
        () => reject(
          new Error(message)
        ),
        milliseconds
      );
    })
  ]);
};

const emptyCard = (text) => `
  <div class="empty-card">
    ${escapeHTML(text)}
  </div>
`;


/* =========================================================
   STATE
========================================================= */

let members = [];
let volunteers = [];
let festivals = [];
let sports = [];
let updates = [];
let gallery = [];
let committee = [];

let selectedSports = null;


/* =========================================================
   YEAR
========================================================= */

setText(
  "currentYear",
  new Date().getFullYear()
);


/* =========================================================
   MOBILE MENU
========================================================= */

const mobileMenuBtn =
  $("#mobileMenuBtn");

const mobileNav =
  $("#mobileNav");

if (mobileMenuBtn && mobileNav) {

  mobileMenuBtn.addEventListener(
    "click",
    () => {
      mobileNav.classList.toggle(
        "active"
      );
    }
  );

  $$("a", mobileNav).forEach(
    (link) => {
      link.addEventListener(
        "click",
        () => {
          mobileNav.classList.remove(
            "active"
          );
        }
      );
    }
  );
}


/* =========================================================
   BACK TO TOP
========================================================= */

const backToTop =
  $("#backToTop");

if (backToTop) {

  backToTop.addEventListener(
    "click",
    () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );

  let scrollTicking = false;

  window.addEventListener(
    "scroll",
    () => {

      if (scrollTicking) return;

      scrollTicking = true;

      requestAnimationFrame(() => {

        const visible =
          window.scrollY > 450;

        backToTop.style.opacity =
          visible ? "1" : "0";

        backToTop.style.pointerEvents =
          visible ? "auto" : "none";

        $("#mainHeader")
          ?.classList.toggle(
            "scrolled",
            window.scrollY > 30
          );

        scrollTicking = false;
      });

    },
    { passive: true }
  );
}


/* =========================================================
   SIMPLE SLIDER
========================================================= */

function setupSlider(
  previousId,
  nextId,
  sliderId
) {

  const previous =
    document.getElementById(
      previousId
    );

  const next =
    document.getElementById(
      nextId
    );

  const slider =
    document.getElementById(
      sliderId
    );

  if (!slider) return;

  const move = (direction) => {

    const distance =
      Math.min(
        slider.clientWidth * 0.8,
        620
      );

    slider.scrollBy({
      left:
        direction * distance,

      behavior:
        "smooth"
    });
  };

  previous?.addEventListener(
    "click",
    () => move(-1)
  );

  next?.addEventListener(
    "click",
    () => move(1)
  );
}


setupSlider(
  "memberPrev",
  "memberNext",
  "memberSlider"
);

setupSlider(
  "festivalPrev",
  "festivalNext",
  "festivalSlider"
);

setupSlider(
  "volunteerPrev",
  "volunteerNext",
  "volunteerSlider"
);

setupSlider(
  "committeePrev",
  "committeeNext",
  "committeeSlider"
);

setupSlider(
  "sportsPrev",
  "sportsNext",
  "sportsSlider"
);

setupSlider(
  "galleryPrev",
  "galleryNext",
  "gallerySlider"
);


/* =========================================================
   MEMBER YEAR FILTER
========================================================= */

const memberYearSelect =
  $("#memberYearSelect");

memberYearSelect?.addEventListener(
  "change",
  renderMembers
);


/* =========================================================
   VOLUNTEER YEAR FILTER
========================================================= */

const volunteerYearSelect =
  $("#volunteerYearSelect");

volunteerYearSelect?.addEventListener(
  "change",
  renderVolunteers
);


/* =========================================================
   YEAR SELECT OPTIONS
========================================================= */

function updateYearOptions(
  select,
  data
) {

  if (!select) return;

  const current =
    select.value || "all";

  const years = [
    ...new Set(
      data
        .map((item) =>
          clean(
            item.year ||
            item.memberYear ||
            item.volunteerYear
          )
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      String(b).localeCompare(
        String(a),
        undefined,
        { numeric: true }
      )
  );

  select.innerHTML = `
    <option value="all">
      All Years
    </option>

    ${years.map(
      (year) => `
        <option value="${escapeHTML(year)}">
          ${escapeHTML(year)}
        </option>
      `
    ).join("")}
  `;

  if (
    current === "all" ||
    years.includes(current)
  ) {
    select.value = current;
  }
}


/* =========================================================
   MEMBERS
========================================================= */

function renderMembers() {

  const grid =
    $("#memberGrid");

  if (!grid) return;

  const selectedYear =
    clean(
      memberYearSelect?.value ||
      "all"
    );

  const visible =
    members.filter((member) => {

      const status =
        lower(member.status);

      if (
        status === "rejected" ||
        status === "disabled" ||
        status === "inactive"
      ) {
        return false;
      }

      if (selectedYear === "all") {
        return true;
      }

      const year =
        clean(
          member.year ||
          member.memberYear
        );

      return year === selectedYear;
    });

  setText(
    "publicMemberCount",
    visible.length
  );

  setText(
    "memberCount",
    members.filter(
      (member) =>
        ![
          "rejected",
          "disabled",
          "inactive"
        ].includes(
          lower(member.status)
        )
    ).length
  );

  if (!visible.length) {
    grid.innerHTML =
      emptyCard(
        "No members available."
      );

    return;
  }

  grid.innerHTML =
    visible.map((member) => {

      const name =
        clean(
          member.name ||
          member.fullName ||
          member.memberName
        ) || "Member";

      const position =
        clean(
          member.position ||
          member.role ||
          member.designation
        );

      const year =
        clean(
          member.year ||
          member.memberYear
        );

      const photo =
        safeImage(member);

      return `
        <article class="member-card">

          ${
            photo
              ? `
                <img
                  src="${escapeHTML(photo)}"
                  alt="${escapeHTML(name)}"
                  loading="lazy"
                  decoding="async"
                >
              `
              : ""
          }

          <div class="card-content">

            <span class="card-badge">
              MEMBER
            </span>

            <h3>
              ${escapeHTML(name)}
            </h3>

            ${
              position
                ? `
                  <p>
                    ${escapeHTML(position)}
                  </p>
                `
                : ""
            }

            ${
              year
                ? `
                  <p>
                    Year:
                    ${escapeHTML(year)}
                  </p>
                `
                : ""
            }

          </div>

        </article>
      `;

    }).join("");
}


/* =========================================================
   VOLUNTEERS
========================================================= */

function renderVolunteers() {

  const grid =
    $("#volunteerGrid");

  if (!grid) return;

  const selectedYear =
    clean(
      volunteerYearSelect?.value ||
      "all"
    );

  const visible =
    volunteers.filter(
      (volunteer) => {

        const status =
          lower(volunteer.status);

        /*
          Approved or old records
          without status are public.
        */

        if (
          status &&
          status !== "approved" &&
          status !== "active"
        ) {
          return false;
        }

        if (
          selectedYear === "all"
        ) {
          return true;
        }

        const year =
          clean(
            volunteer.year ||
            volunteer.volunteerYear
          );

        return (
          year === selectedYear
        );
      }
    );

  setText(
    "publicVolunteerCount",
    visible.length
  );

  setText(
    "volunteerCount",
    volunteers.filter(
      (volunteer) => {

        const status =
          lower(volunteer.status);

        return (
          !status ||
          status === "approved" ||
          status === "active"
        );
      }
    ).length
  );

  if (!visible.length) {

    grid.innerHTML =
      emptyCard(
        "No volunteers available."
      );

    return;
  }

  grid.innerHTML =
    visible.map(
      (volunteer) => {

        const name =
          clean(
            volunteer.name ||
            volunteer.fullName
          ) || "Volunteer";

        const year =
          clean(
            volunteer.year ||
            volunteer.volunteerYear
          );

        const points =
          Number(
            volunteer.points || 0
          );

        const photo =
          safeImage(volunteer);

        return `
          <article class="volunteer-card">

            ${
              photo
                ? `
                  <img
                    src="${escapeHTML(photo)}"
                    alt="${escapeHTML(name)}"
                    loading="lazy"
                    decoding="async"
                  >
                `
                : ""
            }

            <div class="card-content">

              <span class="card-badge">
                VOLUNTEER
              </span>

              <h3>
                ${escapeHTML(name)}
              </h3>

              ${
                year
                  ? `
                    <p>
                      Year:
                      ${escapeHTML(year)}
                    </p>
                  `
                  : ""
              }

              <p>
                Points:
                ${Number.isFinite(points)
                  ? points
                  : 0}
              </p>

            </div>

          </article>
        `;
      }
    ).join("");
}


/* =========================================================
   FESTIVALS
========================================================= */

function renderFestivals() {

  const grid =
    $("#festivalGrid");

  if (!grid) return;

  setText(
    "festivalCount",
    festivals.length
  );

  if (!festivals.length) {

    grid.innerHTML =
      emptyCard(
        "No festival or event available."
      );

    return;
  }

  grid.innerHTML =
    festivals.map(
      (festival) => {

        const title =
          clean(
            festival.title ||
            festival.name ||
            festival.festivalName
          ) || "Festival";

        const date =
          festival.date ||
          festival.eventDate;

        const venue =
          clean(
            festival.venue ||
            festival.location
          );

        const description =
          clean(
            festival.description ||
            festival.details
          );

        const photo =
          safeImage(festival);

        return `
          <article class="festival-card">

            ${
              photo
                ? `
                  <img
                    src="${escapeHTML(photo)}"
                    alt="${escapeHTML(title)}"
                    loading="lazy"
                    decoding="async"
                  >
                `
                : ""
            }

            <div class="card-content">

              <span class="card-badge">
                EVENT
              </span>

              <h3>
                ${escapeHTML(title)}
              </h3>

              ${
                date
                  ? `
                    <p>
                      ${escapeHTML(
                        formatDate(date)
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                venue
                  ? `
                    <p>
                      ${escapeHTML(venue)}
                    </p>
                  `
                  : ""
              }

              ${
                description
                  ? `
                    <p>
                      ${escapeHTML(
                        description
                      )}
                    </p>
                  `
                  : ""
              }

            </div>

          </article>
        `;
      }
    ).join("");
}


/* =========================================================
   COMMITTEE
========================================================= */

function renderCommittee() {

  const grid =
    $("#committeeGrid");

  if (!grid) return;

  if (!committee.length) {

    grid.innerHTML =
      emptyCard(
        "No committee records available."
      );

    return;
  }

  grid.innerHTML =
    committee.map(
      (person) => {

        const name =
          clean(
            person.name ||
            person.fullName
          ) || "Committee Member";

        const position =
          clean(
            person.position ||
            person.role ||
            person.designation
          );

        const photo =
          safeImage(person);

        return `
          <article class="committee-card">

            ${
              photo
                ? `
                  <img
                    src="${escapeHTML(photo)}"
                    alt="${escapeHTML(name)}"
                    loading="lazy"
                    decoding="async"
                  >
                `
                : ""
            }

            <div class="card-content">

              <span class="card-badge">
                COMMITTEE
              </span>

              <h3>
                ${escapeHTML(name)}
              </h3>

              ${
                position
                  ? `
                    <p>
                      ${escapeHTML(position)}
                    </p>
                  `
                  : ""
              }

            </div>

          </article>
        `;
      }
    ).join("");
}


/* =========================================================
   SPORTS
========================================================= */

function sportsRegistrationEnabled(
  sport
) {

  if (
    sport.registrationEnabled === false ||
    lower(
      sport.registrationStatus
    ) === "closed"
  ) {
    return false;
  }

  return true;
}


function renderSports() {

  const grid =
    $("#sportsGrid");

  if (!grid) return;

  setText(
    "sportsCount",
    sports.length
  );

  if (!sports.length) {

    grid.innerHTML =
      emptyCard(
        "No sports events available."
      );

    return;
  }

  grid.innerHTML =
    sports.map(
      (sport) => {

        const title =
          clean(
            sport.name ||
            sport.title ||
            sport.sportsName
          ) || "Sports Event";

        const date =
          sport.date ||
          sport.eventDate;

        const venue =
          clean(
            sport.venue ||
            sport.location
          );

        const photo =
          safeImage(sport);

        const registration =
          sportsRegistrationEnabled(
            sport
          );

        return `
          <article class="sports-card">

            ${
              photo
                ? `
                  <img
                    src="${escapeHTML(photo)}"
                    alt="${escapeHTML(title)}"
                    loading="lazy"
                    decoding="async"
                  >
                `
                : ""
            }

            <div class="card-content">

              <span class="card-badge">
                SPORTS
              </span>

              <h3>
                ${escapeHTML(title)}
              </h3>

              ${
                date
                  ? `
                    <p>
                      Date:
                      ${escapeHTML(
                        formatDate(date)
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                venue
                  ? `
                    <p>
                      Venue:
                      ${escapeHTML(venue)}
                    </p>
                  `
                  : ""
              }

              ${
                registration
                  ? `
                    <button
                      type="button"
                      class="sports-register-btn"
                      data-sports-key="${escapeHTML(
                        sport.key
                      )}"
                    >
                      REGISTER NOW
                    </button>
                  `
                  : `
                    <span class="status-badge">
                      REGISTRATION CLOSED
                    </span>
                  `
              }

            </div>

          </article>
        `;
      }
    ).join("");

  $$(".sports-register-btn", grid)
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const key =
            button.dataset.sportsKey;

          const sport =
            sports.find(
              (item) =>
                item.key === key
            );

          if (sport) {
            openSportsModal(sport);
          }
        }
      );
    });
}


/* =========================================================
   UPDATES
========================================================= */

function renderUpdates() {

  const grid =
    $("#updatesGrid");

  if (!grid) return;

  if (!updates.length) {

    grid.innerHTML =
      emptyCard(
        "No updates available."
      );

    return;
  }

  const sorted =
    [...updates].sort(
      (a, b) =>
        Number(
          b.createdAt || 0
        ) -
        Number(
          a.createdAt || 0
        )
    );

  grid.innerHTML =
    sorted.map(
      (update) => {

        const title =
          clean(
            update.title ||
            update.heading
          ) || "Update";

        const message =
          clean(
            update.message ||
            update.description ||
            update.details
          );

        return `
          <article class="update-card">

            <div class="card-content">

              <span class="card-badge">
                UPDATE
              </span>

              <h3>
                ${escapeHTML(title)}
              </h3>

              ${
                message
                  ? `
                    <p>
                      ${escapeHTML(message)}
                    </p>
                  `
                  : ""
              }

            </div>

          </article>
        `;
      }
    ).join("");
}


/* =========================================================
   GALLERY
========================================================= */

function renderGallery() {

  const grid =
    $("#galleryGrid");

  if (!grid) return;

  if (!gallery.length) {

    grid.innerHTML =
      emptyCard(
        "No gallery photos available."
      );

    return;
  }

  grid.innerHTML =
    gallery.map(
      (item) => {

        const title =
          clean(
            item.title ||
            item.caption ||
            item.name
          ) || "Community Moment";

        const photo =
          safeImage(item);

        if (!photo) return "";

        return `
          <article class="gallery-card">

            <img
              src="${escapeHTML(photo)}"
              alt="${escapeHTML(title)}"
              loading="lazy"
              decoding="async"
            >

            <div class="card-content">

              <span class="card-badge">
                GALLERY
              </span>

              <h3>
                ${escapeHTML(title)}
              </h3>

            </div>

          </article>
        `;
      }
    ).join("");

  if (!grid.innerHTML.trim()) {
    grid.innerHTML =
      emptyCard(
        "No gallery photos available."
      );
  }
}


/* =========================================================
   SPORTS MODAL
========================================================= */

const sportsModal =
  $("#sportsRegistrationModal");

const sportsForm =
  $("#publicSportsRegistrationForm");

const sportsSuccess =
  $("#sportsRegistrationSuccess");

const sportsFormArea =
  $("#sportsRegistrationFormArea");


function showElement(element) {
  if (!element) return;

  element.hidden = false;
}


function hideElement(element) {
  if (!element) return;

  element.hidden = true;
}


function openSportsModal(sport) {

  selectedSports = sport;

  setText(
    "sportsRegistrationTitle",
    clean(
      sport.name ||
      sport.title ||
      sport.sportsName
    ) || "Sports Registration"
  );

  setText(
    "registrationSportsName",
    clean(
      sport.name ||
      sport.title ||
      sport.sportsName
    ) || "—"
  );

  setText(
    "registrationSportsDate",
    formatDate(
      sport.date ||
      sport.eventDate
    )
  );

  setText(
    "registrationSportsVenue",
    clean(
      sport.venue ||
      sport.location
    ) || "—"
  );

  setText(
    "registrationSportsLastDate",
    formatDate(
      sport.lastDate ||
      sport.registrationLastDate
    )
  );

  setText(
    "registrationSportsFee",
    formatMoney(
      sport.fee ||
      sport.registrationFee ||
      0
    )
  );

  setText(
    "registrationSportsAge",
    clean(
      sport.age ||
      sport.ageLimit ||
      sport.ageGroup
    ) || "—"
  );

  setText(
    "sportsRulesText",
    clean(
      sport.rules ||
      sport.description
    ) || "Follow event instructions."
  );

  const keyInput =
    $("#registrationSportsKey");

  if (keyInput) {
    keyInput.value =
      sport.key || "";
  }

  sportsForm?.reset();

  if (keyInput) {
    keyInput.value =
      sport.key || "";
  }

  resetSportsPhotoPreview();

  showElement(sportsFormArea);

  hideElement(sportsSuccess);

  sportsSuccess?.classList.remove(
    "active",
    "show",
    "open"
  );

  sportsModal?.classList.add(
    "active"
  );

  sportsModal?.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}


function closeSportsModal() {

  sportsModal?.classList.remove(
    "active",
    "open"
  );

  sportsModal?.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    "";

  selectedSports = null;

  sportsForm?.reset();

  resetSportsPhotoPreview();
}


$("#closeSportsRegistrationModal")
  ?.addEventListener(
    "click",
    closeSportsModal
  );


$("#closeSportsRegistrationSuccess")
  ?.addEventListener(
    "click",
    closeSportsModal
  );


sportsModal?.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      sportsModal
    ) {
      closeSportsModal();
    }
  }
);


document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      sportsModal?.classList.contains(
        "active"
      )
    ) {
      closeSportsModal();
    }
  }
);


/* =========================================================
   OPTIONAL PHOTO PREVIEW
========================================================= */

const sportsPhotoInput =
  $("#sportsParticipantPhoto");

const sportsPhotoPreviewBox =
  $("#sportsParticipantPhotoPreviewBox");

const sportsPhotoPreview =
  $("#sportsParticipantPhotoPreview");

const sportsPhotoName =
  $("#sportsParticipantPhotoName");


sportsPhotoInput?.addEventListener(
  "change",
  () => {

    const file =
      sportsPhotoInput.files?.[0];

    if (!file) {
      resetSportsPhotoPreview();
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      sportsPhotoInput.value = "";

      setSportsMessage(
        "Please select an image file."
      );

      resetSportsPhotoPreview();

      return;
    }

    if (
      file.size >
      15 * 1024 * 1024
    ) {
      sportsPhotoInput.value = "";

      setSportsMessage(
        "Photo must be below 15 MB."
      );

      resetSportsPhotoPreview();

      return;
    }

    const url =
      URL.createObjectURL(file);

    if (sportsPhotoPreview) {
      sportsPhotoPreview.src = url;

      sportsPhotoPreview.onload =
        () => URL.revokeObjectURL(
          url
        );
    }

    if (sportsPhotoName) {
      sportsPhotoName.textContent =
        file.name;
    }

    showElement(
      sportsPhotoPreviewBox
    );

    setSportsMessage("");
  }
);


function resetSportsPhotoPreview() {

  hideElement(
    sportsPhotoPreviewBox
  );

  if (sportsPhotoPreview) {
    sportsPhotoPreview.removeAttribute(
      "src"
    );
  }

  if (sportsPhotoName) {
    sportsPhotoName.textContent = "";
  }
}


/* =========================================================
   IMAGE COMPRESSION
========================================================= */

async function compressImage(file) {

  if (!file) return null;

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Please select a valid image."
    );
  }

  if (
    file.size >
    15 * 1024 * 1024
  ) {
    throw new Error(
      "Photo must be below 15 MB."
    );
  }

  const bitmap =
    await createImageBitmap(file);

  const maxSize = 1280;

  let width =
    bitmap.width;

  let height =
    bitmap.height;

  if (
    width > maxSize ||
    height > maxSize
  ) {

    const ratio =
      Math.min(
        maxSize / width,
        maxSize / height
      );

    width =
      Math.round(
        width * ratio
      );

    height =
      Math.round(
        height * ratio
      );
  }

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext(
      "2d",
      {
        alpha: false
      }
    );

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );

  bitmap.close?.();

  let quality = 0.78;
  let blob = null;

  const target =
    700 * 1024;

  while (quality >= 0.52) {

    blob =
      await new Promise(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            quality
          );
        }
      );

    if (
      !blob ||
      blob.size <= target
    ) {
      break;
    }

    quality -= 0.07;
  }

  if (!blob) {
    throw new Error(
      "Unable to process photo."
    );
  }

  return blob;
}


/* =========================================================
   OPTIONAL STORAGE UPLOAD
========================================================= */

async function uploadOptionalImage(
  file,
  path
) {

  /*
    No file = no error.
    Photos remain optional.
  */

  if (!file) {
    return {
      url: "",
      path: ""
    };
  }

  const compressed =
    await compressImage(file);

  const finalPath =
    `${path}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`;

  const fileRef =
    storageRef(
      storage,
      finalPath
    );

  await withTimeout(
    uploadBytes(
      fileRef,
      compressed,
      {
        contentType:
          "image/jpeg"
      }
    ),
    45000,
    "Photo upload timed out."
  );

  const url =
    await withTimeout(
      getDownloadURL(fileRef),
      15000,
      "Unable to get photo URL."
    );

  return {
    url,
    path: finalPath
  };
}


/* =========================================================
   SPORTS REGISTRATION
========================================================= */

function setSportsMessage(
  message,
  success = false
) {

  const element =
    $("#sportsRegistrationMessage");

  if (!element) return;

  element.textContent =
    message || "";

  element.style.color =
    success
      ? "#75ffc0"
      : "#ffb0bd";
}


sportsForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const submitButton =
      $("#sportsRegistrationSubmit");

    const originalText =
      submitButton?.textContent ||
      "SUBMIT REGISTRATION";

    try {

      setSportsMessage("");

      if (!selectedSports) {
        throw new Error(
          "Sports event not selected."
        );
      }

      const name =
        clean(
          $("#sportsParticipantName")
            ?.value
        );

      const mobile =
        clean(
          $("#sportsParticipantMobile")
            ?.value
        ).replace(/\D/g, "");

      if (!name) {
        throw new Error(
          "Please enter participant name."
        );
      }

      if (
        !/^[6-9]\d{9}$/.test(
          mobile
        )
      ) {
        throw new Error(
          "Enter a valid 10 digit mobile number."
        );
      }

      const file =
        sportsPhotoInput
          ?.files?.[0] ||
        null;

      if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent =
          file
            ? "UPLOADING..."
            : "SAVING...";
      }

      /*
        Photo is optional.
        Upload only when selected.
      */

      const uploaded =
        await uploadOptionalImage(
          file,
          `sportsRegistrations/${selectedSports.key}`
        );

      const registrationRef =
        push(
          ref(
            db,
            `sportsRegistrations/${selectedSports.key}`
          )
        );

      const registrationId =
        registrationRef.key;

      const payload = {

        registrationId,

        sportsKey:
          selectedSports.key,

        sportsName:
          clean(
            selectedSports.name ||
            selectedSports.title ||
            selectedSports.sportsName
          ),

        participantType:
          clean(
            $("#sportsParticipantType")
              ?.value
          ) || "individual",

        participantName:
          name,

        mobile,

        age:
          clean(
            $("#sportsParticipantAge")
              ?.value
          ),

        gender:
          clean(
            $("#sportsParticipantGender")
              ?.value
          ),

        area:
          clean(
            $("#sportsParticipantArea")
              ?.value
          ),

        teamName:
          clean(
            $("#sportsParticipantTeamName")
              ?.value
          ),

        note:
          clean(
            $("#sportsParticipantNote")
              ?.value
          ),

        photoURL:
          uploaded.url,

        photoUrl:
          uploaded.url,

        imageURL:
          uploaded.url,

        storagePath:
          uploaded.path,

        status:
          "pending",

        createdAt:
          Date.now(),

        createdDate:
          new Date()
            .toISOString()
      };

      await withTimeout(
        set(
          registrationRef,
          payload
        ),
        15000,
        "Registration save timed out."
      );

      setText(
        "sportsRegistrationSuccessId",
        registrationId
      );

      hideElement(
        sportsFormArea
      );

      showElement(
        sportsSuccess
      );

      sportsSuccess?.classList.add(
        "active"
      );

      sportsForm.reset();

      resetSportsPhotoPreview();

    } catch (error) {

      console.error(
        "Sports registration error:",
        error
      );

      setSportsMessage(
        error?.message ||
        "Unable to submit registration."
      );

    } finally {

      if (submitButton) {
        submitButton.disabled = false;

        submitButton.textContent =
          originalText;
      }
    }
  }
);


/* =========================================================
   FIREBASE WATCHER
========================================================= */

function watchData(
  path,
  callback
) {

  const databaseRef =
    ref(db, path);

  onValue(
    databaseRef,

    (snapshot) => {

      const value =
        snapshot.val();

      callback(
        toArray(value)
      );
    },

    (error) => {

      console.error(
        `Firebase read error (${path}):`,
        error
      );

      callback([]);
    }
  );
}


/* =========================================================
   LIVE FIREBASE DATA
========================================================= */

watchData(
  "members",
  (data) => {

    members = data;

    updateYearOptions(
      memberYearSelect,
      members
    );

    renderMembers();
  }
);


watchData(
  "volunteers",
  (data) => {

    volunteers = data;

    updateYearOptions(
      volunteerYearSelect,
      volunteers
    );

    renderVolunteers();
  }
);


watchData(
  "festivals",
  (data) => {

    festivals = data;

    renderFestivals();
  }
);


watchData(
  "sports",
  (data) => {

    sports = data;

    renderSports();
  }
);


watchData(
  "updates",
  (data) => {

    updates = data;

    renderUpdates();
  }
);


watchData(
  "gallery",
  (data) => {

    gallery = data;

    renderGallery();
  }
);


/*
  Existing project database path kept
  for committee records.
*/

watchData(
  "yuwaMandal",
  (data) => {

    committee = data;

    renderCommittee();
  }
);


/* =========================================================
   REVEAL FALLBACK
   effects.js handles normal animation.
========================================================= */

setTimeout(() => {

  $$(".reveal").forEach(
    (element) => {

      if (
        !element.classList.contains(
          "reveal-active"
        )
      ) {
        element.classList.add(
          "reveal-active"
        );
      }
    }
  );

}, 1800);


/* =========================================================
   READY
========================================================= */

console.log(
  "AAKASH EARTH public portal ready."
);