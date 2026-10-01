/* =========================================================
   AAKASH EARTH
   ADMIN DASHBOARD
   Complete replacement: admin.js
========================================================= */

import {
  db,
  storage,
  ref,
  set,
  push,
  get,
  onValue,
  update,
  remove,
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

const upper = (value) =>
  clean(value).toUpperCase();

const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const safeNumber = (value) => {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;

};

const withTimeout = (
  promise,
  milliseconds,
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

const formatDateTime = (value) => {

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

};

const formatDate = (value) => {

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
    return clean(value) || "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      dateStyle: "medium"
    }
  );

};

function setMessage(
  id,
  message = "",
  error = false
) {

  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.style.color =
    error
      ? "#8d3c35"
      : "#77570f";

}


/* =========================================================
   ADMIN SESSION CHECK
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
  session.role !== "admin"
) {

  window.location.replace(
    "login.html"
  );

  throw new Error(
    "Admin session required."
  );

}


/* =========================================================
   STATE
========================================================= */

const state = {

  members: {},
  volunteers: {},
  tasks: {},
  complaints: {},
  sports: {},
  sportsRegistrations: {},
  events: {},
  gallery: {},
  committee: {},
  notifications: {},
  loginActivity: {},
  adminProfile: {}

};


/* =========================================================
   INITIAL UI
========================================================= */

$("adminCurrentYear") &&
(
  $("adminCurrentYear").textContent =
    new Date().getFullYear()
);

if ($("dashboardAdminId")) {

  $("dashboardAdminId").textContent =
    `Admin ID: ${session.userId || "admin"}`;

}


/* =========================================================
   LOGOUT
========================================================= */

$("adminLogoutBtn")
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
        (key) =>
          sessionStorage.removeItem(key)
      );

      window.location.replace(
        "login.html"
      );

    }
  );


/* =========================================================
   IMAGE COMPRESSION
   Photo is ALWAYS optional.
========================================================= */

const MAX_ORIGINAL_SIZE =
  15 * 1024 * 1024;

const TARGET_SIZE =
  700 * 1024;

const MAX_DIMENSION =
  1280;


async function compressImage(file) {

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
    await createImageBitmap(file);


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
      "Unable to process image."
    );

  }


  return blob;

}


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


/* =========================================================
   OPTIONAL IMAGE UPLOAD
========================================================= */

async function uploadOptionalImage(
  file,
  folder
) {

  if (!file) {

    return {
      url: "",
      path: ""
    };

  }


  const blob =
    await compressImage(file);


  const filename =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}.jpg`;


  const path =
    `${folder}/${filename}`;


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
    "Photo upload timed out."
  );


  const url =
    await withTimeout(
      getDownloadURL(
        fileRef
      ),
      15000,
      "Unable to get photo URL."
    );


  return {
    url,
    path
  };

}


/* =========================================================
   MEMBER CREATE
========================================================= */

$("adminMemberForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminMemberSubmit");

      setMessage(
        "adminMemberMessage",
        ""
      );


      const name =
        clean(
          $("adminMemberName")?.value
        );

      const memberId =
        upper(
          $("adminMemberId")?.value
        );

      const mobile =
        clean(
          $("adminMemberMobile")?.value
        );

      const email =
        clean(
          $("adminMemberEmail")?.value
        );

      const password =
        clean(
          $("adminMemberPassword")?.value
        );

      const year =
        clean(
          $("adminMemberYear")?.value
        );

      const status =
        clean(
          $("adminMemberStatus")?.value
        ) || "active";

      const photoFile =
        $("adminMemberPhoto")
          ?.files?.[0] || null;


      if (
        !name ||
        !memberId ||
        !password
      ) {

        setMessage(
          "adminMemberMessage",
          "Name, Member ID and Password are required.",
          true
        );

        return;

      }


      if (
        findDuplicateId(
          state.members,
          memberId,
          [
            "memberId",
            "memberID",
            "userId",
            "id"
          ]
        )
      ) {

        setMessage(
          "adminMemberMessage",
          "This Member ID already exists.",
          true
        );

        return;

      }


      try {

        button.disabled = true;
        button.textContent =
          photoFile
            ? "UPLOADING..."
            : "SAVING...";


        const photo =
          await uploadOptionalImage(
            photoFile,
            "members"
          );


        const recordRef =
          push(
            ref(
              db,
              "members"
            )
          );


        await withTimeout(
          set(
            recordRef,
            {
              memberId,
              name,
              mobile,
              email,
              password,
              year,
              status,

              photoURL:
                photo.url,

              photoPath:
                photo.path,

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save member."
        );


        event.target.reset();


        setMessage(
          "adminMemberMessage",
          `Member ${memberId} created successfully.`
        );


        createNotification(
          "member_created",
          "Member Created",
          `${name} (${memberId}) was added.`
        );


      } catch (error) {

        console.error(error);

        setMessage(
          "adminMemberMessage",
          error.message ||
          "Unable to create member.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE MEMBER";

      }

    }
  );


/* =========================================================
   VOLUNTEER CREATE
========================================================= */

$("adminVolunteerForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminVolunteerSubmit");


      setMessage(
        "adminVolunteerMessage",
        ""
      );


      const name =
        clean(
          $("adminVolunteerName")?.value
        );

      const volunteerId =
        upper(
          $("adminVolunteerId")?.value
        );

      const mobile =
        clean(
          $("adminVolunteerMobile")?.value
        );

      const email =
        clean(
          $("adminVolunteerEmail")?.value
        );

      const password =
        clean(
          $("adminVolunteerPassword")?.value
        );

      const points =
        Math.max(
          0,
          safeNumber(
            $("adminVolunteerPoints")
              ?.value
          )
        );

      const status =
        clean(
          $("adminVolunteerStatus")?.value
        ) || "active";

      const photoFile =
        $("adminVolunteerPhoto")
          ?.files?.[0] || null;


      if (
        !name ||
        !volunteerId ||
        !password
      ) {

        setMessage(
          "adminVolunteerMessage",
          "Name, Volunteer ID and Password are required.",
          true
        );

        return;

      }


      if (
        findDuplicateId(
          state.volunteers,
          volunteerId,
          [
            "volunteerId",
            "volunteerID",
            "userId",
            "id"
          ]
        )
      ) {

        setMessage(
          "adminVolunteerMessage",
          "This Volunteer ID already exists.",
          true
        );

        return;

      }


      try {

        button.disabled = true;

        button.textContent =
          photoFile
            ? "UPLOADING..."
            : "SAVING...";


        const photo =
          await uploadOptionalImage(
            photoFile,
            "volunteers"
          );


        const recordRef =
          push(
            ref(
              db,
              "volunteers"
            )
          );


        await withTimeout(
          set(
            recordRef,
            {
              volunteerId,
              name,
              mobile,
              email,
              password,
              points,
              status,

              photoURL:
                photo.url,

              photoPath:
                photo.path,

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save volunteer."
        );


        event.target.reset();

        if (
          $("adminVolunteerPoints")
        ) {

          $("adminVolunteerPoints").value =
            "0";

        }


        setMessage(
          "adminVolunteerMessage",
          `Volunteer ${volunteerId} created successfully.`
        );


        createNotification(
          "volunteer_created",
          "Volunteer Created",
          `${name} (${volunteerId}) was added.`
        );


      } catch (error) {

        console.error(error);

        setMessage(
          "adminVolunteerMessage",
          error.message ||
          "Unable to create volunteer.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE VOLUNTEER";

      }

    }
  );


/* =========================================================
   DUPLICATE ID CHECK
========================================================= */

function findDuplicateId(
  records,
  targetId,
  fields
) {

  const normalized =
    upper(targetId);


  return Object.values(
    records || {}
  ).some(
    (record) => {

      if (
        !record ||
        typeof record !== "object"
      ) {
        return false;
      }


      return fields.some(
        (field) =>
          upper(
            record[field]
          ) === normalized
      );

    }
  );

}


/* =========================================================
   TASK CREATE
========================================================= */

$("adminTaskForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminTaskSubmit");


      const title =
        clean(
          $("adminTaskTitle")?.value
        );

      const volunteerKey =
        clean(
          $("adminTaskVolunteer")?.value
        );

      const description =
        clean(
          $("adminTaskDescription")?.value
        );

      const points =
        Math.max(
          0,
          safeNumber(
            $("adminTaskPoints")?.value
          )
        );

      const dueDate =
        clean(
          $("adminTaskDueDate")?.value
        );


      if (
        !title ||
        !volunteerKey ||
        !description
      ) {

        setMessage(
          "adminTaskMessage",
          "Task title, volunteer and description are required.",
          true
        );

        return;

      }


      const volunteer =
        state.volunteers[
          volunteerKey
        ];


      if (!volunteer) {

        setMessage(
          "adminTaskMessage",
          "Selected volunteer was not found.",
          true
        );

        return;

      }


      try {

        button.disabled = true;
        button.textContent =
          "ASSIGNING...";


        const taskRef =
          push(
            ref(
              db,
              "tasks"
            )
          );


        await withTimeout(
          set(
            taskRef,
            {
              title,
              description,

              volunteerKey,

              volunteerId:
                clean(
                  volunteer.volunteerId ??
                  volunteer.userId
                ),

              volunteerName:
                clean(
                  volunteer.name ??
                  volunteer.fullName
                ),

              points,

              dueDate,

              status:
                "assigned",

              proofPhotoURL:
                "",

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to assign task."
        );


        event.target.reset();

        if ($("adminTaskPoints")) {

          $("adminTaskPoints").value =
            "10";

        }


        setMessage(
          "adminTaskMessage",
          "Task assigned successfully."
        );


        createNotification(
          "task_created",
          "Task Assigned",
          `${title} assigned to ${clean(
            volunteer.name
          ) || "volunteer"}.`
        );


      } catch (error) {

        setMessage(
          "adminTaskMessage",
          error.message ||
          "Unable to assign task.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "ASSIGN TASK";

      }

    }
  );


/* =========================================================
   SPORTS CREATE
========================================================= */

$("adminSportsForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminSportsSubmit");


      const name =
        clean(
          $("adminSportsName")?.value
        );

      const date =
        clean(
          $("adminSportsDate")?.value
        );

      const venue =
        clean(
          $("adminSportsVenue")?.value
        );

      const lastDate =
        clean(
          $("adminSportsLastDate")?.value
        );

      const fee =
        Math.max(
          0,
          safeNumber(
            $("adminSportsFee")?.value
          )
        );

      const age =
        clean(
          $("adminSportsAge")?.value
        );

      const rules =
        clean(
          $("adminSportsRules")?.value
        );

      const photoFile =
        $("adminSportsPhoto")
          ?.files?.[0] || null;


      if (!name) {

        setMessage(
          "adminSportsMessage",
          "Sports name is required.",
          true
        );

        return;

      }


      try {

        button.disabled = true;

        button.textContent =
          photoFile
            ? "UPLOADING..."
            : "SAVING...";


        const photo =
          await uploadOptionalImage(
            photoFile,
            "sports"
          );


        const sportsRef =
          push(
            ref(
              db,
              "sports"
            )
          );


        await withTimeout(
          set(
            sportsRef,
            {
              name,
              title: name,
              date,
              venue,
              lastDate,
              registrationLastDate:
                lastDate,
              fee,
              age,
              rules,

              photoURL:
                photo.url,

              imageURL:
                photo.url,

              photoPath:
                photo.path,

              status:
                "active",

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save sports event."
        );


        event.target.reset();

        if ($("adminSportsFee")) {

          $("adminSportsFee").value =
            "0";

        }


        setMessage(
          "adminSportsMessage",
          "Sports event saved successfully."
        );


      } catch (error) {

        setMessage(
          "adminSportsMessage",
          error.message ||
          "Unable to save sports event.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE SPORTS EVENT";

      }

    }
  );


/* =========================================================
   EVENT CREATE
   Public page currently reads "festivals".
========================================================= */

$("adminEventForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminEventSubmit");


      const name =
        clean(
          $("adminEventName")?.value
        );

      const date =
        clean(
          $("adminEventDate")?.value
        );

      const time =
        clean(
          $("adminEventTime")?.value
        );

      const venue =
        clean(
          $("adminEventVenue")?.value
        );

      const description =
        clean(
          $("adminEventDescription")?.value
        );

      const photoFile =
        $("adminEventPhoto")
          ?.files?.[0] || null;


      if (!name) {

        setMessage(
          "adminEventMessage",
          "Event name is required.",
          true
        );

        return;

      }


      try {

        button.disabled = true;

        button.textContent =
          photoFile
            ? "UPLOADING..."
            : "SAVING...";


        const photo =
          await uploadOptionalImage(
            photoFile,
            "festivals"
          );


        const eventRef =
          push(
            ref(
              db,
              "festivals"
            )
          );


        await withTimeout(
          set(
            eventRef,
            {
              name,
              title: name,
              date,
              time,
              venue,
              description,

              photoURL:
                photo.url,

              imageURL:
                photo.url,

              photoPath:
                photo.path,

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save event."
        );


        event.target.reset();


        setMessage(
          "adminEventMessage",
          "Event saved successfully."
        );


      } catch (error) {

        setMessage(
          "adminEventMessage",
          error.message ||
          "Unable to save event.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE EVENT";

      }

    }
  );


/* =========================================================
   GALLERY CREATE
   Photo remains OPTIONAL.
========================================================= */

$("adminGalleryForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminGallerySubmit");


      const title =
        clean(
          $("adminGalleryTitle")?.value
        );

      const year =
        clean(
          $("adminGalleryYear")?.value
        );

      const photoFile =
        $("adminGalleryPhoto")
          ?.files?.[0] || null;


      try {

        button.disabled = true;

        button.textContent =
          photoFile
            ? "UPLOADING..."
            : "SAVING...";


        const photo =
          await uploadOptionalImage(
            photoFile,
            "gallery"
          );


        const galleryRef =
          push(
            ref(
              db,
              "gallery"
            )
          );


        await withTimeout(
          set(
            galleryRef,
            {
              title,
              year,

              photoURL:
                photo.url,

              imageURL:
                photo.url,

              photoPath:
                photo.path,

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save gallery item."
        );


        event.target.reset();


        setMessage(
          "adminGalleryMessage",
          "Gallery item saved successfully."
        );


      } catch (error) {

        setMessage(
          "adminGalleryMessage",
          error.message ||
          "Unable to save gallery item.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE GALLERY ITEM";

      }

    }
  );


/* =========================================================
   COMMITTEE CREATE
   Legacy public database path is retained
   for compatibility with main.js.
========================================================= */

$("adminCommitteeForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminCommitteeSubmit");


      const name =
        clean(
          $("adminCommitteeName")?.value
        );

      const position =
        clean(
          $("adminCommitteePosition")?.value
        );

      const mobile =
        clean(
          $("adminCommitteeMobile")?.value
        );

      const year =
        clean(
          $("adminCommitteeYear")?.value
        );

      const photoFile =
        $("adminCommitteePhoto")
          ?.files?.[0] || null;


      if (
        !name ||
        !position
      ) {

        setMessage(
          "adminCommitteeMessage",
          "Name and position are required.",
          true
        );

        return;

      }


      try {

        button.disabled = true;

        button.textContent =
          photoFile
            ? "UPLOADING..."
            : "SAVING...";


        const photo =
          await uploadOptionalImage(
            photoFile,
            "committee"
          );


        const recordRef =
          push(
            ref(
              db,
              "yuwaMandal"
            )
          );


        await withTimeout(
          set(
            recordRef,
            {
              name,
              position,
              mobile,
              year,

              photoURL:
                photo.url,

              imageURL:
                photo.url,

              photoPath:
                photo.path,

              createdAt:
                Date.now(),

              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save committee record."
        );


        event.target.reset();


        setMessage(
          "adminCommitteeMessage",
          "Committee member saved successfully."
        );


      } catch (error) {

        setMessage(
          "adminCommitteeMessage",
          error.message ||
          "Unable to save committee member.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE COMMITTEE MEMBER";

      }

    }
  );


/* =========================================================
   ADMIN PROFILE
========================================================= */

$("adminProfileForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const button =
        $("adminProfileSubmit");


      const name =
        clean(
          $("adminProfileName")?.value
        );

      const mobile =
        clean(
          $("adminProfileMobile")?.value
        );

      const email =
        clean(
          $("adminProfileEmail")?.value
        );

      const address =
        clean(
          $("adminProfileAddress")?.value
        );


      try {

        button.disabled = true;
        button.textContent =
          "SAVING...";


        await withTimeout(
          update(
            ref(
              db,
              "admin/profile"
            ),
            {
              name,
              mobile,
              email,
              address,
              updatedAt:
                Date.now()
            }
          ),
          15000,
          "Unable to save profile."
        );


        setMessage(
          "adminProfileMessage",
          "Admin profile saved successfully."
        );


      } catch (error) {

        setMessage(
          "adminProfileMessage",
          error.message ||
          "Unable to save profile.",
          true
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "SAVE PROFILE";

      }

    }
  );


/* =========================================================
   ADMIN CREDENTIAL FORM

   Current admin credentials are hardcoded
   in login.js, therefore silently saving a
   different Firebase value would break the
   expected behaviour.

   We do not pretend this changes login.
========================================================= */

$("adminCredentialForm")
  ?.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();


      const newId =
        clean(
          $("newAdminUserId")?.value
        );

      const password =
        clean(
          $("newAdminPassword")?.value
        );

      const confirm =
        clean(
          $("confirmAdminPassword")?.value
        );


      if (
        !newId ||
        !password ||
        !confirm
      ) {

        setMessage(
          "adminCredentialMessage",
          "Enter new User ID, new password and confirmation.",
          true
        );

        return;

      }


      if (
        password !== confirm
      ) {

        setMessage(
          "adminCredentialMessage",
          "Password confirmation does not match.",
          true
        );

        return;

      }


      setMessage(
        "adminCredentialMessage",
        "Current login credentials are controlled by login.js. Credential change will be enabled after moving Admin login to database authentication.",
        true
      );

    }
  );


/* =========================================================
   FIREBASE WATCHERS
========================================================= */

watchCollection(
  "members",
  (data) => {

    state.members =
      data;

    renderMembers();
    updateDashboard();
  }
);


watchCollection(
  "volunteers",
  (data) => {

    state.volunteers =
      data;

    renderVolunteers();
    renderVolunteerSelect();
    updateDashboard();
  }
);


watchCollection(
  "tasks",
  (data) => {

    state.tasks =
      data;

    renderTasks();
    updateDashboard();
  }
);


watchCollection(
  "complaints",
  (data) => {

    state.complaints =
      data;

    renderComplaints();
    updateDashboard();
  }
);


watchCollection(
  "sports",
  (data) => {

    state.sports =
      data;

    renderSports();
  }
);


watchCollection(
  "sportsRegistrations",
  (data) => {

    state.sportsRegistrations =
      data;

    renderSports();
  }
);


watchCollection(
  "festivals",
  (data) => {

    state.events =
      data;

    renderEvents();
  }
);


watchCollection(
  "gallery",
  (data) => {

    state.gallery =
      data;

    renderGallery();
  }
);


watchCollection(
  "yuwaMandal",
  (data) => {

    state.committee =
      data;

    renderCommittee();
  }
);


watchCollection(
  "adminNotifications",
  (data) => {

    state.notifications =
      data;

    renderNotifications();
    renderRecentActivity();

  }
);


watchCollection(
  "loginActivity",
  (data) => {

    state.loginActivity =
      data;

    renderRecentActivity();

  }
);


onValue(
  ref(
    db,
    "admin/profile"
  ),
  (snapshot) => {

    state.adminProfile =
      snapshot.exists()
        ? snapshot.val()
        : {};

    renderAdminProfile();

  },
  (error) => {

    console.warn(
      "Admin profile watcher:",
      error
    );

  }
);


function watchCollection(
  path,
  callback
) {

  onValue(
    ref(
      db,
      path
    ),
    (snapshot) => {

      callback(
        snapshot.exists()
          ? snapshot.val()
          : {}
      );

    },
    (error) => {

      console.warn(
        `${path} watcher:`,
        error
      );

      callback({});

    }
  );

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

  if ($("adminMemberCount")) {

    $("adminMemberCount")
      .textContent =
      Object.keys(
        state.members
      ).length;

  }


  if ($("adminVolunteerCount")) {

    $("adminVolunteerCount")
      .textContent =
      Object.keys(
        state.volunteers
      ).length;

  }


  if ($("adminComplaintCount")) {

    const count =
      Object.values(
        state.complaints
      ).filter(
        (item) => {

          const status =
            clean(
              item?.status
            ).toLowerCase();

          return ![
            "resolved",
            "closed"
          ].includes(status);

        }
      ).length;


    $("adminComplaintCount")
      .textContent =
      count;

  }


  if ($("adminTaskCount")) {

    const count =
      Object.values(
        state.tasks
      ).filter(
        (task) => {

          const status =
            clean(
              task?.status
            ).toLowerCase();

          return ![
            "completed",
            "approved",
            "rejected"
          ].includes(status);

        }
      ).length;


    $("adminTaskCount")
      .textContent =
      count;

  }

}


/* =========================================================
   MEMBERS TABLE
========================================================= */

function renderMembers() {

  const body =
    $("adminMembersTable");

  if (!body) {
    return;
  }


  const records =
    Object.entries(
      state.members
    ).sort(
      (a, b) =>
        safeNumber(
          b[1]?.createdAt
        ) -
        safeNumber(
          a[1]?.createdAt
        )
    );


  if (!records.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          No members found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    records.map(
      ([key, member]) => {

        const id =
          clean(
            member.memberId ??
            member.userId ??
            member.id
          ) || "—";

        const name =
          clean(
            member.name ??
            member.fullName
          ) || "—";

        const mobile =
          clean(
            member.mobile
          ) || "—";

        const year =
          clean(
            member.year
          ) || "—";

        const status =
          clean(
            member.status
          ) || "active";


        return `
          <tr>
            <td>${escapeHTML(id)}</td>

            <td>
              <strong>
                ${escapeHTML(name)}
              </strong>
            </td>

            <td>
              ${escapeHTML(mobile)}
            </td>

            <td>
              ${escapeHTML(year)}
            </td>

            <td>
              <span class="status-badge">
                ${escapeHTML(status)}
              </span>
            </td>

            <td>
              <button
                type="button"
                class="table-action-btn"
                data-delete-member="${escapeHTML(key)}"
              >
                DELETE
              </button>
            </td>
          </tr>
        `;

      }
    ).join("");

}


/* =========================================================
   VOLUNTEERS TABLE
========================================================= */

function renderVolunteers() {

  const body =
    $("adminVolunteersTable");

  if (!body) {
    return;
  }


  const records =
    Object.entries(
      state.volunteers
    ).sort(
      (a, b) =>
        safeNumber(
          b[1]?.points
        ) -
        safeNumber(
          a[1]?.points
        )
    );


  if (!records.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          No volunteers found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    records.map(
      ([key, volunteer]) => {

        const id =
          clean(
            volunteer.volunteerId ??
            volunteer.userId ??
            volunteer.id
          ) || "—";

        const name =
          clean(
            volunteer.name ??
            volunteer.fullName
          ) || "—";

        const mobile =
          clean(
            volunteer.mobile
          ) || "—";

        const points =
          safeNumber(
            volunteer.points
          );

        const status =
          clean(
            volunteer.status
          ) || "active";


        return `
          <tr>

            <td>
              ${escapeHTML(id)}
            </td>

            <td>
              <strong>
                ${escapeHTML(name)}
              </strong>
            </td>

            <td>
              ${escapeHTML(mobile)}
            </td>

            <td>
              ${points}
            </td>

            <td>
              <span class="status-badge">
                ${escapeHTML(status)}
              </span>
            </td>

            <td>
              <button
                type="button"
                class="table-action-btn"
                data-delete-volunteer="${escapeHTML(key)}"
              >
                DELETE
              </button>
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* =========================================================
   VOLUNTEER SELECT
========================================================= */

function renderVolunteerSelect() {

  const select =
    $("adminTaskVolunteer");

  if (!select) {
    return;
  }


  const current =
    select.value;


  const options =
    Object.entries(
      state.volunteers
    ).map(
      ([key, volunteer]) => {

        const id =
          clean(
            volunteer.volunteerId ??
            volunteer.userId
          );

        const name =
          clean(
            volunteer.name ??
            volunteer.fullName
          );


        return `
          <option value="${escapeHTML(key)}">
            ${escapeHTML(name || "Volunteer")}
            ${id ? ` (${escapeHTML(id)})` : ""}
          </option>
        `;

      }
    ).join("");


  select.innerHTML = `
    <option value="">
      Select Volunteer
    </option>
    ${options}
  `;


  if (
    current &&
    state.volunteers[current]
  ) {

    select.value =
      current;

  }

}


/* =========================================================
   TASK TABLE
========================================================= */

function renderTasks() {

  const body =
    $("adminTasksTable");

  if (!body) {
    return;
  }


  const records =
    Object.entries(
      state.tasks
    ).sort(
      (a, b) =>
        safeNumber(
          b[1]?.createdAt
        ) -
        safeNumber(
          a[1]?.createdAt
        )
    );


  if (!records.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          No tasks found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    records.map(
      ([key, task]) => {

        const status =
          clean(
            task.status
          ) || "assigned";

        const proof =
          clean(
            task.proofPhotoURL ??
            task.proofURL
          );


        return `
          <tr>

            <td>
              <strong>
                ${escapeHTML(
                  clean(task.title) || "Task"
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(
                clean(task.volunteerName) ||
                clean(task.volunteerId) ||
                "—"
              )}
            </td>

            <td>
              ${safeNumber(task.points)}
            </td>

            <td>
              <span class="status-badge">
                ${escapeHTML(status)}
              </span>
            </td>

            <td>
              ${
                proof
                  ? `
                    <a
                      class="table-action-btn"
                      href="${escapeHTML(proof)}"
                      target="_blank"
                      rel="noopener"
                    >
                      VIEW
                    </a>
                  `
                  : "—"
              }
            </td>

            <td>
              ${
                status.toLowerCase() ===
                "submitted"
                  ? `
                    <button
                      type="button"
                      class="table-action-btn"
                      data-approve-task="${escapeHTML(key)}"
                    >
                      APPROVE
                    </button>
                  `
                  : ""
              }

              <button
                type="button"
                class="table-action-btn"
                data-delete-task="${escapeHTML(key)}"
              >
                DELETE
              </button>
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* =========================================================
   COMPLAINTS
========================================================= */

function renderComplaints() {

  const body =
    $("adminComplaintsTable");

  if (!body) {
    return;
  }


  const records =
    Object.entries(
      state.complaints
    ).sort(
      (a, b) =>
        safeNumber(
          b[1]?.createdAt ??
          b[1]?.timestamp
        ) -
        safeNumber(
          a[1]?.createdAt ??
          a[1]?.timestamp
        )
    );


  if (!records.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          No complaints found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    records.map(
      ([key, complaint]) => {

        const status =
          clean(
            complaint.status
          ) || "pending";


        return `
          <tr>

            <td>
              ${escapeHTML(
                clean(complaint.name) || "—"
              )}
            </td>

            <td>
              ${escapeHTML(
                clean(complaint.mobile) || "—"
              )}
            </td>

            <td>
              ${escapeHTML(
                clean(
                  complaint.subject ??
                  complaint.title
                ) || "—"
              )}
            </td>

            <td>
              <span class="status-badge">
                ${escapeHTML(status)}
              </span>
            </td>

            <td>
              ${escapeHTML(
                formatDateTime(
                  complaint.createdAt ??
                  complaint.timestamp
                )
              )}
            </td>

            <td>

              ${
                ![
                  "resolved",
                  "closed"
                ].includes(
                  status.toLowerCase()
                )
                  ? `
                    <button
                      type="button"
                      class="table-action-btn"
                      data-resolve-complaint="${escapeHTML(key)}"
                    >
                      RESOLVE
                    </button>
                  `
                  : ""
              }

            </td>

          </tr>
        `;

      }
    ).join("");

}


/* =========================================================
   SPORTS
========================================================= */

function renderSports() {

  const container =
    $("adminSportsList");

  if (!container) {
    return;
  }


  const sports =
    Object.entries(
      state.sports
    );


  if (!sports.length) {

    container.innerHTML =
      `<div class="notification-empty">
        No sports events found.
      </div>`;

    return;

  }


  container.innerHTML =
    sports.map(
      ([key, item]) => {

        const registrations =
          state.sportsRegistrations[
            key
          ] || {};

        const registrationCount =
          typeof registrations === "object"
            ? Object.keys(
                registrations
              ).length
            : 0;


        return `
          <div class="dashboard-activity-item">

            <div class="activity-mark"></div>

            <div style="flex:1">

              <strong>
                ${escapeHTML(
                  clean(
                    item.name ??
                    item.title
                  ) || "Sports Event"
                )}
              </strong>

              <span>
                Date:
                ${escapeHTML(
                  formatDate(item.date)
                )}
                • Venue:
                ${escapeHTML(
                  clean(item.venue) || "—"
                )}
                • Registrations:
                ${registrationCount}
              </span>

            </div>

            <button
              type="button"
              class="table-action-btn"
              data-delete-sports="${escapeHTML(key)}"
            >
              DELETE
            </button>

          </div>
        `;

      }
    ).join("");

}


/* =========================================================
   EVENTS
========================================================= */

function renderEvents() {

  const container =
    $("adminEventsList");

  if (!container) {
    return;
  }


  const records =
    Object.entries(
      state.events
    );


  if (!records.length) {

    container.innerHTML =
      `<div class="notification-empty">
        No events found.
      </div>`;

    return;

  }


  container.innerHTML =
    records.map(
      ([key, item]) => `
        <div class="dashboard-activity-item">

          <div class="activity-mark"></div>

          <div style="flex:1">

            <strong>
              ${escapeHTML(
                clean(
                  item.name ??
                  item.title
                ) || "Event"
              )}
            </strong>

            <span>
              ${escapeHTML(
                formatDate(item.date)
              )}
              •
              ${escapeHTML(
                clean(item.venue) || "Venue not added"
              )}
            </span>

          </div>

          <button
            type="button"
            class="table-action-btn"
            data-delete-event="${escapeHTML(key)}"
          >
            DELETE
          </button>

        </div>
      `
    ).join("");

}


/* =========================================================
   GALLERY
========================================================= */

function renderGallery() {

  const container =
    $("adminGalleryList");

  if (!container) {
    return;
  }


  const records =
    Object.entries(
      state.gallery
    );


  if (!records.length) {

    container.innerHTML =
      `<div class="notification-empty">
        No gallery items found.
      </div>`;

    return;

  }


  container.innerHTML =
    records.map(
      ([key, item]) => {

        const photo =
          clean(
            item.photoURL ??
            item.imageURL ??
            item.image
          );


        return `
          <div class="dashboard-activity-item">

            <div class="activity-mark"></div>

            <div style="flex:1">

              <strong>
                ${escapeHTML(
                  clean(item.title) ||
                  "Gallery Item"
                )}
              </strong>

              <span>
                Year:
                ${escapeHTML(
                  clean(item.year) || "—"
                )}
                ${
                  photo
                    ? " • Photo available"
                    : " • No photo"
                }
              </span>

            </div>

            <button
              type="button"
              class="table-action-btn"
              data-delete-gallery="${escapeHTML(key)}"
            >
              DELETE
            </button>

          </div>
        `;

      }
    ).join("");

}


/* =========================================================
   COMMITTEE
========================================================= */

function renderCommittee() {

  const container =
    $("adminCommitteeList");

  if (!container) {
    return;
  }


  const records =
    Object.entries(
      state.committee
    );


  if (!records.length) {

    container.innerHTML =
      `<div class="notification-empty">
        No committee records found.
      </div>`;

    return;

  }


  container.innerHTML =
    records.map(
      ([key, item]) => `
        <div class="dashboard-activity-item">

          <div class="activity-mark"></div>

          <div style="flex:1">

            <strong>
              ${escapeHTML(
                clean(item.name) ||
                "Committee Member"
              )}
            </strong>

            <span>
              ${escapeHTML(
                clean(item.position) ||
                "Position not added"
              )}
              •
              ${escapeHTML(
                clean(item.year) || "—"
              )}
            </span>

          </div>

          <button
            type="button"
            class="table-action-btn"
            data-delete-committee="${escapeHTML(key)}"
          >
            DELETE
          </button>

        </div>
      `
    ).join("");

}


/* =========================================================
   ADMIN PROFILE RENDER
========================================================= */

function renderAdminProfile() {

  const profile =
    state.adminProfile || {};


  const name =
    clean(
      profile.name
    ) ||
    "Administrator";


  if ($("adminProfileDisplayName")) {

    $("adminProfileDisplayName")
      .textContent =
      name;

  }


  if ($("dashboardAdminName")) {

    $("dashboardAdminName")
      .textContent =
      name;

  }


  if ($("adminProfileName")) {

    $("adminProfileName").value =
      clean(profile.name);

  }


  if ($("adminProfileMobile")) {

    $("adminProfileMobile").value =
      clean(profile.mobile);

  }


  if ($("adminProfileEmail")) {

    $("adminProfileEmail").value =
      clean(profile.email);

  }


  if ($("adminProfileAddress")) {

    $("adminProfileAddress").value =
      clean(profile.address);

  }

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

const notificationModal =
  $("adminNotificationModal");


$("openNotificationsBtn")
  ?.addEventListener(
    "click",
    () => {

      openNotificationModal();

    }
  );


$("closeNotificationModal")
  ?.addEventListener(
    "click",
    closeNotificationModal
  );


$("closeNotificationFooterBtn")
  ?.addEventListener(
    "click",
    closeNotificationModal
  );


notificationModal
  ?.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        notificationModal
      ) {

        closeNotificationModal();

      }

    }
  );


function openNotificationModal() {

  notificationModal
    ?.classList.add(
      "open"
    );

  notificationModal
    ?.setAttribute(
      "aria-hidden",
      "false"
    );

}


function closeNotificationModal() {

  notificationModal
    ?.classList.remove(
      "open"
    );

  notificationModal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

}


/* =========================================================
   SHOW POPUP ON ADMIN LOGIN
   Only when unread activity exists.
========================================================= */

let initialNotificationLoad =
  true;


function renderNotifications() {

  const list =
    $("adminNotificationList");

  const badge =
    $("adminNotificationCount");


  const records =
    Object.entries(
      state.notifications
    ).sort(
      (a, b) =>
        safeNumber(
          b[1]?.createdAt
        ) -
        safeNumber(
          a[1]?.createdAt
        )
    );


  const unread =
    records.filter(
      ([, item]) =>
        item?.read !== true
    );


  if (badge) {

    badge.textContent =
      unread.length > 99
        ? "99+"
        : String(
            unread.length
          );

    badge.hidden =
      unread.length === 0;

  }


  if (list) {

    if (!records.length) {

      list.innerHTML = `
        <div class="notification-empty">
          No notifications yet.
        </div>
      `;

    } else {

      list.innerHTML =
        records.slice(
          0,
          100
        ).map(
          ([, item]) => `
            <div class="notification-item ${
              item?.read === true
                ? ""
                : "unread"
            }">

              <div class="notification-dot"></div>

              <div>

                <strong>
                  ${escapeHTML(
                    clean(item.title) ||
                    "Activity"
                  )}
                </strong>

                <p>
                  ${escapeHTML(
                    clean(item.message)
                  )}
                </p>

                <small>
                  ${escapeHTML(
                    formatDateTime(
                      item.createdAt
                    )
                  )}
                </small>

              </div>

            </div>
          `
        ).join("");

    }

  }


  /*
    First Firebase notification load:
    show popup automatically when
    unread records exist.
  */

  if (
    initialNotificationLoad
  ) {

    initialNotificationLoad =
      false;

    if (
      unread.length > 0
    ) {

      setTimeout(
        openNotificationModal,
        250
      );

    }

  }

}


/* =========================================================
   MARK ALL NOTIFICATIONS READ
========================================================= */

$("markAllNotificationsRead")
  ?.addEventListener(
    "click",
    async () => {

      const unread =
        Object.entries(
          state.notifications
        ).filter(
          ([, item]) =>
            item?.read !== true
        );


      if (!unread.length) {
        return;
      }


      const updates = {};


      unread.forEach(
        ([key]) => {

          updates[
            `${key}/read`
          ] = true;

          updates[
            `${key}/readAt`
          ] = Date.now();

        }
      );


      try {

        await update(
          ref(
            db,
            "adminNotifications"
          ),
          updates
        );

      } catch (error) {

        console.error(
          "Unable to mark notifications:",
          error
        );

      }

    }
  );


/* =========================================================
   CREATE NOTIFICATION
========================================================= */

async function createNotification(
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
        read: false,
        createdAt:
          Date.now()
      }
    );

  } catch (error) {

    console.warn(
      "Notification not saved:",
      error
    );

  }

}


/* =========================================================
   RECENT ACTIVITY
========================================================= */

function renderRecentActivity() {

  const container =
    $("adminRecentActivity");

  if (!container) {
    return;
  }


  const notifications =
    Object.values(
      state.notifications
    ).map(
      (item) => ({
        title:
          clean(item.title) ||
          "Activity",

        message:
          clean(item.message),

        time:
          safeNumber(
            item.createdAt
          )
      })
    );


  const logins =
    Object.values(
      state.loginActivity
    ).map(
      (item) => ({
        title:
          `${clean(item.role) || "Portal"} Login`,

        message:
          `${clean(item.name) || "User"} ${
            clean(item.userId)
              ? `(${clean(item.userId)})`
              : ""
          } logged in.`,

        time:
          safeNumber(
            item.timestamp
          )
      })
    );


  const items =
    [
      ...notifications,
      ...logins
    ]
      .sort(
        (a, b) =>
          b.time - a.time
      )
      .slice(
        0,
        8
      );


  if (!items.length) {

    container.innerHTML = `
      <div class="notification-empty">
        No recent activity.
      </div>
    `;

    return;

  }


  container.innerHTML =
    items.map(
      (item) => `
        <div class="dashboard-activity-item">

          <div class="activity-mark"></div>

          <div>

            <strong>
              ${escapeHTML(item.title)}
            </strong>

            <span>
              ${escapeHTML(item.message)}
              <br>
              ${escapeHTML(
                formatDateTime(
                  item.time
                )
              )}
            </span>

          </div>

        </div>
      `
    ).join("");

}


/* =========================================================
   GLOBAL TABLE ACTIONS
========================================================= */

document.addEventListener(
  "click",
  async (event) => {

    const target =
      event.target.closest(
        "button"
      );

    if (!target) {
      return;
    }


    /* MEMBER DELETE */

    if (
      target.dataset.deleteMember
    ) {

      const key =
        target.dataset.deleteMember;

      if (
        !confirm(
          "Delete this member?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `members/${key}`,
        target
      );

      return;

    }


    /* VOLUNTEER DELETE */

    if (
      target.dataset.deleteVolunteer
    ) {

      const key =
        target.dataset.deleteVolunteer;

      if (
        !confirm(
          "Delete this volunteer?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `volunteers/${key}`,
        target
      );

      return;

    }


    /* TASK DELETE */

    if (
      target.dataset.deleteTask
    ) {

      const key =
        target.dataset.deleteTask;

      if (
        !confirm(
          "Delete this task?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `tasks/${key}`,
        target
      );

      return;

    }


    /* TASK APPROVE */

    if (
      target.dataset.approveTask
    ) {

      await approveTask(
        target.dataset.approveTask,
        target
      );

      return;

    }


    /* COMPLAINT RESOLVE */

    if (
      target.dataset.resolveComplaint
    ) {

      const key =
        target.dataset.resolveComplaint;


      target.disabled = true;


      try {

        await update(
          ref(
            db,
            `complaints/${key}`
          ),
          {
            status:
              "resolved",

            resolvedAt:
              Date.now(),

            updatedAt:
              Date.now()
          }
        );

      } catch (error) {

        alert(
          "Unable to update complaint."
        );

      } finally {

        target.disabled = false;

      }

      return;

    }


    /* SPORTS DELETE */

    if (
      target.dataset.deleteSports
    ) {

      if (
        !confirm(
          "Delete this sports event?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `sports/${target.dataset.deleteSports}`,
        target
      );

      return;

    }


    /* EVENT DELETE */

    if (
      target.dataset.deleteEvent
    ) {

      if (
        !confirm(
          "Delete this event?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `festivals/${target.dataset.deleteEvent}`,
        target
      );

      return;

    }


    /* GALLERY DELETE */

    if (
      target.dataset.deleteGallery
    ) {

      if (
        !confirm(
          "Delete this gallery item?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `gallery/${target.dataset.deleteGallery}`,
        target
      );

      return;

    }


    /* COMMITTEE DELETE */

    if (
      target.dataset.deleteCommittee
    ) {

      if (
        !confirm(
          "Delete this committee member?"
        )
      ) {
        return;
      }

      await deleteRecord(
        `yuwaMandal/${target.dataset.deleteCommittee}`,
        target
      );

    }

  }
);


/* =========================================================
   DELETE RECORD
========================================================= */

async function deleteRecord(
  path,
  button
) {

  const original =
    button.textContent;


  button.disabled =
    true;

  button.textContent =
    "WAIT...";


  try {

    await withTimeout(
      remove(
        ref(
          db,
          path
        )
      ),
      15000,
      "Delete timed out."
    );

  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "Unable to delete record."
    );

  } finally {

    button.disabled =
      false;

    button.textContent =
      original;

  }

}


/* =========================================================
   APPROVE TASK + POINTS
========================================================= */

async function approveTask(
  taskKey,
  button
) {

  const task =
    state.tasks[
      taskKey
    ];


  if (!task) {
    return;
  }


  if (
    clean(
      task.status
    ).toLowerCase() ===
    "approved"
  ) {
    return;
  }


  const volunteerKey =
    clean(
      task.volunteerKey
    );


  if (
    !volunteerKey ||
    !state.volunteers[
      volunteerKey
    ]
  ) {

    alert(
      "Volunteer record not found."
    );

    return;

  }


  const currentPoints =
    safeNumber(
      state.volunteers[
        volunteerKey
      ]?.points
    );

  const taskPoints =
    Math.max(
      0,
      safeNumber(
        task.points
      )
    );


  button.disabled =
    true;

  button.textContent =
    "WAIT...";


  try {

    /*
      One multi-location RTDB update
      avoids separate point/task saves.
    */

    const updates = {};

    updates[
      `tasks/${taskKey}/status`
    ] = "approved";

    updates[
      `tasks/${taskKey}/approvedAt`
    ] = Date.now();

    updates[
      `tasks/${taskKey}/updatedAt`
    ] = Date.now();

    updates[
      `volunteers/${volunteerKey}/points`
    ] =
      currentPoints +
      taskPoints;

    updates[
      `volunteers/${volunteerKey}/updatedAt`
    ] = Date.now();


    await withTimeout(
      update(
        ref(
          db
        ),
        updates
      ),
      15000,
      "Task approval timed out."
    );


    createNotification(
      "task_approved",
      "Task Approved",
      `${clean(task.title) || "Task"} approved. ${taskPoints} points added.`
    );


  } catch (error) {

    alert(
      error.message ||
      "Unable to approve task."
    );

  } finally {

    button.disabled =
      false;

    button.textContent =
      "APPROVE";

  }

}


/* =========================================================
   INITIAL READY
========================================================= */

console.log(
  "AAKASH EARTH Admin Dashboard ready."
);