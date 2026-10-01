/* =========================================================
   AAKASH EARTH
   VOLUNTEER PORTAL
   Complete replacement: volunteer.js
========================================================= */

import {
  db,
  storage,
  ref,
  get,
  onValue,
  update,
  push,
  set,
  storageRef,
  uploadBytes,
  getDownloadURL
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const clean = (value) =>
  String(value ?? "").trim();

const safeNumber = (value) => {
  const number = Number(value);

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


function withTimeout(
  promise,
  milliseconds = 15000,
  message = "Request timed out."
) {

  let timer;

  const timeout = new Promise(
    (_, reject) => {

      timer = setTimeout(
        () => reject(
          new Error(message)
        ),
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


function formatDate(value) {

  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return clean(value) || "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      dateStyle: "medium"
    }
  );

}


function formatDateTime(value) {

  if (!value) {
    return "—";
  }

  const date = new Date(value);

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


function setText(id, value) {

  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent =
    clean(value) || "—";

}


function showProfileMessage(
  message = "",
  error = false
) {

  const element =
    $("volunteerFormMessage");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.style.color =
    error
      ? "#9a3e38"
      : "#77570f";

}


/* =========================================================
   SESSION CHECK
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
  session.role !== "volunteer" ||
  !clean(session.recordKey)
) {

  window.location.replace(
    "login.html"
  );

  throw new Error(
    "Volunteer login required."
  );

}


const volunteerKey =
  clean(
    session.recordKey
  );


const volunteerRef =
  ref(
    db,
    `volunteers/${volunteerKey}`
  );


/* =========================================================
   STATE
========================================================= */

let currentVolunteer = null;

let allVolunteers = {};

let allTasks = {};


/* =========================================================
   CURRENT YEAR
========================================================= */

if ($("volunteerCurrentYear")) {

  $("volunteerCurrentYear")
    .textContent =
    new Date().getFullYear();

}


/* =========================================================
   LOGOUT
========================================================= */

$("volunteerLogoutBtn")
  ?.addEventListener(
    "click",
    logoutVolunteer
  );


function logoutVolunteer() {

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


/* =========================================================
   ACCOUNT STATUS
========================================================= */

function isAccountDisabled(
  volunteer
) {

  if (
    volunteer?.active === false
  ) {
    return true;
  }


  const status =
    clean(
      volunteer?.status
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
   VOLUNTEER LIVE PROFILE
========================================================= */

onValue(
  volunteerRef,

  (snapshot) => {

    if (
      !snapshot.exists()
    ) {

      alert(
        "Volunteer account was not found."
      );

      logoutVolunteer();

      return;

    }


    currentVolunteer =
      snapshot.val();


    if (
      isAccountDisabled(
        currentVolunteer
      )
    ) {

      alert(
        "Your volunteer account is currently inactive."
      );

      logoutVolunteer();

      return;

    }


    renderVolunteerProfile();

    renderVolunteerTasks();

    renderRanking();

  },

  (error) => {

    console.error(
      "Volunteer profile error:",
      error
    );

    showProfileMessage(
      "Unable to load volunteer profile.",
      true
    );

  }
);


/* =========================================================
   ALL VOLUNTEERS
   Used for ranking.
========================================================= */

onValue(
  ref(
    db,
    "volunteers"
  ),

  (snapshot) => {

    allVolunteers =
      snapshot.exists()
        ? snapshot.val()
        : {};

    renderRanking();

  },

  (error) => {

    console.warn(
      "Ranking data error:",
      error
    );

  }
);


/* =========================================================
   TASK WATCHER
========================================================= */

onValue(
  ref(
    db,
    "tasks"
  ),

  (snapshot) => {

    allTasks =
      snapshot.exists()
        ? snapshot.val()
        : {};

    renderVolunteerTasks();

    updateCompletedTaskCount();

  },

  (error) => {

    console.error(
      "Task loading error:",
      error
    );

    const container =
      $("volunteerTaskList");

    if (container) {

      container.innerHTML = `
        <div class="empty-state">
          Unable to load tasks.
        </div>
      `;

    }

  }
);


/* =========================================================
   PROFILE RENDER
========================================================= */

function renderVolunteerProfile() {

  if (!currentVolunteer) {
    return;
  }


  const volunteer =
    currentVolunteer;


  const volunteerId =
    clean(
      volunteer.volunteerId ??
      volunteer.volunteerID ??
      volunteer.userId ??
      volunteer.id ??
      session.userId
    ) || "—";


  const name =
    clean(
      volunteer.name ??
      volunteer.fullName ??
      volunteer.volunteerName
    ) || "Volunteer";


  const status =
    clean(
      volunteer.status
    ) || "active";


  const mobile =
    clean(
      volunteer.mobile ??
      volunteer.mobileNumber
    );


  const email =
    clean(
      volunteer.email
    );


  const points =
    safeNumber(
      volunteer.points
    );


  const photo =
    clean(
      volunteer.photoURL ??
      volunteer.imageURL ??
      volunteer.photo ??
      volunteer.image
    );


  /* HERO */

  setText(
    "heroVolunteerName",
    name
  );

  setText(
    "heroVolunteerId",
    volunteerId
  );


  /* STATS */

  setText(
    "volunteerStatusStat",
    status
  );

  setText(
    "volunteerPointsStat",
    String(points)
  );


  /* PROFILE */

  setText(
    "profileVolunteerName",
    name
  );

  setText(
    "profileVolunteerId",
    volunteerId
  );

  setText(
    "detailVolunteerId",
    volunteerId
  );

  setText(
    "detailVolunteerName",
    name
  );

  setText(
    "detailVolunteerStatus",
    status
  );

  setText(
    "detailVolunteerPoints",
    String(points)
  );

  setText(
    "detailVolunteerMobile",
    mobile || "Not added"
  );

  setText(
    "detailVolunteerEmail",
    email || "Not added"
  );


  const badge =
    $("volunteerStatusBadge");

  if (badge) {

    badge.textContent =
      status.toUpperCase();

  }


  /* EDITABLE DATA */

  if ($("editVolunteerMobile")) {

    $("editVolunteerMobile").value =
      mobile;

  }


  if ($("editVolunteerEmail")) {

    $("editVolunteerEmail").value =
      email;

  }


  if ($("editVolunteerPassword")) {

    $("editVolunteerPassword").value =
      "";

  }


  /* PHOTO */

  renderPhoto(
    photo,
    name,
    "volunteerPhoto",
    "volunteerPhotoInitial"
  );


  /* ID CARD */

  setText(
    "idVolunteerName",
    name
  );

  setText(
    "idVolunteerId",
    volunteerId
  );

  setText(
    "idVolunteerStatus",
    status
  );

  setText(
    "idVolunteerPoints",
    String(points)
  );

  setText(
    "idVolunteerMobile",
    mobile || "—"
  );


  renderPhoto(
    photo,
    name,
    "idVolunteerPhoto",
    "idVolunteerInitial"
  );


  setupVerifyLink(
    volunteerId
  );


  updateCompletedTaskCount();

  loadVolunteerActivity(
    volunteerId
  );

}


/* =========================================================
   PHOTO DISPLAY

   Volunteer cannot change profile photo.
========================================================= */

function renderPhoto(
  photoURL,
  name,
  imageId,
  initialId
) {

  const image =
    $(imageId);

  const initial =
    $(initialId);


  const firstLetter =
    clean(name)
      .charAt(0)
      .toUpperCase() || "V";


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

}


/* =========================================================
   EDIT PROFILE

   VOLUNTEER CAN CHANGE ONLY:
   - Mobile
   - Email
   - Password
========================================================= */

$("volunteerEditForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (!currentVolunteer) {

        showProfileMessage(
          "Profile is still loading.",
          true
        );

        return;

      }


      const mobile =
        clean(
          $("editVolunteerMobile")
            ?.value
        );


      const email =
        clean(
          $("editVolunteerEmail")
            ?.value
        );


      const password =
        clean(
          $("editVolunteerPassword")
            ?.value
        );


      if (
        mobile &&
        !/^[0-9+\-\s]{7,15}$/.test(
          mobile
        )
      ) {

        showProfileMessage(
          "Please enter a valid mobile number.",
          true
        );

        return;

      }


      if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {

        showProfileMessage(
          "Please enter a valid email address.",
          true
        );

        return;

      }


      if (
        password &&
        password.length < 6
      ) {

        showProfileMessage(
          "New password must contain at least 6 characters.",
          true
        );

        return;

      }


      const changes = {

        mobile,
        email,

        updatedAt:
          Date.now()

      };


      if (password) {

        changes.password =
          password;

      }


      const button =
        $("volunteerSaveBtn");


      try {

        if (button) {

          button.disabled =
            true;

          button.textContent =
            "SAVING...";

        }


        showProfileMessage(
          "Saving changes..."
        );


        await withTimeout(
          update(
            volunteerRef,
            changes
          ),
          15000,
          "Profile update timed out."
        );


        if (
          $("editVolunteerPassword")
        ) {

          $("editVolunteerPassword")
            .value = "";

        }


        showProfileMessage(
          "Profile updated successfully."
        );


      } catch (error) {

        console.error(error);

        showProfileMessage(
          error.message ||
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
   RANKING
========================================================= */

function getCurrentRank() {

  if (
    !currentVolunteer ||
    !allVolunteers
  ) {

    return null;

  }


  const volunteers =
    Object.entries(
      allVolunteers
    )
      .map(
        ([key, volunteer]) => ({
          key,

          points:
            safeNumber(
              volunteer?.points
            ),

          createdAt:
            safeNumber(
              volunteer?.createdAt
            )
        })
      )
      .sort(
        (a, b) => {

          if (
            b.points !==
            a.points
          ) {

            return (
              b.points -
              a.points
            );

          }

          return (
            a.createdAt -
            b.createdAt
          );

        }
      );


  const index =
    volunteers.findIndex(
      (item) =>
        item.key ===
        volunteerKey
    );


  return index >= 0
    ? index + 1
    : null;

}


function renderRanking() {

  const rank =
    getCurrentRank();


  const display =
    rank
      ? `#${rank}`
      : "—";


  setText(
    "volunteerRankStat",
    display
  );

  setText(
    "volunteerRankingNumber",
    display
  );

  setText(
    "idVolunteerRank",
    display
  );

}


/* =========================================================
   VOLUNTEER TASK FILTER
========================================================= */

function getMyTasks() {

  if (!currentVolunteer) {
    return [];
  }


  const volunteerId =
    clean(
      currentVolunteer.volunteerId ??
      currentVolunteer.userId ??
      session.userId
    ).toUpperCase();


  return Object.entries(
    allTasks || {}
  )
    .filter(
      ([, task]) => {

        if (!task) {
          return false;
        }


        const sameKey =
          clean(
            task.volunteerKey
          ) === volunteerKey;


        const sameId =
          clean(
            task.volunteerId
          ).toUpperCase() ===
          volunteerId;


        return (
          sameKey ||
          sameId
        );

      }
    )
    .sort(
      (a, b) =>
        safeNumber(
          b[1]?.createdAt
        ) -
        safeNumber(
          a[1]?.createdAt
        )
    );

}


/* =========================================================
   TASK RENDER
========================================================= */

function renderVolunteerTasks() {

  const container =
    $("volunteerTaskList");

  if (!container) {
    return;
  }


  if (!currentVolunteer) {

    container.innerHTML = `
      <div class="empty-state">
        Loading tasks...
      </div>
    `;

    return;

  }


  const tasks =
    getMyTasks();


  if (!tasks.length) {

    container.innerHTML = `
      <div class="empty-state">
        No task has been assigned yet.
      </div>
    `;

    return;

  }


  container.innerHTML =
    tasks.map(
      ([key, task]) => {

        const status =
          clean(
            task.status
          ).toLowerCase() ||
          "assigned";


        const points =
          safeNumber(
            task.points
          );


        const proof =
          clean(
            task.proofPhotoURL ??
            task.proofURL
          );


        const canSubmit =
          [
            "assigned",
            "pending",
            "rejected"
          ].includes(status);


        return `
          <article class="task-card">

            <h3>
              ${escapeHTML(
                clean(task.title) ||
                "Assigned Task"
              )}
            </h3>

            <div class="task-meta">

              <span class="task-tag">
                ${escapeHTML(
                  status.toUpperCase()
                )}
              </span>

              <span class="task-tag">
                ${points} POINTS
              </span>

              ${
                task.dueDate
                  ? `
                    <span class="task-tag">
                      DUE:
                      ${escapeHTML(
                        formatDate(
                          task.dueDate
                        )
                      )}
                    </span>
                  `
                  : ""
              }

            </div>

            <p>
              ${escapeHTML(
                clean(
                  task.description
                ) ||
                "No description added."
              )}
            </p>

            ${
              proof
                ? `
                  <p>
                    Proof:
                    <a
                      href="${escapeHTML(proof)}"
                      target="_blank"
                      rel="noopener"
                      style="
                        color:#8b6616;
                        font-weight:900;
                      "
                    >
                      View Uploaded Photo
                    </a>
                  </p>
                `
                : ""
            }

            ${
              status === "submitted"
                ? `
                  <p>
                    Your task has been submitted
                    and is waiting for Admin approval.
                  </p>
                `
                : ""
            }

            ${
              status === "approved"
                ? `
                  <p>
                    Task approved. Points have
                    been added to your account.
                  </p>
                `
                : ""
            }

            ${
              canSubmit
                ? `
                  <div class="task-proof-area">

                    <div class="field">

                      <label
                        for="taskProof-${escapeHTML(key)}"
                      >
                        Proof Photo (Optional)
                      </label>

                      <input
                        id="taskProof-${escapeHTML(key)}"
                        type="file"
                        accept="image/*"
                        data-task-proof="${escapeHTML(key)}"
                      >

                      <small>
                        Photo is optional.
                        You can submit the task
                        without selecting a photo.
                      </small>

                    </div>

                    <button
                      type="button"
                      class="primary-btn"
                      data-submit-task="${escapeHTML(key)}"
                    >
                      SUBMIT TASK
                    </button>

                    <div
                      class="task-message"
                      id="taskMessage-${escapeHTML(key)}"
                    ></div>

                  </div>
                `
                : ""
            }

          </article>
        `;

      }
    ).join("");

}


/* =========================================================
   COMPLETED TASK COUNT
========================================================= */

function updateCompletedTaskCount() {

  const tasks =
    getMyTasks();


  const completed =
    tasks.filter(
      ([, task]) => {

        const status =
          clean(
            task.status
          ).toLowerCase();


        return [
          "completed",
          "approved"
        ].includes(status);

      }
    ).length;


  setText(
    "volunteerCompletedTaskCount",
    String(completed)
  );

}


/* =========================================================
   OPTIONAL TASK PROOF PHOTO COMPRESSION
========================================================= */

const MAX_ORIGINAL_SIZE =
  15 * 1024 * 1024;

const MAX_DIMENSION =
  1280;

const TARGET_SIZE =
  700 * 1024;


function canvasToBlob(
  canvas,
  quality
) {

  return new Promise(
    (resolve) => {

      canvas.toBlob(
        resolve,
        "image/jpeg",
        quality
      );

    }
  );

}


async function compressImage(
  file
) {

  if (!file) {
    return null;
  }


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
    MAX_ORIGINAL_SIZE
  ) {

    throw new Error(
      "Image must be smaller than 15 MB."
    );

  }


  const bitmap =
    await createImageBitmap(
      file
    );


  let width =
    bitmap.width;

  let height =
    bitmap.height;


  if (
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION
  ) {

    const ratio =
      Math.min(
        MAX_DIMENSION / width,
        MAX_DIMENSION / height
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


  canvas.width =
    width;

  canvas.height =
    height;


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


  let quality =
    0.78;


  let blob =
    await canvasToBlob(
      canvas,
      quality
    );


  while (
    blob &&
    blob.size > TARGET_SIZE &&
    quality > 0.52
  ) {

    quality -= 0.06;


    blob =
      await canvasToBlob(
        canvas,
        quality
      );

  }


  if (!blob) {

    throw new Error(
      "Unable to process photo."
    );

  }


  return blob;

}


/* =========================================================
   OPTIONAL PROOF UPLOAD
========================================================= */

async function uploadTaskProof(
  file,
  taskKey
) {

  if (!file) {

    return {
      url: "",
      path: ""
    };

  }


  const blob =
    await compressImage(
      file
    );


  const path =
    `taskProofs/${volunteerKey}/${taskKey}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`;


  const fileRef =
    storageRef(
      storage,
      path
    );


  await withTimeout(
    uploadBytes(
      fileRef,
      blob,
      {
        contentType:
          "image/jpeg"
      }
    ),
    45000,
    "Proof photo upload timed out."
  );


  const url =
    await withTimeout(
      getDownloadURL(
        fileRef
      ),
      15000,
      "Unable to get proof photo URL."
    );


  return {
    url,
    path
  };

}


/* =========================================================
   TASK SUBMISSION

   Proof photo is OPTIONAL.
========================================================= */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-submit-task]"
      );


    if (!button) {
      return;
    }


    const taskKey =
      clean(
        button.dataset.submitTask
      );


    const task =
      allTasks[
        taskKey
      ];


    if (!task) {

      return;

    }


    const message =
      $(
        `taskMessage-${taskKey}`
      );


    const input =
      document.querySelector(
        `[data-task-proof="${CSS.escape(
          taskKey
        )}"]`
      );


    const file =
      input?.files?.[0] ||
      null;


    try {

      button.disabled =
        true;

      button.textContent =
        file
          ? "UPLOADING..."
          : "SUBMITTING...";


      if (message) {

        message.textContent =
          file
            ? "Compressing and uploading proof..."
            : "Submitting task...";

      }


      const proof =
        await uploadTaskProof(
          file,
          taskKey
        );


      const changes = {

        status:
          "submitted",

        submittedAt:
          Date.now(),

        updatedAt:
          Date.now()

      };


      /*
        If no photo is selected,
        submission still works.
      */

      if (proof.url) {

        changes.proofPhotoURL =
          proof.url;

        changes.proofPhotoPath =
          proof.path;

      }


      await withTimeout(
        update(
          ref(
            db,
            `tasks/${taskKey}`
          ),
          changes
        ),
        15000,
        "Task submission timed out."
      );


      await createAdminNotification(
        "task_submitted",
        "Task Submitted",
        `${getVolunteerName()} submitted "${clean(task.title) || "a task"}" for approval.`
      );


      if (message) {

        message.textContent =
          "Task submitted successfully.";

      }


    } catch (error) {

      console.error(
        "Task submission:",
        error
      );


      if (message) {

        message.textContent =
          error.message ||
          "Unable to submit task.";

        message.style.color =
          "#9a3e38";

      }


    } finally {

      button.disabled =
        false;

      button.textContent =
        "SUBMIT TASK";

    }

  }
);


/* =========================================================
   ADMIN NOTIFICATION
========================================================= */

async function createAdminNotification(
  type,
  title,
  message
) {

  try {

    const notificationRef =
      push(
        ref(
          db,
          "adminNotifications"
        )
      );


    await set(
      notificationRef,
      {
        type,
        title,
        message,

        volunteerKey,

        volunteerId:
          getVolunteerId(),

        read:
          false,

        createdAt:
          Date.now()
      }
    );


  } catch (error) {

    /*
      Notification failure should not
      break the task submission.
    */

    console.warn(
      "Notification error:",
      error
    );

  }

}


/* =========================================================
   VOLUNTEER DETAILS HELPERS
========================================================= */

function getVolunteerId() {

  return clean(
    currentVolunteer?.volunteerId ??
    currentVolunteer?.volunteerID ??
    currentVolunteer?.userId ??
    currentVolunteer?.id ??
    session.userId
  );

}


function getVolunteerName() {

  return clean(
    currentVolunteer?.name ??
    currentVolunteer?.fullName ??
    currentVolunteer?.volunteerName
  ) || "Volunteer";

}


/* =========================================================
   ID CARD VERIFY LINK
========================================================= */

function setupVerifyLink(
  volunteerId
) {

  const url =
    `verify.html?type=volunteer&key=${encodeURIComponent(
      volunteerKey
    )}&id=${encodeURIComponent(
      volunteerId
    )}`;


  const link =
    $("volunteerVerifyLink");


  if (link) {

    link.href =
      url;

  }

}


/* =========================================================
   PRINT ID CARD
========================================================= */

$("printVolunteerIdBtn")
  ?.addEventListener(
    "click",
    () => {

      window.print();

    }
  );


/* =========================================================
   ACTIVITY
========================================================= */

async function loadVolunteerActivity(
  volunteerId
) {

  const container =
    $("volunteerActivityList");


  if (!container) {
    return;
  }


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


    const activities =
      Object.values(
        snapshot.val() || {}
      )
        .filter(
          (activity) => {

            if (
              !activity ||
              clean(
                activity.role
              ).toLowerCase() !==
              "volunteer"
            ) {

              return false;

            }


            const sameKey =
              clean(
                activity.recordKey
              ) ===
              volunteerKey;


            const sameId =
              clean(
                activity.userId
              ).toUpperCase() ===
              volunteerId.toUpperCase();


            return (
              sameKey ||
              sameId
            );

          }
        )
        .sort(
          (a, b) =>
            safeNumber(
              b.timestamp
            ) -
            safeNumber(
              a.timestamp
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
          <div class="activity-item">

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
      "Activity error:",
      error
    );

    renderEmptyActivity();

  }

}


function renderEmptyActivity() {

  const container =
    $("volunteerActivityList");


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="empty-state">
      No recent activity available.
    </div>
  `;

}


/* =========================================================
   READY
========================================================= */

console.log(
  "AAKASH EARTH Volunteer Portal ready."
);