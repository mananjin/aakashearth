/* =========================================================
   AAKASH EARTH
   OFFICIAL MEMBER / VOLUNTEER I-CARD
========================================================= */

import {
  db,
  ref,
  get
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

function objectToArray(data) {
  if (!data) return [];

  return Object.entries(data)
    .map(([key, value]) => ({
      key,
      ...(value || {})
    }));
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

function showError(message) {
  const status =
    $("idCardStatus");

  if (status) {
    status.textContent = message;
    status.className =
      "id-status error";
  }

  $("idCardArea")
    ?.classList.remove("show");
}

function showCard() {
  const status =
    $("idCardStatus");

  if (status) {
    status.style.display =
      "none";
  }

  $("idCardArea")
    ?.classList.add("show");
}


/* =========================================================
   URL PARAMETERS
========================================================= */

const params =
  new URLSearchParams(
    window.location.search
  );

const requestedType =
  normalize(
    params.get("type")
  );

const requestedId =
  clean(
    params.get("id")
  ).toUpperCase();


/* =========================================================
   FIND MEMBER
========================================================= */

async function findMember(id) {
  const snapshot =
    await get(
      ref(db, "members")
    );

  if (!snapshot.exists()) {
    return null;
  }

  const members =
    objectToArray(
      snapshot.val()
    );

  return (
    members.find(
      (member) =>
        normalize(
          member.memberId
        ) ===
        normalize(id)
    ) || null
  );
}


/* =========================================================
   FIND VOLUNTEER
========================================================= */

async function findVolunteer(id) {
  const snapshot =
    await get(
      ref(db, "volunteers")
    );

  if (!snapshot.exists()) {
    return null;
  }

  const volunteers =
    objectToArray(
      snapshot.val()
    );

  return (
    volunteers.find(
      (volunteer) =>
        normalize(
          volunteer.volunteerId
        ) ===
        normalize(id)
    ) || null
  );
}


/* =========================================================
   VALID STATUS
========================================================= */

function isValidRecord(
  person,
  type
) {
  if (!person) {
    return false;
  }

  const status =
    normalize(
      person.status
    );

  if (type === "member") {
    return status === "active";
  }

  if (type === "volunteer") {
    return status === "approved";
  }

  return false;
}


/* =========================================================
   PHOTO
========================================================= */

function renderPhoto(person) {
  const container =
    $("idCardPhoto");

  if (!container) return;

  container.innerHTML = "";

  const photo =
    safeImage(
      person.photoURL ||
      person.photoUrl ||
      person.photo ||
      ""
    );

  if (!photo) {
    renderPhotoInitial(person);
    return;
  }

  const image =
    document.createElement("img");

  image.src = photo;
  image.alt =
    person.name || "";

  image.addEventListener(
    "error",
    () => {
      renderPhotoInitial(
        person
      );
    },
    {
      once: true
    }
  );

  container.appendChild(
    image
  );
}

function renderPhotoInitial(
  person
) {
  const container =
    $("idCardPhoto");

  if (!container) return;

  container.innerHTML = "";

  const initial =
    clean(
      person.name || "A"
    )
      .charAt(0)
      .toUpperCase() || "A";

  container.textContent =
    initial;
}


/* =========================================================
   VERIFICATION URL
========================================================= */

function createVerificationURL(
  type,
  officialId
) {
  /*
    This creates an absolute URL.

    Example:
    https://username.github.io/repo/verify.html?type=member&id=...
  */

  const url =
    new URL(
      "verify.html",
      window.location.href
    );

  url.searchParams.set(
    "type",
    type
  );

  url.searchParams.set(
    "id",
    officialId
  );

  return url.href;
}


/* =========================================================
   QR CODE
========================================================= */

function createQRCode(
  verificationURL
) {
  const container =
    $("idCardQR");

  if (!container) return;

  container.innerHTML = "";

  /*
    QRCode library comes from
    id-card.html.

    If CDN is unavailable,
    fallback text is shown.
  */

  if (
    typeof window.QRCode !==
    "function"
  ) {
    container.textContent =
      "QR";

    return;
  }

  try {
    new window.QRCode(
      container,
      {
        text:
          verificationURL,

        width: 74,
        height: 74,

        correctLevel:
          window.QRCode
            .CorrectLevel
            .M
      }
    );

  } catch (error) {
    console.error(
      "QR generation error:",
      error
    );

    container.textContent =
      "QR";
  }
}


/* =========================================================
   COMMON CARD DATA
========================================================= */

function renderCommon(
  person,
  type,
  officialId
) {
  $("idCardName").textContent =
    person.name ||
    (
      type === "member"
        ? "Member"
        : "Volunteer"
    );

  $("idCardOfficialId")
    .textContent =
      officialId;

  $("idCardYear")
    .textContent =
      person.year || "—";

  renderPhoto(person);

  const verificationURL =
    createVerificationURL(
      type,
      officialId
    );

  createQRCode(
    verificationURL
  );

  const verificationLink =
    $("openVerificationLink");

  if (verificationLink) {
    verificationLink.href =
      verificationURL;
  }
}


/* =========================================================
   MEMBER CARD
========================================================= */

function renderMember(member) {
  const officialId =
    clean(
      member.memberId
    ).toUpperCase();

  $("idCardType").textContent =
    "OFFICIAL MEMBER";

  $("idCardStatusText")
    .textContent =
      "ACTIVE";

  $("idCardRoleLabel")
    .textContent =
      "POSITION";

  $("idCardRole")
    .textContent =
      member.position ||
      "Member";

  $("idCardExtraLabel")
    .textContent =
      "MEMBERSHIP";

  $("idCardExtra")
    .textContent =
      "Verified Member";

  $("idCardFooterType")
    .textContent =
      "MEMBER";

  renderCommon(
    member,
    "member",
    officialId
  );
}


/* =========================================================
   VOLUNTEER CARD
========================================================= */

function renderVolunteer(
  volunteer
) {
  const officialId =
    clean(
      volunteer.volunteerId
    ).toUpperCase();

  $("idCardType").textContent =
    "OFFICIAL VOLUNTEER";

  $("idCardStatusText")
    .textContent =
      "APPROVED";

  $("idCardRoleLabel")
    .textContent =
      "AREA";

  $("idCardRole")
    .textContent =
      volunteer.area ||
      "Volunteer";

  $("idCardExtraLabel")
    .textContent =
      "VOLUNTEER STATUS";

  $("idCardExtra")
    .textContent =
      "Official Volunteer";

  $("idCardFooterType")
    .textContent =
      "VOLUNTEER";

  renderCommon(
    volunteer,
    "volunteer",
    officialId
  );
}


/* =========================================================
   PRINT
========================================================= */

$("printIdCard")
  ?.addEventListener(
    "click",
    () => {
      window.print();
    }
  );


/* =========================================================
   LOAD CARD
========================================================= */

async function loadIdCard() {
  if (
    !["member", "volunteer"]
      .includes(requestedType)
  ) {
    showError(
      "Invalid I-Card type. Please open the card from the Member or Volunteer dashboard."
    );

    return;
  }

  if (!requestedId) {
    showError(
      "Official ID is missing. Please open the I-Card again from the dashboard."
    );

    return;
  }


  /*
    Basic ID format protection
  */

  if (
    requestedType === "member" &&
    !requestedId.startsWith(
      "AE-MEM-"
    )
  ) {
    showError(
      "Invalid Member ID."
    );

    return;
  }

  if (
    requestedType ===
      "volunteer" &&
    !requestedId.startsWith(
      "AE-VOL-"
    )
  ) {
    showError(
      "Invalid Volunteer ID."
    );

    return;
  }


  try {
    let person = null;

    if (
      requestedType ===
      "member"
    ) {
      person =
        await findMember(
          requestedId
        );
    } else {
      person =
        await findVolunteer(
          requestedId
        );
    }


    /*
      Record not found
    */

    if (!person) {
      showError(
        "No official AAKASH EARTH record was found for this ID."
      );

      return;
    }


    /*
      Only active Member /
      approved Volunteer cards
      can be displayed publicly.
    */

    if (
      !isValidRecord(
        person,
        requestedType
      )
    ) {
      showError(
        requestedType ===
          "member"
          ? "This Member ID is currently inactive. The official I-Card cannot be displayed."
          : "This Volunteer ID is not currently approved. The official I-Card cannot be displayed."
      );

      return;
    }


    /*
      Render correct card
    */

    if (
      requestedType ===
      "member"
    ) {
      renderMember(person);
    } else {
      renderVolunteer(person);
    }

    showCard();

  } catch (error) {
    console.error(
      "I-Card load error:",
      error
    );

    showError(
      "Unable to load the I-Card. Please check the Firebase Database connection and try again."
    );
  }
}


/* =========================================================
   START
========================================================= */

loadIdCard();

console.log(
  "AAKASH EARTH Official I-Card connected."
);