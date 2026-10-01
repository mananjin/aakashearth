/* =========================================================
   AAKASH EARTH
   MEMBER PORTAL
   Complete replacement: member.js
========================================================= */

import {
  db,
  ref,
  get,
  update,
  onValue
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const clean = (value) =>
  String(value ?? "").trim();

const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const withTimeout = (
  promise,
  milliseconds = 15000,
  message = "Request timed out."
) => {

  let timer;

  const timeout =
    new Promise((_, reject) => {

      timer = setTimeout(
        () => reject(
          new Error(message)
        ),
        milliseconds
      );

    });

  return Promise.race([
    promise,
    timeout
  ]).finally(() => {

    clearTimeout(timer);

  });

};


function formatDateTime(value) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );

}


function showMessage(
  message = "",
  error = false
) {

  const element =
    $("memberFormMessage");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.style.color =
    error
      ? "#a0443e"
      : "#876313";

}


/* =========================================================
   SESSION
========================================================= */

function getSession() {

  try {

    return JSON.parse(
      sessionStorage.getItem(
        "aePortalSession"
      ) || "null"
    );

  } catch {

    return null;

  }

}


const session =
  getSession();


if (
  !session ||
  session.loggedIn !== true ||
  session.role !== "member" ||
  !clean(session.recordKey)
) {

  window.location.replace(
    "login.html"
  );

  throw new Error(
    "Member login required."
  );

}


const memberKey =
  clean(
    session.recordKey
  );


const memberRef =
  ref(
    db,
    `members/${memberKey}`
  );


/* =========================================================
   STATE
========================================================= */

let currentMember = null;


/* =========================================================
   CURRENT YEAR
========================================================= */

if ($("memberCurrentYear")) {

  $("memberCurrentYear")
    .textContent =
    new Date().getFullYear();

}


/* =========================================================
   LOGOUT
========================================================= */

$("memberLogoutBtn")
  ?.addEventListener(
    "click",
    () => {

      [
        "aePortalSession",
        "aeLoggedIn",
        "aeRole",
        "aeUserId",
        "aeRecordKey"
      ].forEach(
        (key) => {

          sessionStorage.removeItem(
            key
          );

        }
      );


      window.location.replace(
        "login.html"
      );

    }
  );


/* =========================================================
   MEMBER LIVE PROFILE
========================================================= */

onValue(
  memberRef,

  (snapshot) => {

    if (
      !snapshot.exists()
    ) {

      alert(
        "Member account was not found."
      );

      logoutMember();

      return;

    }


    currentMember =
      snapshot.val();


    if (
      isAccountDisabled(
        currentMember
      )
    ) {

      alert(
        "Your member account is currently inactive."
      );

      logoutMember();

      return;

    }


    renderMember(
      currentMember
    );

  },

  (error) => {

    console.error(
      "Member profile error:",
      error
    );

    showMessage(
      "Unable to load your profile.",
      true
    );

  }
);


/* =========================================================
   ACCOUNT STATUS
========================================================= */

function isAccountDisabled(member) {

  if (
    member?.active === false
  ) {
    return true;
  }


  const status =
    clean(
      member?.status
    ).toLowerCase();


  return [
    "inactive",
    "disabled",
    "blocked",
    "suspended",
    "rejected"
  ].includes(status);

}


/* =========================================================
   RENDER MEMBER
========================================================= */

function renderMember(member) {

  const memberId =
    clean(
      member.memberId ??
      member.memberID ??
      member.userId ??
      member.id ??
      session.userId
    ) || "—";


  const name =
    clean(
      member.name ??
      member.fullName ??
      member.memberName
    ) || "Member";


  const status =
    clean(
      member.status
    ) || "active";


  const year =
    clean(
      member.year
    ) || "—";


  const mobile =
    clean(
      member.mobile ??
      member.mobileNumber
    );


  const email =
    clean(
      member.email
    );


  const photo =
    clean(
      member.photoURL ??
      member.imageURL ??
      member.photo ??
      member.image
    );


  /* HERO */

  setText(
    "heroMemberName",
    name
  );

  setText(
    "heroMemberId",
    memberId
  );


  /* STATS */

  setText(
    "memberStatusStat",
    status
  );

  setText(
    "memberYearStat",
    year
  );


  /* PROFILE */

  setText(
    "profileMemberName",
    name
  );

  setText(
    "profileMemberId",
    memberId
  );

  setText(
    "detailMemberId",
    memberId
  );

  setText(
    "detailMemberName",
    name
  );

  setText(
    "detailMemberStatus",
    status
  );

  setText(
    "detailMemberYear",
    year
  );

  setText(
    "detailMemberMobile",
    mobile || "Not added"
  );

  setText(
    "detailMemberEmail",
    email || "Not added"
  );


  /* STATUS BADGE */

  const statusBadge =
    $("memberStatusBadge");

  if (statusBadge) {

    statusBadge.textContent =
      status.toUpperCase();

  }


  /* EDITABLE FIELDS */

  if ($("editMemberMobile")) {

    $("editMemberMobile").value =
      mobile;

  }


  if ($("editMemberEmail")) {

    $("editMemberEmail").value =
      email;

  }


  /*
    Never display existing password
    inside the password input.
  */

  if ($("editMemberPassword")) {

    $("editMemberPassword").value =
      "";

  }


  /* PROFILE PHOTO */

  renderPhoto(
    photo,
    name,
    "memberPhoto",
    "memberPhotoInitial",
    "memberPhotoBox"
  );


  /* ID CARD */

  setText(
    "idMemberName",
    name
  );

  setText(
    "idMemberId",
    memberId
  );

  setText(
    "idMemberStatus",
    status
  );

  setText(
    "idMemberYear",
    year
  );

  setText(
    "idMemberMobile",
    mobile || "—"
  );


  renderPhoto(
    photo,
    name,
    "idMemberPhoto",
    "idMemberInitial",
    "idMemberPhotoBox"
  );


  /* VERIFY LINK */

  setupVerifyLink(
    memberId,
    memberKey
  );


  /* RECEIPTS */

  loadReceiptCount(
    memberId,
    memberKey,
    mobile
  );


  /* ACTIVITY */

  loadMemberActivity(
    memberId,
    memberKey
  );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
  id,
  value
) {

  const element =
    $(id);

  if (!element) {
    return;
  }

  element.textContent =
    clean(value) || "—";

}


/* =========================================================
   MEMBER PHOTO

   Member cannot upload/change photo here.
   Existing admin-provided photo only.
========================================================= */

function renderPhoto(
  photoURL,
  name,
  imageId,
  initialId,
  boxId
) {

  const image =
    $(imageId);

  const initial =
    $(initialId);

  const box =
    $(boxId);


  const firstLetter =
    clean(name)
      .charAt(0)
      .toUpperCase() || "M";


  if (initial) {

    initial.textContent =
      firstLetter;

  }


  if (
    photoURL &&
    image
  ) {

    image.src =
      photoURL;

    image.alt =
      `${name} photo`;

    image.hidden =
      false;


    if (initial) {

      initial.hidden =
        true;

    }


    image.onerror =
      () => {

        image.hidden =
          true;

        if (initial) {

          initial.hidden =
            false;

        }

      };


    return;

  }


  if (image) {

    image.hidden =
      true;

    image.removeAttribute(
      "src"
    );

  }


  if (initial) {

    initial.hidden =
      false;

  }


  if (box) {

    box.setAttribute(
      "data-has-photo",
      photoURL
        ? "true"
        : "false"
    );

  }

}


/* =========================================================
   EDIT MEMBER PROFILE

   MEMBER CAN CHANGE ONLY:
   - Mobile
   - Email
   - Password
========================================================= */

$("memberEditForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (!currentMember) {

        showMessage(
          "Profile is still loading.",
          true
        );

        return;

      }


      const button =
        $("memberSaveBtn");


      const mobile =
        clean(
          $("editMemberMobile")
            ?.value
        );


      const email =
        clean(
          $("editMemberEmail")
            ?.value
        );


      const newPassword =
        clean(
          $("editMemberPassword")
            ?.value
        );


      /* MOBILE VALIDATION */

      if (
        mobile &&
        !/^[0-9+\-\s]{7,15}$/.test(
          mobile
        )
      ) {

        showMessage(
          "Please enter a valid mobile number.",
          true
        );

        return;

      }


      /* EMAIL VALIDATION */

      if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {

        showMessage(
          "Please enter a valid email address.",
          true
        );

        return;

      }


      /* PASSWORD VALIDATION */

      if (
        newPassword &&
        newPassword.length < 6
      ) {

        showMessage(
          "New password must contain at least 6 characters.",
          true
        );

        return;

      }


      const updates = {

        mobile,
        email,

        updatedAt:
          Date.now()

      };


      /*
        Password changes only if
        member entered a new password.
      */

      if (newPassword) {

        updates.password =
          newPassword;

      }


      try {

        if (button) {

          button.disabled =
            true;

          button.textContent =
            "SAVING...";

        }


        showMessage(
          "Saving changes..."
        );


        await withTimeout(
          update(
            memberRef,
            updates
          ),
          15000,
          "Profile update timed out."
        );


        if (
          $("editMemberPassword")
        ) {

          $("editMemberPassword").value =
            "";

        }


        showMessage(
          "Profile updated successfully."
        );


      } catch (error) {

        console.error(
          "Member update error:",
          error
        );


        showMessage(
          error?.message ||
          "Unable to update profile.",
          true
        );


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "SAVE CHANGES";

        }

      }

    }
  );


/* =========================================================
   VERIFY LINK
========================================================= */

function setupVerifyLink(
  memberId,
  recordKey
) {

  const verifyURL =
    `verify.html?type=member&key=${encodeURIComponent(
      recordKey
    )}&id=${encodeURIComponent(
      memberId
    )}`;


  const link =
    $("memberVerifyLink");


  if (link) {

    link.href =
      verifyURL;

  }


  const openButton =
    $("openVerifyPage");


  if (openButton) {

    openButton.onclick =
      () => {

        window.location.href =
          verifyURL;

      };

  }

}


/* =========================================================
   PRINT MEMBER ID CARD
========================================================= */

$("printMemberIdBtn")
  ?.addEventListener(
    "click",
    () => {

      window.print();

    }
  );


/* =========================================================
   RECEIPT COUNT

   Supports common receipt structures.
========================================================= */

async function loadReceiptCount(
  memberId,
  recordKey,
  mobile
) {

  const element =
    $("memberReceiptCount");

  if (!element) {
    return;
  }


  element.textContent =
    "0";


  try {

    const snapshot =
      await withTimeout(
        get(
          ref(
            db,
            "receipts"
          )
        ),
        12000,
        "Receipt loading timed out."
      );


    if (
      !snapshot.exists()
    ) {

      element.textContent =
        "0";

      return;

    }


    const receipts =
      snapshot.val() || {};


    let count = 0;


    Object.values(
      receipts
    ).forEach(
      (receipt) => {

        if (
          !receipt ||
          typeof receipt !== "object"
        ) {
          return;
        }


        const receiptMemberId =
          clean(
            receipt.memberId ??
            receipt.userId
          ).toUpperCase();


        const receiptMemberKey =
          clean(
            receipt.memberKey ??
            receipt.createdByKey ??
            receipt.recordKey
          );


        const receiptMobile =
          clean(
            receipt.mobile ??
            receipt.memberMobile
          );


        if (
          (
            receiptMemberId &&
            receiptMemberId ===
            memberId.toUpperCase()
          ) ||
          (
            receiptMemberKey &&
            receiptMemberKey ===
            recordKey
          ) ||
          (
            mobile &&
            receiptMobile &&
            receiptMobile === mobile
          )
        ) {

          count++;

        }

      }
    );


    element.textContent =
      String(count);


  } catch (error) {

    console.warn(
      "Receipt count error:",
      error
    );

    element.textContent =
      "0";

  }

}


/* =========================================================
   MEMBER ACTIVITY
========================================================= */

async function loadMemberActivity(
  memberId,
  recordKey
) {

  const container =
    $("memberActivityList");

  if (!container) {
    return;
  }


  container.innerHTML =
    `<div class="activity-empty">
       Loading activity...
     </div>`;


  try {

    const snapshot =
      await withTimeout(
        get(
          ref(
            db,
            "loginActivity"
          )
        ),
        12000,
        "Activity loading timed out."
      );


    if (
      !snapshot.exists()
    ) {

      renderEmptyActivity();

      return;

    }


    const data =
      snapshot.val() || {};


    const activities =
      Object.values(
        data
      )
        .filter(
          (activity) => {

            if (
              !activity ||
              activity.role !== "member"
            ) {
              return false;
            }


            const sameId =
              clean(
                activity.userId
              ).toUpperCase() ===
              memberId.toUpperCase();


            const sameKey =
              clean(
                activity.recordKey
              ) ===
              recordKey;


            return (
              sameId ||
              sameKey
            );

          }
        )
        .sort(
          (a, b) =>
            Number(
              b.timestamp || 0
            ) -
            Number(
              a.timestamp || 0
            )
        )
        .slice(
          0,
          10
        );


    if (
      !activities.length
    ) {

      renderEmptyActivity();

      return;

    }


    container.innerHTML =
      activities.map(
        (activity) => `
          <div class="member-activity-item">

            <div class="activity-dot"></div>

            <div>

              <strong>
                Portal Login
              </strong>

              <span>
                ${escapeHTML(
                  formatDateTime(
                    activity.timestamp
                  )
                )}
              </span>

            </div>

          </div>
        `
      ).join("");


  } catch (error) {

    console.warn(
      "Member activity error:",
      error
    );

    renderEmptyActivity();

  }

}


function renderEmptyActivity() {

  const container =
    $("memberActivityList");

  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="activity-empty">
      No recent activity available.
    </div>
  `;

}


/* =========================================================
   LOGOUT HELPER
========================================================= */

function logoutMember() {

  [
    "aePortalSession",
    "aeLoggedIn",
    "aeRole",
    "aeUserId",
    "aeRecordKey"
  ].forEach(
    (key) => {

      sessionStorage.removeItem(
        key
      );

    }
  );


  setTimeout(
    () => {

      window.location.replace(
        "login.html"
      );

    },
    300
  );

}


/* =========================================================
   SECURITY

   Important:
   This frontend prevents member UI from
   editing protected fields such as:
   - Member ID
   - Name
   - Status
   - Year
   - Photo

   Real database-level protection requires
   Firebase security rules / authentication.
========================================================= */

console.log(
  "AAKASH EARTH Member Portal ready."
);