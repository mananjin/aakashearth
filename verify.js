/* =========================================================
   AAKASH EARTH
   PUBLIC MEMBER / VOLUNTEER VERIFICATION
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

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];

function clean(value = "") {
  return String(value).trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase();
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

function objectToArray(data) {
  if (!data) return [];

  return Object.entries(data)
    .map(([key, value]) => ({
      key,
      ...(value || {})
    }));
}

function formatStatus(value = "") {
  const status = normalize(value);

  const labels = {
    active: "Active",
    approved: "Approved",
    inactive: "Inactive",
    pending: "Pending",
    rejected: "Rejected"
  };

  return (
    labels[status] ||
    clean(value)
      .replaceAll("_", " ")
  );
}

function showMessage(
  message,
  type = "error"
) {
  const box =
    $("verifyMessage");

  if (!box) return;

  box.textContent = message;

  box.className =
    `verify-message show ${type}`;
}

function clearMessage() {
  const box =
    $("verifyMessage");

  if (!box) return;

  box.textContent = "";

  box.className =
    "verify-message";
}

function hideResult() {
  $("verifyResult")
    ?.classList.remove("show");
}


/* =========================================================
   STATE
========================================================= */

let verifyType = "member";


/* =========================================================
   TYPE SELECTOR
========================================================= */

function setVerifyType(type) {
  if (
    !["member", "volunteer"]
      .includes(type)
  ) {
    return;
  }

  verifyType = type;

  $$("[data-verify-type]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.verifyType ===
          type
      );
    });

  const input =
    $("verifyId");

  const label =
    $("verifyIdLabel");

  if (type === "member") {
    if (label) {
      label.textContent =
        "MEMBER ID";
    }

    if (input) {
      input.placeholder =
        "AE-MEM-2026-XXXXXX";
    }
  } else {
    if (label) {
      label.textContent =
        "VOLUNTEER ID";
    }

    if (input) {
      input.placeholder =
        "AE-VOL-2026-XXXXXX";
    }
  }

  clearMessage();
  hideResult();

  if (input) {
    input.value = "";
    input.focus();
  }
}


$$("[data-verify-type]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        setVerifyType(
          button.dataset.verifyType
        );
      }
    );
  });


/* =========================================================
   ID INPUT
========================================================= */

$("verifyId")
  ?.addEventListener(
    "input",
    (event) => {
      /*
        Keep official IDs clean:
        AE-MEM-2026-XXXXXX
        AE-VOL-2026-XXXXXX
      */

      event.target.value =
        String(event.target.value)
          .toUpperCase()
          .replace(
            /[^A-Z0-9-]/g,
            ""
          )
          .slice(0, 40);

      clearMessage();
      hideResult();
    }
  );


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
        normalize(member.memberId) ===
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
   VERIFY STATUS
========================================================= */

function isValidPublicRecord(
  person,
  type
) {
  if (!person) return false;

  const status =
    normalize(person.status);

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
    $("verifiedPhoto");

  if (!container) return;

  const photo =
    safeImage(
      person.photoURL ||
      person.photoUrl ||
      person.photo ||
      ""
    );

  if (photo) {
    container.innerHTML = "";

    const image =
      document.createElement("img");

    image.src = photo;
    image.alt = "";

    image.addEventListener(
      "error",
      () => {
        renderInitialPhoto(
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

    return;
  }

  renderInitialPhoto(person);
}

function renderInitialPhoto(person) {
  const container =
    $("verifiedPhoto");

  if (!container) return;

  container.innerHTML = "";

  const initial =
    clean(person.name || "AE")
      .charAt(0)
      .toUpperCase() || "A";

  container.textContent =
    initial;
}


/* =========================================================
   RENDER VERIFIED MEMBER
========================================================= */

function renderMember(member) {
  $("verifiedPersonType").textContent =
    "MEMBER";

  $("verifiedName").textContent =
    member.name || "Member";

  $("verifiedId").textContent =
    member.memberId || "—";

  $("verifiedStatus").textContent =
    formatStatus(
      member.status
    ) || "Active";

  $("verifiedRoleLabel").textContent =
    "POSITION";

  $("verifiedRole").textContent =
    member.position ||
    "Member";

  $("verifiedYear").textContent =
    member.year || "—";

  $("verifiedExtraLabel").textContent =
    "MEMBERSHIP";

  $("verifiedExtra").textContent =
    "Verified Member";

  renderPhoto(member);

  const cardLink =
    $("verifiedIdCardLink");

  if (cardLink) {
    cardLink.href =
      `id-card.html?type=member&id=${encodeURIComponent(
        member.memberId || ""
      )}`;
  }
}


/* =========================================================
   RENDER VERIFIED VOLUNTEER
========================================================= */

function renderVolunteer(
  volunteer
) {
  $("verifiedPersonType").textContent =
    "VOLUNTEER";

  $("verifiedName").textContent =
    volunteer.name ||
    "Volunteer";

  $("verifiedId").textContent =
    volunteer.volunteerId ||
    "—";

  $("verifiedStatus").textContent =
    formatStatus(
      volunteer.status
    ) || "Approved";

  $("verifiedRoleLabel").textContent =
    "AREA";

  $("verifiedRole").textContent =
    volunteer.area ||
    "Volunteer";

  $("verifiedYear").textContent =
    volunteer.year || "—";

  $("verifiedExtraLabel").textContent =
    "VOLUNTEER STATUS";

  $("verifiedExtra").textContent =
    "Official Volunteer";

  renderPhoto(volunteer);

  const cardLink =
    $("verifiedIdCardLink");

  if (cardLink) {
    cardLink.href =
      `id-card.html?type=volunteer&id=${encodeURIComponent(
        volunteer.volunteerId ||
        ""
      )}`;
  }
}


/* =========================================================
   VERIFY FORM
========================================================= */

$("verifyForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearMessage();
      hideResult();

      const input =
        $("verifyId");

      const button =
        $("verifyButton");

      const enteredId =
        clean(
          input?.value
        ).toUpperCase();

      if (!enteredId) {
        showMessage(
          `Please enter ${
            verifyType === "member"
              ? "Member"
              : "Volunteer"
          } ID.`,
          "error"
        );

        return;
      }

      /*
        Basic format check.

        IDs generated by our system:
        AE-MEM-YEAR-CODE
        AE-VOL-YEAR-CODE
      */

      if (
        verifyType === "member" &&
        !enteredId.startsWith(
          "AE-MEM-"
        )
      ) {
        showMessage(
          "Please enter a valid Member ID beginning with AE-MEM-.",
          "error"
        );

        return;
      }

      if (
        verifyType === "volunteer" &&
        !enteredId.startsWith(
          "AE-VOL-"
        )
      ) {
        showMessage(
          "Please enter a valid Volunteer ID beginning with AE-VOL-.",
          "error"
        );

        return;
      }

      try {
        if (button) {
          button.disabled = true;

          button.textContent =
            "Checking Official Record...";
        }

        let person = null;

        if (
          verifyType === "member"
        ) {
          person =
            await findMember(
              enteredId
            );
        } else {
          person =
            await findVolunteer(
              enteredId
            );
        }

        if (!person) {
          showMessage(
            "No official record found for this ID. Please check the ID and try again.",
            "error"
          );

          return;
        }

        /*
          Record exists but is not
          publicly valid.
        */

        if (
          !isValidPublicRecord(
            person,
            verifyType
          )
        ) {
          const status =
            formatStatus(
              person.status
            );

          showMessage(
            `This ID exists, but its current status is "${status || "Not Active"}". It cannot be shown as a verified active record.`,
            "error"
          );

          return;
        }

        if (
          verifyType === "member"
        ) {
          renderMember(person);
        } else {
          renderVolunteer(person);
        }

        $("verifyResult")
          ?.classList.add(
            "show"
          );

        /*
          Keep URL shareable.

          Example:
          verify.html?type=member&id=AE-MEM-...
        */

        const url =
          new URL(
            window.location.href
          );

        url.searchParams.set(
          "type",
          verifyType
        );

        url.searchParams.set(
          "id",
          enteredId
        );

        window.history.replaceState(
          {},
          "",
          url
        );

        setTimeout(() => {
          $("verifyResult")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "nearest"
            });
        }, 100);

      } catch (error) {
        console.error(
          "Verification error:",
          error
        );

        showMessage(
          "Unable to verify the record right now. Please check Firebase Database connection and try again.",
          "error"
        );

      } finally {
        if (button) {
          button.disabled = false;

          button.textContent =
            "Verify Official Record →";
        }
      }
    }
  );


/* =========================================================
   AUTO VERIFY FROM URL

   Supports QR / direct links:

   verify.html?type=member&id=AE-MEM-2026-XXXXXX

   verify.html?type=volunteer&id=AE-VOL-2026-XXXXXX
========================================================= */

async function autoVerifyFromURL() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const type =
    normalize(
      params.get("type")
    );

  const id =
    clean(
      params.get("id")
    ).toUpperCase();

  if (
    !["member", "volunteer"]
      .includes(type)
  ) {
    return;
  }

  verifyType = type;

  $$("[data-verify-type]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.verifyType ===
          type
      );
    });

  if (type === "member") {
    if ($("verifyIdLabel")) {
      $("verifyIdLabel")
        .textContent =
          "MEMBER ID";
    }

    if ($("verifyId")) {
      $("verifyId")
        .placeholder =
          "AE-MEM-2026-XXXXXX";
    }
  } else {
    if ($("verifyIdLabel")) {
      $("verifyIdLabel")
        .textContent =
          "VOLUNTEER ID";
    }

    if ($("verifyId")) {
      $("verifyId")
        .placeholder =
          "AE-VOL-2026-XXXXXX";
    }
  }

  if (!id) {
    return;
  }

  if ($("verifyId")) {
    $("verifyId").value =
      id;
  }

  /*
    Submit automatically.
    Useful when QR code opens
    the verification URL.
  */

  $("verifyForm")
    ?.requestSubmit();
}


/* =========================================================
   START
========================================================= */

autoVerifyFromURL();

console.log(
  "AAKASH EARTH Public Verification connected."
);