/* =========================================================
   AAKASH EARTH
   PUBLIC ID VERIFICATION
   Complete replacement: verify.js
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


const clean = (value) =>
  String(value ?? "").trim();


const normalizeId = (value) =>
  clean(value).toLowerCase();


const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");


function withTimeout(
  promise,
  milliseconds = 15000
) {

  let timer;

  const timeout =
    new Promise(
      (_, reject) => {

        timer =
          setTimeout(
            () => {

              reject(
                new Error(
                  "Verification timed out."
                )
              );

            },
            milliseconds
          );

      }
    );


  return Promise.race([
    promise,
    timeout
  ]).finally(() => {

    clearTimeout(timer);

  });

}


/* =========================================================
   YEAR
========================================================= */

if ($("verifyCurrentYear")) {

  $("verifyCurrentYear")
    .textContent =
    new Date().getFullYear();

}


/* =========================================================
   FIELD HELPERS
========================================================= */

function getName(
  record,
  type
) {

  if (type === "member") {

    return clean(
      record.name ??
      record.fullName ??
      record.memberName
    ) || "Member";

  }


  return clean(
    record.name ??
    record.fullName ??
    record.volunteerName
  ) || "Volunteer";

}


function getPublicId(
  record,
  type
) {

  if (type === "member") {

    return clean(
      record.memberId ??
      record.memberID ??
      record.userId ??
      record.id
    );

  }


  return clean(
    record.volunteerId ??
    record.volunteerID ??
    record.userId ??
    record.id
  );

}


function getPhoto(
  record
) {

  return clean(
    record.photoURL ??
    record.imageURL ??
    record.photo ??
    record.image
  );

}


function getStatus(
  record
) {

  return clean(
    record.status
  ) || "active";

}


/* =========================================================
   VALID ACCOUNT
========================================================= */

function isValidAccount(
  record
) {

  if (
    !record ||
    typeof record !== "object"
  ) {

    return false;

  }


  if (
    record.active === false
  ) {

    return false;

  }


  const status =
    getStatus(record)
      .toLowerCase();


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
   MESSAGE
========================================================= */

function showMessage(
  message = "",
  error = false
) {

  const element =
    $("verifyMessage");


  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.style.color =
    error
      ? "#9a3e38"
      : "#795b18";

}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
  loading
) {

  const button =
    $("verifySubmitBtn");


  if (!button) {
    return;
  }


  button.disabled =
    loading;


  button.textContent =
    loading
      ? "VERIFYING..."
      : "VERIFY ID";

}


/* =========================================================
   FIND ACCOUNT

   First:
   direct Firebase key lookup

   Then:
   search account collection by ID
========================================================= */

async function findAccount(
  type,
  requestedId,
  recordKey = ""
) {

  const collection =
    type === "member"
      ? "members"
      : "volunteers";


  /*
    If verification link contains
    the exact Firebase record key,
    check that record first.
  */

  if (recordKey) {

    try {

      const snapshot =
        await withTimeout(
          get(
            ref(
              db,
              `${collection}/${recordKey}`
            )
          )
        );


      if (snapshot.exists()) {

        const record =
          snapshot.val();


        const recordId =
          getPublicId(
            record,
            type
          );


        /*
          If URL also contains ID,
          make sure it matches the record.
        */

        if (
          !requestedId ||
          normalizeId(recordId) ===
          normalizeId(requestedId)
        ) {

          return {
            key: recordKey,
            record
          };

        }

      }

    } catch (error) {

      console.warn(
        "Direct record verification failed:",
        error
      );

    }

  }


  /*
    Try requested ID as Firebase key.
  */

  if (requestedId) {

    try {

      const directSnapshot =
        await withTimeout(
          get(
            ref(
              db,
              `${collection}/${requestedId}`
            )
          )
        );


      if (
        directSnapshot.exists()
      ) {

        const record =
          directSnapshot.val();


        const actualId =
          getPublicId(
            record,
            type
          );


        if (
          normalizeId(actualId) ===
          normalizeId(requestedId) ||
          !actualId
        ) {

          return {
            key: requestedId,
            record
          };

        }

      }

    } catch (error) {

      console.warn(
        "Direct ID lookup failed:",
        error
      );

    }

  }


  /*
    Search full collection.
  */

  const snapshot =
    await withTimeout(
      get(
        ref(
          db,
          collection
        )
      )
    );


  if (!snapshot.exists()) {

    return null;

  }


  const data =
    snapshot.val() || {};


  const wantedId =
    normalizeId(
      requestedId
    );


  for (
    const [key, record]
    of Object.entries(data)
  ) {

    if (
      !record ||
      typeof record !== "object"
    ) {
      continue;
    }


    const recordId =
      normalizeId(
        getPublicId(
          record,
          type
        )
      );


    if (
      recordId &&
      recordId === wantedId
    ) {

      return {
        key,
        record
      };

    }

  }


  return null;

}


/* =========================================================
   PHOTO
========================================================= */

function createPhotoHTML(
  record,
  type
) {

  const name =
    getName(
      record,
      type
    );


  const initial =
    name.charAt(0)
      .toUpperCase() ||
    "A";


  const photo =
    getPhoto(
      record
    );


  if (!photo) {

    return `
      <div class="profile-photo">
        <span>
          ${escapeHTML(initial)}
        </span>
      </div>
    `;

  }


  return `
    <div class="profile-photo">

      <span>
        ${escapeHTML(initial)}
      </span>

      <img
        src="${escapeHTML(photo)}"
        alt="${escapeHTML(name)}"
        loading="lazy"
        decoding="async"
        onerror="this.style.display='none';"
      >

    </div>
  `;

}


/* =========================================================
   VERIFIED RESULT
========================================================= */

function showVerified(
  type,
  record
) {

  const result =
    $("verifyResult");


  if (!result) {
    return;
  }


  const name =
    getName(
      record,
      type
    );


  const id =
    getPublicId(
      record,
      type
    ) || "—";


  const status =
    getStatus(
      record
    );


  const accountType =
    type === "member"
      ? "MEMBER"
      : "VOLUNTEER";


  /*
    Public verification deliberately
    does NOT display:

    - Password
    - Mobile number
    - Email
    - Volunteer points
    - Volunteer ranking calculation data
  */


  let extraDetail = "";


  if (type === "member") {

    const year =
      clean(
        record.year ??
        record.memberYear
      );


    if (year) {

      extraDetail = `
        <div class="detail-box">

          <span>
            YEAR
          </span>

          <strong>
            ${escapeHTML(year)}
          </strong>

        </div>
      `;

    }

  }


  result.innerHTML = `
    <article class="verified-card">

      <div class="verified-top">

        <span class="verified-badge">
          ✓ OFFICIALLY VERIFIED
        </span>

      </div>


      <div class="verified-body">

        ${createPhotoHTML(
          record,
          type
        )}


        <h3>
          ${escapeHTML(name)}
        </h3>


        <span class="verified-type">
          ${accountType}
        </span>


        <div class="verified-details">

          <div class="detail-box">

            <span>
              ${accountType} ID
            </span>

            <strong>
              ${escapeHTML(id)}
            </strong>

          </div>


          <div class="detail-box">

            <span>
              ACCOUNT TYPE
            </span>

            <strong>
              ${accountType}
            </strong>

          </div>


          <div class="detail-box">

            <span>
              STATUS
            </span>

            <strong>
              ${escapeHTML(
                status.toUpperCase()
              )}
            </strong>

          </div>


          ${extraDetail}

        </div>


        <div class="verification-note">
          This ID was found in the official
          AAKASH EARTH database and is currently
          recognised by the verification system.
        </div>

      </div>

    </article>
  `;

}


/* =========================================================
   NOT FOUND
========================================================= */

function showNotFound() {

  const result =
    $("verifyResult");


  if (!result) {
    return;
  }


  result.innerHTML = `
    <div class="not-found">

      <div class="not-found-icon">
        !
      </div>

      <h3>
        ID Not Verified
      </h3>

      <p>
        The ID could not be verified.
        Please check the account type and
        ID, then try again.
      </p>

    </div>
  `;

}


/* =========================================================
   ERROR
========================================================= */

function showVerificationError() {

  const result =
    $("verifyResult");


  if (!result) {
    return;
  }


  result.innerHTML = `
    <div class="not-found">

      <div class="not-found-icon">
        !
      </div>

      <h3>
        Verification Unavailable
      </h3>

      <p>
        We could not connect to the verification
        database. Please try again.
      </p>

    </div>
  `;

}


/* =========================================================
   VERIFY
========================================================= */

async function verifyAccount(
  type,
  requestedId,
  recordKey = ""
) {

  const id =
    clean(
      requestedId
    );


  if (
    type !== "member" &&
    type !== "volunteer"
  ) {

    showMessage(
      "Please select a valid account type.",
      true
    );

    return;

  }


  if (!id && !recordKey) {

    showMessage(
      "Please enter an ID.",
      true
    );

    return;

  }


  try {

    setLoading(true);


    showMessage(
      "Checking official record..."
    );


    const found =
      await findAccount(
        type,
        id,
        recordKey
      );


    if (!found) {

      showMessage(
        "ID not found.",
        true
      );

      showNotFound();

      return;

    }


    if (
      !isValidAccount(
        found.record
      )
    ) {

      showMessage(
        "This account is not currently active.",
        true
      );

      showNotFound();

      return;

    }


    showMessage(
      "ID successfully verified."
    );


    showVerified(
      type,
      found.record
    );


    /*
      Update browser URL without
      reloading the page.

      Do not expose Firebase key
      when user manually searches.
    */

    const publicId =
      getPublicId(
        found.record,
        type
      );


    if (publicId) {

      const params =
        new URLSearchParams();


      params.set(
        "type",
        type
      );


      params.set(
        "id",
        publicId
      );


      const newUrl =
        `${window.location.pathname}?${params.toString()}`;


      window.history.replaceState(
        {},
        "",
        newUrl
      );

    }


  } catch (error) {

    console.error(
      "Verification error:",
      error
    );


    showMessage(
      "Unable to verify ID. Please try again.",
      true
    );


    showVerificationError();


  } finally {

    setLoading(false);

  }

}


/* =========================================================
   MANUAL FORM
========================================================= */

$("verifyForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const type =
        clean(
          $("verifyType")?.value
        ).toLowerCase();


      const id =
        clean(
          $("verifyId")?.value
        );


      await verifyAccount(
        type,
        id
      );

    }
  );


/* =========================================================
   DIRECT ID CARD VERIFICATION LINK

   Supported:

   verify.html?type=member&id=AE-M-0001

   verify.html?type=volunteer&id=AE-V-0001

   Existing dashboard links containing
   &key=... are also supported.
========================================================= */

async function handleDirectLink() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const type =
    clean(
      params.get("type")
    ).toLowerCase();


  const id =
    clean(
      params.get("id")
    );


  const key =
    clean(
      params.get("key")
    );


  if (
    type !== "member" &&
    type !== "volunteer"
  ) {

    return;

  }


  if (!id && !key) {

    return;

  }


  if ($("verifyType")) {

    $("verifyType").value =
      type;

  }


  if ($("verifyId")) {

    $("verifyId").value =
      id;

  }


  await verifyAccount(
    type,
    id,
    key
  );

}


/* =========================================================
   START
========================================================= */

handleDirectLink();


console.log(
  "AAKASH EARTH ID Verification ready."
);