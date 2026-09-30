/* =========================================================
   AAKASH EARTH - VOLUNTEER RANKING
   Firebase Realtime Database
========================================================= */

import {
  db,
  ref,
  onValue
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

function clean(value = "") {
  return String(value).trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase();
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function safeImage(value = "") {
  const url = clean(value);

  if (!url) return "";

  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:image/")
  ) {
    return url;
  }

  return "";
}


/* =========================================================
   STATE
========================================================= */

let volunteers = [];


/* =========================================================
   CURRENT LOGGED-IN VOLUNTEER
========================================================= */

const currentVolunteerKey =
  sessionStorage.getItem(
    "aakashVolunteerKey"
  ) || "";

const currentVolunteerId =
  sessionStorage.getItem(
    "aakashVolunteerId"
  ) || "";


/* =========================================================
   RANKING CALCULATION
========================================================= */

function calculateRanking(data) {
  if (!data) {
    return [];
  }

  const list =
    Object.entries(data)
      .map(([key, volunteer]) => ({
        key,
        ...(volunteer || {})
      }))
      .filter(
        (volunteer) =>
          normalize(volunteer.status) ===
          "approved"
      );

  /*
    Ranking priority:

    1. Highest Points
    2. Highest Rating
    3. Alphabetical Name
  */

  list.sort((a, b) => {
    const pointDifference =
      numberValue(b.points) -
      numberValue(a.points);

    if (pointDifference !== 0) {
      return pointDifference;
    }

    const ratingDifference =
      numberValue(b.rating) -
      numberValue(a.rating);

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    return String(a.name || "")
      .localeCompare(
        String(b.name || ""),
        "en",
        {
          sensitivity: "base"
        }
      );
  });

  return list.map(
    (volunteer, index) => ({
      ...volunteer,
      calculatedRank:
        index + 1
    })
  );
}


/* =========================================================
   MEDAL
========================================================= */

function rankDisplay(rank) {
  if (rank === 1) {
    return `
      <span
        title="Rank 1"
        style="font-size:20px;"
      >
        🥇
      </span>
    `;
  }

  if (rank === 2) {
    return `
      <span
        title="Rank 2"
        style="font-size:20px;"
      >
        🥈
      </span>
    `;
  }

  if (rank === 3) {
    return `
      <span
        title="Rank 3"
        style="font-size:20px;"
      >
        🥉
      </span>
    `;
  }

  return `
    <strong>
      #${rank}
    </strong>
  `;
}


/* =========================================================
   PHOTO
========================================================= */

function volunteerPhoto(volunteer) {
  return safeImage(
    volunteer.photoURL ||
    volunteer.photoUrl ||
    volunteer.photo ||
    ""
  );
}


/* =========================================================
   RATING
========================================================= */

function ratingDisplay(value) {
  const rating =
    numberValue(value);

  if (rating <= 0) {
    return "—";
  }

  return `${rating.toFixed(1)} ★`;
}


/* =========================================================
   RANKING TABLE
========================================================= */

function renderRankingTable() {
  const body =
    $("volunteerRankingList");

  if (!body) return;

  if (!volunteers.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="
            text-align:center;
            padding:25px;
          "
        >
          No approved volunteers
          available for ranking.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    volunteers
      .map((volunteer) => {
        const isCurrent =
          volunteer.key ===
            currentVolunteerKey ||
          (
            currentVolunteerId &&
            clean(
              volunteer.volunteerId
            ) ===
            clean(
              currentVolunteerId
            )
          );

        return `
          <tr
            ${
              isCurrent
                ? `
                  style="
                    background:
                    rgba(215,173,74,.12);
                  "
                `
                : ""
            }
          >

            <td>
              ${rankDisplay(
                volunteer.calculatedRank
              )}
            </td>

            <td>
              <div
                style="
                  display:flex;
                  align-items:center;
                  gap:9px;
                "
              >

                ${
                  volunteerPhoto(volunteer)
                    ? `
                      <img
                        src="${escapeHTML(
                          volunteerPhoto(
                            volunteer
                          )
                        )}"
                        alt=""
                        style="
                          width:34px;
                          height:34px;
                          object-fit:cover;
                          border-radius:50%;
                          border:
                            1px solid
                            rgba(215,173,74,.4);
                        "
                      >
                    `
                    : `
                      <div
                        style="
                          width:34px;
                          height:34px;
                          display:grid;
                          place-items:center;
                          border-radius:50%;
                          background:#071a2b;
                          color:#f2d78b;
                          font-size:11px;
                          font-weight:800;
                        "
                      >
                        ${escapeHTML(
                          (
                            volunteer.name ||
                            "V"
                          )
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>
                    `
                }

                <div>
                  <strong>
                    ${escapeHTML(
                      volunteer.name ||
                      "Volunteer"
                    )}
                  </strong>

                  ${
                    isCurrent
                      ? `
                        <br>
                        <small
                          style="
                            color:#a77a20;
                            font-weight:800;
                          "
                        >
                          YOU
                        </small>
                      `
                      : ""
                  }
                </div>

              </div>
            </td>

            <td>
              ${escapeHTML(
                volunteer.volunteerId ||
                volunteer.applicationId ||
                "—"
              )}
            </td>

            <td>
              <strong>
                ${numberValue(
                  volunteer.points
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(
                ratingDisplay(
                  volunteer.rating
                )
              )}
            </td>

          </tr>
        `;
      })
      .join("");
}


/* =========================================================
   OPTIONAL STANDALONE RANKING PAGE SUPPORT

   Agar ranking.html me ye IDs hain,
   to ye automatically work karenge.
========================================================= */

function renderStandaloneRanking() {
  const container =
    $("rankingVolunteerList");

  if (!container) return;

  if (!volunteers.length) {
    container.innerHTML = `
      <div class="ranking-empty">
        No approved volunteers found.
      </div>
    `;

    return;
  }

  container.innerHTML =
    volunteers
      .map((volunteer) => {
        const photo =
          volunteerPhoto(volunteer);

        return `
          <article
            class="ranking-card"
            data-rank="${
              volunteer.calculatedRank
            }"
          >

            <div
              class="ranking-number"
            >
              ${rankDisplay(
                volunteer.calculatedRank
              )}
            </div>

            <div
              class="ranking-person"
              style="
                display:flex;
                align-items:center;
                gap:12px;
              "
            >

              ${
                photo
                  ? `
                    <img
                      src="${escapeHTML(photo)}"
                      alt=""
                      style="
                        width:48px;
                        height:48px;
                        border-radius:50%;
                        object-fit:cover;
                      "
                    >
                  `
                  : `
                    <div
                      style="
                        width:48px;
                        height:48px;
                        display:grid;
                        place-items:center;
                        border-radius:50%;
                        background:#071a2b;
                        color:#f2d78b;
                        font-weight:800;
                      "
                    >
                      ${escapeHTML(
                        (
                          volunteer.name ||
                          "V"
                        )
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>
                  `
              }

              <div>
                <strong>
                  ${escapeHTML(
                    volunteer.name ||
                    "Volunteer"
                  )}
                </strong>

                <div>
                  ${escapeHTML(
                    volunteer.volunteerId ||
                    volunteer.applicationId ||
                    "—"
                  )}
                </div>
              </div>

            </div>

            <div
              class="ranking-points"
            >
              <strong>
                ${numberValue(
                  volunteer.points
                )}
              </strong>

              <span>
                Points
              </span>
            </div>

            <div
              class="ranking-rating"
            >
              ${escapeHTML(
                ratingDisplay(
                  volunteer.rating
                )
              )}
            </div>

          </article>
        `;
      })
      .join("");
}


/* =========================================================
   CURRENT VOLUNTEER RANK
========================================================= */

function renderCurrentRank() {
  const rankElement =
    $("volunteerRank");

  if (!rankElement) return;

  const current =
    volunteers.find(
      (volunteer) =>
        volunteer.key ===
          currentVolunteerKey ||
        (
          currentVolunteerId &&
          clean(
            volunteer.volunteerId
          ) ===
          clean(
            currentVolunteerId
          )
        )
    );

  if (!current) {
    rankElement.textContent =
      "—";

    return;
  }

  rankElement.textContent =
    `#${current.calculatedRank}`;
}


/* =========================================================
   OPTIONAL TOP 3
========================================================= */

function renderTopThree() {
  const container =
    $("rankingTopThree");

  if (!container) return;

  const topThree =
    volunteers.slice(0, 3);

  if (!topThree.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML =
    topThree
      .map((volunteer) => `
        <article
          class="ranking-top-card"
        >

          <div
            style="
              font-size:28px;
              margin-bottom:8px;
            "
          >
            ${
              volunteer.calculatedRank === 1
                ? "🥇"
                : volunteer.calculatedRank === 2
                  ? "🥈"
                  : "🥉"
            }
          </div>

          <strong>
            ${escapeHTML(
              volunteer.name ||
              "Volunteer"
            )}
          </strong>

          <div
            style="
              margin-top:5px;
              opacity:.7;
            "
          >
            ${escapeHTML(
              volunteer.volunteerId ||
              volunteer.applicationId ||
              "—"
            )}
          </div>

          <div
            style="
              margin-top:10px;
              font-weight:800;
            "
          >
            ${numberValue(
              volunteer.points
            )}
            Points
          </div>

          <div
            style="
              margin-top:4px;
            "
          >
            ${escapeHTML(
              ratingDisplay(
                volunteer.rating
              )
            )}
          </div>

        </article>
      `)
      .join("");
}


/* =========================================================
   STATS
========================================================= */

function renderRankingStats() {
  if ($("rankingVolunteerCount")) {
    $("rankingVolunteerCount")
      .textContent =
        volunteers.length;
  }

  if ($("rankingHighestPoints")) {
    $("rankingHighestPoints")
      .textContent =
        volunteers.length
          ? numberValue(
              volunteers[0].points
            )
          : 0;
  }

  if ($("rankingHighestRating")) {
    const highestRating =
      volunteers.reduce(
        (highest, volunteer) =>
          Math.max(
            highest,
            numberValue(
              volunteer.rating
            )
          ),
        0
      );

    $("rankingHighestRating")
      .textContent =
        highestRating > 0
          ? highestRating.toFixed(1)
          : "0";
  }
}


/* =========================================================
   RENDER ALL
========================================================= */

function renderEverything() {
  renderRankingTable();

  renderStandaloneRanking();

  renderCurrentRank();

  renderTopThree();

  renderRankingStats();
}


/* =========================================================
   FIREBASE LIVE LISTENER
========================================================= */

onValue(
  ref(db, "volunteers"),

  (snapshot) => {
    volunteers =
      calculateRanking(
        snapshot.val()
      );

    renderEverything();
  },

  (error) => {
    console.error(
      "Volunteer ranking error:",
      error
    );

    const table =
      $("volunteerRankingList");

    if (table) {
      table.innerHTML = `
        <tr>
          <td
            colspan="5"
            style="
              text-align:center;
              padding:20px;
            "
          >
            Unable to load ranking.
          </td>
        </tr>
      `;
    }

    const standalone =
      $("rankingVolunteerList");

    if (standalone) {
      standalone.innerHTML = `
        <div class="ranking-empty">
          Unable to load ranking.
        </div>
      `;
    }
  }
);


/* =========================================================
   START
========================================================= */

console.log(
  "AAKASH EARTH Volunteer Ranking connected."
);