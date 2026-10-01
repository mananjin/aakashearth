/* =========================================================
   AAKASH EARTH
   PUBLIC VOLUNTEER RANKING
   Complete replacement: ranking.js

   IMPORTANT:
   Points are used ONLY for ranking calculation.
   Points are NOT displayed publicly.
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


const clean = (value) =>
  String(value ?? "").trim();


const safeNumber = (value) => {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;

};


const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");


/* =========================================================
   CURRENT YEAR
========================================================= */

if ($("rankingCurrentYear")) {

  $("rankingCurrentYear")
    .textContent =
    new Date().getFullYear();

}


/* =========================================================
   CHECK PUBLIC VOLUNTEER
========================================================= */

function isPublicVolunteer(
  volunteer
) {

  if (
    !volunteer ||
    typeof volunteer !== "object"
  ) {

    return false;

  }


  if (
    volunteer.active === false
  ) {

    return false;

  }


  const status =
    clean(
      volunteer.status
    ).toLowerCase();


  /*
     Do not show disabled/inactive
     accounts publicly.
  */

  if (
    [
      "inactive",
      "disabled",
      "blocked",
      "suspended",
      "rejected"
    ].includes(status)
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   VOLUNTEER DETAILS
========================================================= */

function getVolunteerName(
  volunteer
) {

  return clean(
    volunteer.name ??
    volunteer.fullName ??
    volunteer.volunteerName
  ) || "Volunteer";

}


function getVolunteerId(
  volunteer
) {

  return clean(
    volunteer.volunteerId ??
    volunteer.volunteerID ??
    volunteer.userId ??
    volunteer.id
  ) || "—";

}


function getVolunteerPhoto(
  volunteer
) {

  return clean(
    volunteer.photoURL ??
    volunteer.imageURL ??
    volunteer.photo ??
    volunteer.image
  );

}


/* =========================================================
   SORT RANKING

   Highest points = Rank #1

   Tie:
   Older account first.

   NOTE:
   Points are never returned
   in public HTML.
========================================================= */

function buildRanking(
  data
) {

  return Object.entries(
    data || {}
  )
    .filter(
      ([, volunteer]) =>
        isPublicVolunteer(
          volunteer
        )
    )
    .map(
      ([key, volunteer]) => ({

        key,

        volunteer,

        /*
          Internal calculation only.
          Never display this publicly.
        */

        score:
          safeNumber(
            volunteer.points
          ),

        createdAt:
          safeNumber(
            volunteer.createdAt
          )

      })
    )
    .sort(
      (a, b) => {

        /*
          Higher points first.
        */

        if (
          b.score !==
          a.score
        ) {

          return (
            b.score -
            a.score
          );

        }


        /*
          If points are equal,
          older account stays first.
        */

        if (
          a.createdAt !==
          b.createdAt
        ) {

          return (
            a.createdAt -
            b.createdAt
          );

        }


        /*
          Final stable tie breaker.
        */

        return a.key.localeCompare(
          b.key
        );

      }
    );

}


/* =========================================================
   PHOTO HTML
========================================================= */

function createPhotoHTML(
  volunteer,
  extraClass = ""
) {

  const name =
    getVolunteerName(
      volunteer
    );


  const photo =
    getVolunteerPhoto(
      volunteer
    );


  const initial =
    clean(name)
      .charAt(0)
      .toUpperCase() ||
    "V";


  if (photo) {

    return `
      <div class="volunteer-photo ${extraClass}">

        <span>
          ${escapeHTML(initial)}
        </span>

        <img
          src="${escapeHTML(photo)}"
          alt="${escapeHTML(name)}"
          loading="lazy"
          decoding="async"
          onerror="
            this.style.display='none';
          "
        >

      </div>
    `;

  }


  return `
    <div class="volunteer-photo ${extraClass}">
      <span>
        ${escapeHTML(initial)}
      </span>
    </div>
  `;

}


/* =========================================================
   PODIUM CARD
========================================================= */

function createPodiumCard(
  item,
  rank
) {

  const volunteer =
    item.volunteer;


  const name =
    getVolunteerName(
      volunteer
    );


  const volunteerId =
    getVolunteerId(
      volunteer
    );


  let medal = "";

  let rankClass = "";


  if (rank === 1) {

    medal = "🥇";
    rankClass = "rank-one";

  } else if (rank === 2) {

    medal = "🥈";

  } else if (rank === 3) {

    medal = "🥉";

  }


  return `
    <article class="podium-card ${rankClass}">

      <span
        class="rank-medal"
        aria-hidden="true"
      >
        ${medal}
      </span>


      <span class="rank-number">
        RANK #${rank}
      </span>


      ${createPhotoHTML(
        volunteer
      )}


      <h3>
        ${escapeHTML(name)}
      </h3>


      <span class="volunteer-id">
        ${escapeHTML(
          volunteerId
        )}
      </span>

    </article>
  `;

}


/* =========================================================
   NORMAL RANK ROW
========================================================= */

function createRankingRow(
  item,
  rank
) {

  const volunteer =
    item.volunteer;


  const name =
    getVolunteerName(
      volunteer
    );


  const volunteerId =
    getVolunteerId(
      volunteer
    );


  return `
    <article class="ranking-row">

      <div class="row-rank">
        #${rank}
      </div>


      ${createPhotoHTML(
        volunteer,
        "row-photo"
      )}


      <div class="row-info">

        <h3>
          ${escapeHTML(name)}
        </h3>

        <span>
          Volunteer ID:
          ${escapeHTML(
            volunteerId
          )}
        </span>

      </div>

    </article>
  `;

}


/* =========================================================
   RENDER TOP 3
========================================================= */

function renderPodium(
  ranking
) {

  const container =
    $("rankingPodium");


  if (!container) {
    return;
  }


  if (!ranking.length) {

    container.innerHTML = `
      <div class="empty">
        No volunteer ranking available yet.
      </div>
    `;

    return;

  }


  const topThree =
    ranking.slice(
      0,
      3
    );


  /*
     Desktop visual order:

     Rank 2 | Rank 1 | Rank 3

     Rank numbers remain correct.
  */

  if (
    topThree.length >= 3
  ) {

    container.innerHTML =
      createPodiumCard(
        topThree[1],
        2
      ) +

      createPodiumCard(
        topThree[0],
        1
      ) +

      createPodiumCard(
        topThree[2],
        3
      );


    return;

  }


  container.innerHTML =
    topThree.map(
      (item, index) =>
        createPodiumCard(
          item,
          index + 1
        )
    ).join("");

}


/* =========================================================
   RENDER ALL RANKS

   Top 3 are already shown above,
   so normal list starts at Rank #4.
========================================================= */

function renderRankingList(
  ranking
) {

  const container =
    $("publicRankingList");


  if (!container) {
    return;
  }


  const remaining =
    ranking.slice(3);


  if (!ranking.length) {

    container.innerHTML = `
      <div class="empty">
        No volunteers available.
      </div>
    `;

    return;

  }


  if (!remaining.length) {

    container.innerHTML = `
      <div class="empty">
        Top volunteers are shown above.
      </div>
    `;

    return;

  }


  container.innerHTML =
    remaining.map(
      (item, index) => {

        /*
          index 0 here means
          public Rank #4.
        */

        const rank =
          index + 4;


        return createRankingRow(
          item,
          rank
        );

      }
    ).join("");

}


/* =========================================================
   VOLUNTEER COUNT
========================================================= */

function renderCount(
  ranking
) {

  const element =
    $("publicVolunteerRankingCount");


  if (!element) {
    return;
  }


  const count =
    ranking.length;


  element.textContent =
    `${count} ${
      count === 1
        ? "Volunteer"
        : "Volunteers"
    }`;

}


/* =========================================================
   MAIN RENDER
========================================================= */

function renderRanking(
  data
) {

  const ranking =
    buildRanking(
      data
    );


  renderCount(
    ranking
  );


  renderPodium(
    ranking
  );


  renderRankingList(
    ranking
  );

}


/* =========================================================
   FIREBASE LIVE RANKING

   Any points change automatically
   recalculates the ranking.
========================================================= */

onValue(
  ref(
    db,
    "volunteers"
  ),

  (snapshot) => {

    const data =
      snapshot.exists()
        ? snapshot.val()
        : {};


    renderRanking(
      data
    );

  },

  (error) => {

    console.error(
      "Public ranking error:",
      error
    );


    const podium =
      $("rankingPodium");


    const list =
      $("publicRankingList");


    if (podium) {

      podium.innerHTML = `
        <div class="empty">
          Unable to load ranking.
        </div>
      `;

    }


    if (list) {

      list.innerHTML = `
        <div class="empty">
          Please try again later.
        </div>
      `;

    }


    if (
      $("publicVolunteerRankingCount")
    ) {

      $("publicVolunteerRankingCount")
        .textContent =
        "0 Volunteers";

    }

  }
);


/* =========================================================
   READY
========================================================= */

console.log(
  "AAKASH EARTH public ranking ready."
);