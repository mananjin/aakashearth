/* =========================================================
   AAKASH EARTH
   TASK MANAGEMENT
   Complete replacement: task.js
========================================================= */

import {
  db,
  storage,
  ref,
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
  return Number.isFinite(number) ? number : 0;
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


const session = getSession();


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
  clean(session.recordKey);


/* =========================================================
   STATE
========================================================= */

let currentVolunteer = null;

let allTasks = {};

let currentFilter = "all";


/* =========================================================
   YEAR
========================================================= */

if ($("taskCurrentYear")) {

  $("taskCurrentYear")
    .textContent =
    new Date().getFullYear();

}


/* =========================================================
   LOGOUT
========================================================= */

$("taskLogoutBtn")
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
   VOLUNTEER WATCHER
========================================================= */

onValue(
  ref(
    db,
    `volunteers/${volunteerKey}`
  ),

  (snapshot) => {

    if (!snapshot.exists()) {

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
        "Your volunteer account is inactive."
      );

      logoutVolunteer();

      return;

    }


    renderVolunteerHeader();

    renderTasks();

  },

  (error) => {

    console.error(
      "Volunteer loading error:",
      error
    );

    const container =
      $("taskPageList");

    if (container) {

      container.innerHTML = `
        <div class="empty-state">
          Unable to load volunteer account.
        </div>
      `;

    }

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

    renderTasks();

  },

  (error) => {

    console.error(
      "Task loading error:",
      error
    );

    const container =
      $("taskPageList");

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
   VOLUNTEER INFO
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


function renderVolunteerHeader() {

  if (!currentVolunteer) {
    return;
  }

  if ($("taskVolunteerName")) {

    $("taskVolunteerName")
      .textContent =
      getVolunteerName();

  }

  if ($("taskVolunteerId")) {

    $("taskVolunteerId")
      .textContent =
      getVolunteerId() || "—";

  }

}


/* =========================================================
   MY TASKS
========================================================= */

function getMyTasks() {

  if (!currentVolunteer) {
    return [];
  }


  const volunteerId =
    getVolunteerId()
      .toUpperCase();


  return Object.entries(
    allTasks || {}
  )
    .filter(
      ([, task]) => {

        if (
          !task ||
          typeof task !== "object"
        ) {
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
   FILTER
========================================================= */

$("taskStatusFilter")
  ?.addEventListener(
    "change",
    (event) => {

      currentFilter =
        clean(
          event.target.value
        ).toLowerCase() ||
        "all";

      renderTasks();

    }
  );


function matchesFilter(
  task
) {

  if (
    currentFilter === "all"
  ) {
    return true;
  }


  const status =
    clean(
      task?.status
    ).toLowerCase() ||
    "assigned";


  if (
    currentFilter === "assigned"
  ) {

    return [
      "assigned",
      "pending"
    ].includes(status);

  }


  return status ===
    currentFilter;

}


/* =========================================================
   STATS
========================================================= */

function updateStats(
  tasks
) {

  const total =
    tasks.length;


  const assigned =
    tasks.filter(
      ([, task]) => {

        const status =
          clean(
            task?.status
          ).toLowerCase();

        return [
          "",
          "assigned",
          "pending"
        ].includes(status);

      }
    ).length;


  const submitted =
    tasks.filter(
      ([, task]) =>
        clean(
          task?.status
        ).toLowerCase() ===
        "submitted"
    ).length;


  const approved =
    tasks.filter(
      ([, task]) => {

        const status =
          clean(
            task?.status
          ).toLowerCase();

        return [
          "approved",
          "completed"
        ].includes(status);

      }
    ).length;


  if ($("taskTotalCount")) {
    $("taskTotalCount").textContent =
      String(total);
  }

  if ($("taskAssignedCount")) {
    $("taskAssignedCount").textContent =
      String(assigned);
  }

  if ($("taskSubmittedCount")) {
    $("taskSubmittedCount").textContent =
      String(submitted);
  }

  if ($("taskApprovedCount")) {
    $("taskApprovedCount").textContent =
      String(approved);
  }

}


/* =========================================================
   RENDER TASKS
========================================================= */

function renderTasks() {

  const container =
    $("taskPageList");

  if (!container) {
    return;
  }


  if (!currentVolunteer) {

    container.innerHTML = `
      <div class="empty-state">
        Loading your tasks...
      </div>
    `;

    return;

  }


  const allMyTasks =
    getMyTasks();


  updateStats(
    allMyTasks
  );


  const tasks =
    allMyTasks.filter(
      ([, task]) =>
        matchesFilter(task)
    );


  if (!tasks.length) {

    container.innerHTML = `
      <div class="empty-state">
        No tasks found in this category.
      </div>
    `;

    return;

  }


  container.innerHTML =
    tasks.map(
      ([key, task], index) =>
        createTaskCard(
          key,
          task,
          index
        )
    ).join("");

}


/* =========================================================
   TASK CARD
========================================================= */

function createTaskCard(
  key,
  task,
  index
) {

  const status =
    clean(
      task.status
    ).toLowerCase() ||
    "assigned";


  const points =
    Math.max(
      0,
      safeNumber(
        task.points
      )
    );


  const description =
    clean(
      task.description
    ) ||
    "No task description added.";


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


  const submitted =
    status === "submitted";


  const approved =
    [
      "approved",
      "completed"
    ].includes(status);


  return `
    <article class="task-card">

      <div class="task-card-top">

        <span class="task-number">
          TASK ${String(index + 1).padStart(2,"0")}
        </span>

        <h3>
          ${escapeHTML(
            clean(task.title) ||
            "Assigned Task"
          )}
        </h3>

        <div class="task-meta">

          <span class="tag">
            ${escapeHTML(
              status.toUpperCase()
            )}
          </span>

          <span class="tag">
            ${points} POINTS
          </span>

        </div>

      </div>


      <div class="task-body">

        <p class="task-description">
          ${escapeHTML(description)}
        </p>


        <div class="task-info">

          <div class="info-box">

            <span>
              ASSIGNED ON
            </span>

            <strong>
              ${escapeHTML(
                formatDate(
                  task.createdAt
                )
              )}
            </strong>

          </div>


          <div class="info-box">

            <span>
              DUE DATE
            </span>

            <strong>
              ${escapeHTML(
                formatDate(
                  task.dueDate
                )
              )}
            </strong>

          </div>

        </div>


        ${
          canSubmit
            ? createSubmissionArea(
                key
              )
            : ""
        }


        ${
          submitted
            ? `
              <div class="submitted-box">

                <strong>
                  Waiting for Admin Approval
                </strong>

                <p>
                  Submitted:
                  ${escapeHTML(
                    formatDateTime(
                      task.submittedAt
                    )
                  )}
                </p>

                ${
                  proof
                    ? `
                      <a
                        href="${escapeHTML(proof)}"
                        target="_blank"
                        rel="noopener"
                        class="proof-link"
                      >
                        VIEW PROOF PHOTO
                      </a>
                    `
                    : `
                      <p>
                        Submitted without a proof photo.
                      </p>
                    `
                }

              </div>
            `
            : ""
        }


        ${
          approved
            ? `
              <div class="submitted-box">

                <strong>
                  Task Approved
                </strong>

                <p>
                  This task has been approved.
                  ${points} points are associated
                  with this task.
                </p>

                ${
                  proof
                    ? `
                      <a
                        href="${escapeHTML(proof)}"
                        target="_blank"
                        rel="noopener"
                        class="proof-link"
                      >
                        VIEW PROOF PHOTO
                      </a>
                    `
                    : ""
                }

              </div>
            `
            : ""
        }

      </div>

    </article>
  `;

}


/* =========================================================
   SUBMISSION AREA

   PHOTO IS OPTIONAL
========================================================= */

function createSubmissionArea(
  key
) {

  return `
    <div class="proof-section">

      <label
        for="proof-${escapeHTML(key)}"
      >
        Proof Photo (Optional)
      </label>

      <input
        id="proof-${escapeHTML(key)}"
        type="file"
        accept="image/*"
        data-proof-input="${escapeHTML(key)}"
      >

      <span class="proof-help">
        Photo is optional. You can submit
        this task without selecting a photo.
      </span>


      <div
        class="proof-preview"
        id="proofPreview-${escapeHTML(key)}"
      >

        <img
          id="proofPreviewImage-${escapeHTML(key)}"
          alt="Proof preview"
        >

        <span
          id="proofPreviewName-${escapeHTML(key)}"
        ></span>

      </div>


      <button
        type="button"
        class="submit-btn"
        data-submit-task="${escapeHTML(key)}"
      >
        SUBMIT TASK
      </button>


      <p
        class="task-message"
        id="taskSubmitMessage-${escapeHTML(key)}"
      ></p>

    </div>
  `;

}


/* =========================================================
   PHOTO PREVIEW
========================================================= */

document.addEventListener(
  "change",
  (event) => {

    const input =
      event.target.closest(
        "[data-proof-input]"
      );


    if (!input) {
      return;
    }


    const taskKey =
      clean(
        input.dataset.proofInput
      );


    const file =
      input.files?.[0] ||
      null;


    const preview =
      $(
        `proofPreview-${taskKey}`
      );

    const image =
      $(
        `proofPreviewImage-${taskKey}`
      );

    const name =
      $(
        `proofPreviewName-${taskKey}`
      );


    if (
      !file ||
      !preview ||
      !image
    ) {

      preview?.classList.remove(
        "show"
      );

      return;

    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      input.value = "";

      preview.classList.remove(
        "show"
      );

      alert(
        "Please select a valid image."
      );

      return;

    }


    if (
      file.size >
      15 * 1024 * 1024
    ) {

      input.value = "";

      preview.classList.remove(
        "show"
      );

      alert(
        "Photo must be smaller than 15 MB."
      );

      return;

    }


    const objectURL =
      URL.createObjectURL(
        file
      );


    image.onload =
      () => {

        URL.revokeObjectURL(
          objectURL
        );

      };


    image.src =
      objectURL;


    if (name) {

      name.textContent =
        file.name;

    }


    preview.classList.add(
      "show"
    );

  }
);


/* =========================================================
   IMAGE COMPRESSION
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
      "Photo must be smaller than 15 MB."
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
      "Unable to process proof photo."
    );

  }


  return blob;

}


/* =========================================================
   OPTIONAL PHOTO UPLOAD
========================================================= */

async function uploadOptionalProof(
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


  const filename =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2,8)}.jpg`;


  const path =
    `taskProofs/${volunteerKey}/${taskKey}/${filename}`;


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
   SUBMIT TASK
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

      alert(
        "Task was not found."
      );

      return;

    }


    /*
      Extra check:
      Volunteer can submit only
      his/her own assigned task.
    */

    const myTask =
      getMyTasks().some(
        ([key]) =>
          key === taskKey
      );


    if (!myTask) {

      alert(
        "This task is not assigned to your account."
      );

      return;

    }


    const currentStatus =
      clean(
        task.status
      ).toLowerCase();


    if (
      ![
        "",
        "assigned",
        "pending",
        "rejected"
      ].includes(currentStatus)
    ) {

      alert(
        "This task cannot be submitted again."
      );

      return;

    }


    const input =
      document.querySelector(
        `[data-proof-input="${CSS.escape(
          taskKey
        )}"]`
      );


    const file =
      input?.files?.[0] ||
      null;


    const message =
      $(
        `taskSubmitMessage-${taskKey}`
      );


    try {

      button.disabled =
        true;


      button.textContent =
        file
          ? "UPLOADING..."
          : "SUBMITTING...";


      if (message) {

        message.style.color =
          "#795c18";

        message.textContent =
          file
            ? "Compressing and uploading proof..."
            : "Submitting task...";

      }


      /*
        If no photo selected,
        this returns empty URL/path.
      */

      const proof =
        await uploadOptionalProof(
          file,
          taskKey
        );


      const changes = {

        status:
          "submitted",

        submittedAt:
          Date.now(),

        updatedAt:
          Date.now(),

        submittedByKey:
          volunteerKey,

        submittedById:
          getVolunteerId()

      };


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


      /*
        Notification failure will not
        cancel a successful submission.
      */

      await createAdminNotification(
        taskKey,
        task
      );


      if (message) {

        message.textContent =
          "Task submitted successfully.";

      }


    } catch (error) {

      console.error(
        "Task submit error:",
        error
      );


      if (message) {

        message.style.color =
          "#9a3e38";

        message.textContent =
          error.message ||
          "Unable to submit task.";

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
  taskKey,
  task
) {

  try {

    const notificationRef =
      push(
        ref(
          db,
          "adminNotifications"
        )
      );


    await withTimeout(
      set(
        notificationRef,
        {
          type:
            "task_submitted",

          title:
            "Task Submitted",

          message:
            `${getVolunteerName()} (${getVolunteerId()}) submitted "${clean(task.title) || "Task"}" for approval.`,

          taskKey,

          volunteerKey,

          volunteerId:
            getVolunteerId(),

          read:
            false,

          createdAt:
            Date.now()
        }
      ),
      10000,
      "Notification timed out."
    );


  } catch (error) {

    /*
      Task is already submitted,
      so notification error must not
      turn it into a failed task.
    */

    console.warn(
      "Admin notification error:",
      error
    );

  }

}


/* =========================================================
   LOGOUT HELPER
========================================================= */

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


  setTimeout(
    () => {

      window.location.replace(
        "login.html"
      );

    },
    250
  );

}


/* =========================================================
   READY
========================================================= */

console.log(
  "AAKASH EARTH Task Management ready."
);