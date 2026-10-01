import {
  db,
  ref,
  get,
  onValue,
  push,
  set,
  update
} from "./firebase.js";

/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];

const clean = value => String(value ?? "").trim();
const normalize = value => clean(value).toLowerCase();

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function objectToArray(data) {
  if (!data) return [];

  return Object.entries(data).map(([key, value]) => ({
    key,
    ...(value || {})
  }));
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeImage(value = "") {
  const url = clean(value);

  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:image/")
  ) {
    return url;
  }

  return "";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return clean(value) || "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function showMessage(id, message, success = false) {
  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.style.color = success
    ? "#147D64"
    : "#7A2430";
}


/* =========================================================
   SESSION
========================================================= */

const loginRole =
  sessionStorage.getItem("aakashLoginRole");

const volunteerLogin =
  sessionStorage.getItem("aakashVolunteerLogin");

const volunteerKey =
  sessionStorage.getItem("aakashVolunteerKey");

if (
  loginRole !== "volunteer" ||
  volunteerLogin !== "true" ||
  !volunteerKey
) {
  window.location.href = "login.html";
}


let currentVolunteer = null;
let volunteerTasks = [];
let volunteers = [];
let proposals = [];
let currentTask = null;


/* =========================================================
   PANEL NAVIGATION
========================================================= */

const panelTitles = {
  dashboard: "Dashboard",
  profile: "Profile",
  idcard: "I-Card",
  tasks: "My Tasks",
  performance: "Performance",
  ranking: "Volunteer Ranking",
  history: "Task History",
  organize: "Organize",
  complaints: "Complaints",
  festivals: "Festivals",
  sports: "Sports",
  updates: "Updates",
  gallery: "Gallery"
};


function openPanel(panelName) {

  $$("[data-volunteer-panel-content]")
    .forEach(panel => {

      panel.classList.toggle(
        "active",
        panel.dataset.volunteerPanelContent === panelName
      );

    });


  $$("[data-volunteer-panel]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.volunteerPanel === panelName
      );

    });


  setText(
    "volunteerPageTitle",
    panelTitles[panelName] || "Volunteer Portal"
  );


  $("volunteerSidebar")
    ?.classList.remove("open");
}


$$("[data-volunteer-panel]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openPanel(
          button.dataset.volunteerPanel
        );

      }
    );

  });


$("volunteerMenuBtn")
  ?.addEventListener(
    "click",
    () => {

      $("volunteerSidebar")
        ?.classList.toggle("open");

    }
  );


/* =========================================================
   LOGOUT
========================================================= */

$("volunteerLogout")
  ?.addEventListener(
    "click",
    () => {

      [
        "aakashLoginRole",
        "aakashVolunteerLogin",
        "aakashVolunteerKey",
        "aakashVolunteerId"
      ].forEach(key => {
        sessionStorage.removeItem(key);
      });

      window.location.href =
        "login.html";

    }
  );


/* =========================================================
   LOAD VOLUNTEER PROFILE
========================================================= */

async function loadVolunteer() {

  try {

    const snapshot =
      await get(
        ref(
          db,
          `volunteers/${volunteerKey}`
        )
      );


    if (!snapshot.exists()) {

      throw new Error(
        "Volunteer not found"
      );

    }


    currentVolunteer = {
      key: volunteerKey,
      ...snapshot.val()
    };


    if (
      normalize(
        currentVolunteer.status
      ) !== "approved"
    ) {

      sessionStorage.removeItem(
        "aakashVolunteerLogin"
      );

      sessionStorage.removeItem(
        "aakashVolunteerKey"
      );

      sessionStorage.removeItem(
        "aakashLoginRole"
      );

      window.location.href =
        "login.html";

      return;
    }


    if (
      !clean(
        currentVolunteer.volunteerId
      )
    ) {

      alert(
        "Official Volunteer ID has not been generated yet."
      );

      window.location.href =
        "login.html";

      return;
    }


    renderVolunteerProfile();

    setupVolunteerIdCard();

  } catch (error) {

    console.error(
      "Volunteer load error:",
      error
    );

    alert(
      "Unable to load Volunteer account."
    );

  }

}


/* =========================================================
   PROFILE RENDER
========================================================= */

function renderVolunteerProfile() {

  if (!currentVolunteer) return;


  const name =
    currentVolunteer.name ||
    "Volunteer";

  const id =
    currentVolunteer.volunteerId ||
    "—";

  const points =
    numberValue(
      currentVolunteer.points
    );

  const rating =
    numberValue(
      currentVolunteer.rating
    );

  const photo =
    safeImage(
      currentVolunteer.photoURL ||
      currentVolunteer.photoUrl ||
      currentVolunteer.photo ||
      ""
    );


  setText(
    "sidebarVolunteerName",
    name
  );

  setText(
    "sidebarVolunteerId",
    id
  );

  setText(
    "topVolunteerName",
    name
  );

  setText(
    "welcomeVolunteerName",
    name
  );

  setText(
    "dashboardVolunteerId",
    id
  );


  setText(
    "dashboardVolunteerArea",
    currentVolunteer.area || "—"
  );

  setText(
    "dashboardVolunteerYear",
    currentVolunteer.year || "—"
  );

  setText(
    "dashboardVolunteerStatus",
    currentVolunteer.status || "—"
  );


  setText(
    "profileVolunteerName",
    name
  );

  setText(
    "profileVolunteerId",
    id
  );

  setText(
    "profileVolunteerMobile",
    currentVolunteer.mobile || "—"
  );

  setText(
    "profileVolunteerArea",
    currentVolunteer.area || "—"
  );

  setText(
    "profileVolunteerYear",
    currentVolunteer.year || "—"
  );

  setText(
    "profileVolunteerGender",
    currentVolunteer.gender || "—"
  );

  setText(
    "profileVolunteerAddress",
    currentVolunteer.address || "—"
  );

  setText(
    "profileVolunteerStatus",
    currentVolunteer.status || "—"
  );


  setText(
    "volunteerPoints",
    points
  );

  setText(
    "performanceVolunteerPoints",
    points
  );

  setText(
    "volunteerRating",
    rating
      ? rating.toFixed(1)
      : "0"
  );

  setText(
    "performanceVolunteerRating",
    rating
      ? rating.toFixed(1)
      : "0"
  );


  const photoBox =
    $("sidebarVolunteerPhoto");

  if (photoBox) {

    photoBox.innerHTML = "";

    if (photo) {

      const image =
        document.createElement("img");

      image.src = photo;
      image.alt = "";

      image.onerror = () => {

        photoBox.innerHTML = "";
        photoBox.textContent =
          name.charAt(0)
            .toUpperCase() || "V";

      };

      photoBox.appendChild(image);

    } else {

      photoBox.textContent =
        name.charAt(0)
          .toUpperCase() || "V";

    }

  }


  sessionStorage.setItem(
    "aakashVolunteerId",
    id
  );

}


/* =========================================================
   I-CARD
========================================================= */

function setupVolunteerIdCard() {

  if (
    !currentVolunteer?.volunteerId
  ) {
    return;
  }


  const url =
    `id-card.html?type=volunteer&id=${
      encodeURIComponent(
        currentVolunteer.volunteerId
      )
    }`;


  [
    "viewVolunteerIdCard",
    "dashboardVolunteerIdCard"
  ].forEach(id => {

    $(id)?.addEventListener(
      "click",
      () => {

        window.location.href =
          url;

      }
    );

  });

}


/* =========================================================
   TASKS
========================================================= */

function taskStatusLabel(status) {

  const labels = {
    assigned: "Assigned",
    pending_review:
      "Pending Review",
    completed: "Completed",
    rejected: "Rejected"
  };

  return (
    labels[normalize(status)] ||
    status ||
    "Assigned"
  );

}


function renderTasks() {

  const container =
    $("volunteerTaskList");

  if (!container) return;


  const total =
    volunteerTasks.length;

  const completed =
    volunteerTasks.filter(
      task =>
        normalize(task.status) ===
        "completed"
    ).length;


  setText(
    "volunteerTotalTasks",
    total
  );

  setText(
    "volunteerCompletedTasks",
    completed
  );

  setText(
    "performanceCompletedTasks",
    completed
  );


  if (!volunteerTasks.length) {

    container.innerHTML = `
      <div class="simple-item">
        No tasks assigned.
      </div>
    `;

    renderTaskHistory();

    return;
  }


  container.innerHTML =
    volunteerTasks.map(task => {

      const status =
        normalize(task.status);

      const canSubmit =
        status === "assigned" ||
        status === "rejected";


      return `
        <div class="simple-item">

          <strong>
            ${escapeHTML(
              task.title || "Task"
            )}
          </strong>

          <p>
            ${escapeHTML(
              task.description || ""
            )}
          </p>

          <small>
            Status:
            <b>
              ${escapeHTML(
                taskStatusLabel(
                  task.status
                )
              )}
            </b>

            &nbsp; • &nbsp;

            Points:
            ${numberValue(
              task.points
            )}

            &nbsp; • &nbsp;

            Deadline:
            ${escapeHTML(
              formatDate(
                task.deadline
              )
            )}
          </small>

          ${
            canSubmit
              ? `
                <div style="margin-top:10px;">

                  <button
                    class="secondary-btn"
                    data-open-volunteer-task="${escapeHTML(task.key)}"
                  >
                    Open Task
                  </button>

                </div>
              `
              : ""
          }

        </div>
      `;

    }).join("");


  renderTaskHistory();

}


/* =========================================================
   TASK HISTORY
========================================================= */

function renderTaskHistory() {

  const container =
    $("volunteerTaskHistory");

  if (!container) return;


  const history =
    volunteerTasks.filter(
      task => {

        const status =
          normalize(task.status);

        return (
          status === "completed" ||
          status === "rejected"
        );

      }
    );


  if (!history.length) {

    container.innerHTML = `
      <div class="simple-item">
        No task history available.
      </div>
    `;

    return;
  }


  container.innerHTML =
    history.map(task => `

      <div class="simple-item">

        <strong>
          ${escapeHTML(
            task.title || "Task"
          )}
        </strong>

        <p>
          ${escapeHTML(
            taskStatusLabel(
              task.status
            )
          )}

          •

          ${numberValue(
            task.points
          )} Points
        </p>

        ${
          task.adminRemark
            ? `
              <small>
                Admin:
                ${escapeHTML(
                  task.adminRemark
                )}
              </small>
            `
            : ""
        }

      </div>

    `).join("");

}


/* =========================================================
   OPEN TASK MODAL
========================================================= */

$("volunteerTaskList")
  ?.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-open-volunteer-task]"
        );

      if (!button) return;


      currentTask =
        volunteerTasks.find(
          task =>
            task.key ===
            button.dataset.openVolunteerTask
        );


      if (!currentTask) return;


      setText(
        "volunteerTaskModalTitle",
        currentTask.title || "Task"
      );

      setText(
        "volunteerTaskModalDescription",
        currentTask.description || "—"
      );

      setText(
        "volunteerTaskModalDeadline",
        formatDate(
          currentTask.deadline
        )
      );

      setText(
        "volunteerTaskModalPoints",
        numberValue(
          currentTask.points
        )
      );


      if (
        $("volunteerTaskProofPhoto")
      ) {

        $("volunteerTaskProofPhoto")
          .value = "";

      }


      if (
        $("volunteerTaskProofPreview")
      ) {

        $("volunteerTaskProofPreview")
          .innerHTML = "";

      }


      showMessage(
        "volunteerTaskFormMessage",
        ""
      );


      $("volunteerTaskModal")
        ?.classList.add("show");

    }
  );


$("closeVolunteerTaskModal")
  ?.addEventListener(
    "click",
    () => {

      $("volunteerTaskModal")
        ?.classList.remove("show");

    }
  );


/* =========================================================
   TASK PHOTO PREVIEW
========================================================= */

$("volunteerTaskProofPhoto")
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      const preview =
        $("volunteerTaskProofPreview");


      if (!preview) return;


      if (!file) {

        preview.innerHTML = "";

        return;
      }


      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        event.target.value = "";

        preview.innerHTML = "";

        showMessage(
          "volunteerTaskFormMessage",
          "Please select an image."
        );

        return;
      }


      const localURL =
        URL.createObjectURL(file);


      preview.innerHTML = `
        <img
          src="${localURL}"
          alt=""
          style="
            max-width:160px;
            border-radius:10px;
          "
        >
      `;

    }
  );


/* =========================================================
   SUBMIT TASK PROOF
   STORAGE TEMPORARILY NOT USED
========================================================= */

$("submitVolunteerTaskProof")
  ?.addEventListener(
    "click",
    async () => {

      if (!currentTask) return;


      const file =
        $("volunteerTaskProofPhoto")
          ?.files?.[0];


      if (!file) {

        showMessage(
          "volunteerTaskFormMessage",
          "Please select task proof photo."
        );

        return;
      }


      try {

        await update(
          ref(
            db,
            `volunteerTasks/${volunteerKey}/${currentTask.key}`
          ),
          {

            status:
              "pending_review",

            proofURL: "",

            proofFileName:
              file.name,

            proofFileType:
              file.type,

            proofFileSize:
              file.size,

            proofStoragePending:
              true,

            submittedAt:
              Date.now(),

            updatedAt:
              Date.now()

          }
        );


        showMessage(
          "volunteerTaskFormMessage",
          "Task submitted for Admin review.",
          true
        );


        setTimeout(
          () => {

            $("volunteerTaskModal")
              ?.classList.remove("show");

          },
          800
        );

      } catch (error) {

        console.error(
          "Task submit error:",
          error
        );


        showMessage(
          "volunteerTaskFormMessage",
          "Unable to submit task."
        );

      }

    }
  );


/* =========================================================
   SPORTS ORGANIZE UI
========================================================= */

function updateSportsSettingsVisibility() {

  const type =
    $("volunteerOrganizeType")
      ?.value;


  const settings =
    $("volunteerSportsRegistrationSettings");


  if (!settings) return;


  settings.classList.toggle(
    "show",
    type === "sports"
  );

}


$("volunteerOrganizeType")
  ?.addEventListener(
    "change",
    updateSportsSettingsVisibility
  );


function updateSportsRegistrationOptions() {

  const enabled =
    $("volunteerSportsRegistrationEnabled")
      ?.checked === true;


  $("volunteerSportsRegistrationOptions")
    ?.classList.toggle(
      "show",
      enabled
    );

}


$("volunteerSportsRegistrationEnabled")
  ?.addEventListener(
    "change",
    updateSportsRegistrationOptions
  );


updateSportsSettingsVisibility();
updateSportsRegistrationOptions();


/* =========================================================
   GET SPORTS CONFIG
========================================================= */

function getSportsConfiguration() {

  return {

    registrationEnabled:
      $("volunteerSportsRegistrationEnabled")
        ?.checked === true,

    gameName:
      clean(
        $("volunteerSportsGameName")
          ?.value
      ),

    participationType:
      clean(
        $("volunteerSportsParticipationType")
          ?.value
      ) || "individual",

    registrationLastDate:
      clean(
        $("volunteerSportsRegistrationLastDate")
          ?.value
      ),

    maxParticipants:
      numberValue(
        $("volunteerSportsMaxParticipants")
          ?.value
      ),

    minAge:
      numberValue(
        $("volunteerSportsMinAge")
          ?.value
      ),

    maxAge:
      numberValue(
        $("volunteerSportsMaxAge")
          ?.value
      ),

    teamSize:
      numberValue(
        $("volunteerSportsTeamSize")
          ?.value
      ),

    entryFee:
      numberValue(
        $("volunteerSportsEntryFee")
          ?.value
      ),

    rules:
      clean(
        $("volunteerSportsRules")
          ?.value
      ),

    registrationFields: {

      name: true,

      mobile: true,

      age:
        $("volunteerSportsFieldAge")
          ?.checked === true,

      gender:
        $("volunteerSportsFieldGender")
          ?.checked === true,

      area:
        $("volunteerSportsFieldArea")
          ?.checked === true,

      teamName:
        $("volunteerSportsFieldTeamName")
          ?.checked === true

    }

  };

}


/* =========================================================
   VALIDATE SPORTS CONFIG
========================================================= */

function validateSportsConfiguration(
  config
) {

  if (
    !config.registrationEnabled
  ) {

    return "";

  }


  if (!config.gameName) {

    return (
      "Please enter Sport / Game Name."
    );

  }


  if (
    config.minAge > 0 &&
    config.maxAge > 0 &&
    config.minAge >
      config.maxAge
  ) {

    return (
      "Minimum age cannot be greater than maximum age."
    );

  }


  if (
    config.participationType ===
      "team" &&
    config.teamSize <= 0
  ) {

    return (
      "Please enter Team Size."
    );

  }


  return "";

}


/* =========================================================
   ORGANIZE FORM SUBMIT
========================================================= */

$("volunteerOrganizeForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!currentVolunteer) {

        return;

      }


      showMessage(
        "volunteerOrganizeMessage",
        ""
      );


      const type =
        clean(
          $("volunteerOrganizeType")
            ?.value
        );


      const title =
        clean(
          $("volunteerOrganizeTitle")
            ?.value
        );


      const date =
        clean(
          $("volunteerOrganizeDate")
            ?.value
        );


      const time =
        clean(
          $("volunteerOrganizeTime")
            ?.value
        );


      const venue =
        clean(
          $("volunteerOrganizeVenue")
            ?.value
        );


      const description =
        clean(
          $("volunteerOrganizeDescription")
            ?.value
        );


      if (
        !type ||
        !title ||
        !description
      ) {

        showMessage(
          "volunteerOrganizeMessage",
          "Please complete required fields."
        );

        return;
      }


      let sportsConfig = null;


      if (type === "sports") {

        sportsConfig =
          getSportsConfiguration();


        const error =
          validateSportsConfiguration(
            sportsConfig
          );


        if (error) {

          showMessage(
            "volunteerOrganizeMessage",
            error
          );

          return;
        }

      }


      try {

        const proposalRef =
          push(
            ref(
              db,
              "proposals"
            )
          );


        const proposal = {

          proposalId:
            proposalRef.key,

          type,

          title,

          date,

          time,

          venue,

          description,


          organizerType:
            "volunteer",

          organizerKey:
            volunteerKey,

          organizerId:
            currentVolunteer.volunteerId ||
            "",

          organizerName:
            currentVolunteer.name ||
            "Volunteer",


          status:
            "pending",

          adminRemark:
            "",

          createdAt:
            Date.now(),

          updatedAt:
            Date.now()

        };


        /*
          SPORTS CONFIGURATION
        */

        if (
          type === "sports"
        ) {

          proposal.sportsConfig =
            sportsConfig;


          /*
            Duplicate important fields
            at root level too.

            This makes Admin/Public
            rendering easier.
          */

          proposal.registrationEnabled =
            sportsConfig.registrationEnabled;

          proposal.gameName =
            sportsConfig.gameName;

          proposal.participationType =
            sportsConfig.participationType;

          proposal.registrationLastDate =
            sportsConfig.registrationLastDate;

          proposal.maxParticipants =
            sportsConfig.maxParticipants;

          proposal.minAge =
            sportsConfig.minAge;

          proposal.maxAge =
            sportsConfig.maxAge;

          proposal.teamSize =
            sportsConfig.teamSize;

          proposal.entryFee =
            sportsConfig.entryFee;

          proposal.sportsRules =
            sportsConfig.rules;

          proposal.registrationFields =
            sportsConfig.registrationFields;

        }


        await set(
          proposalRef,
          proposal
        );


        showMessage(
          "volunteerOrganizeMessage",

          type === "sports"
            ? "Sports proposal with Registration Form sent to Admin."
            : "Proposal sent to Admin successfully.",

          true
        );


        event.target.reset();


        /*
          RESET DEFAULT SPORTS
          SETTINGS
        */

        if (
          $("volunteerSportsRegistrationEnabled")
        ) {

          $("volunteerSportsRegistrationEnabled")
            .checked = true;

        }


        if (
          $("volunteerSportsFieldAge")
        ) {

          $("volunteerSportsFieldAge")
            .checked = true;

        }


        if (
          $("volunteerSportsFieldGender")
        ) {

          $("volunteerSportsFieldGender")
            .checked = true;

        }


        if (
          $("volunteerSportsFieldTeamName")
        ) {

          $("volunteerSportsFieldTeamName")
            .checked = true;

        }


        updateSportsSettingsVisibility();

        updateSportsRegistrationOptions();


      } catch (error) {

        console.error(
          "Proposal error:",
          error
        );


        showMessage(
          "volunteerOrganizeMessage",
          "Unable to send proposal."
        );

      }

    }
  );


/* =========================================================
   MY PROPOSALS
========================================================= */

function renderMyProposals() {

  const container =
    $("volunteerOrganizeList");

  if (!container) return;


  const mine =
    proposals
      .filter(proposal => {

        return (
          proposal.organizerType ===
            "volunteer" &&
          proposal.organizerKey ===
            volunteerKey
        );

      })
      .sort(
        (a, b) =>
          numberValue(
            b.createdAt
          ) -
          numberValue(
            a.createdAt
          )
      );


  if (!mine.length) {

    container.innerHTML = `
      <div class="simple-item">
        No proposals submitted yet.
      </div>
    `;

    return;
  }


  container.innerHTML =
    mine.map(proposal => {

      const isSports =
        normalize(
          proposal.type
        ) === "sports";


      return `

        <div class="simple-item">

          <strong>
            ${escapeHTML(
              proposal.title ||
              "Proposal"
            )}
          </strong>

          <p>
            ${escapeHTML(
              (
                proposal.type ||
                ""
              ).toUpperCase()
            )}

            •

            ${escapeHTML(
              proposal.status ||
              "pending"
            )}
          </p>


          ${
            proposal.date
              ? `
                <small>
                  Date:
                  ${escapeHTML(
                    formatDate(
                      proposal.date
                    )
                  )}
                </small>
              `
              : ""
          }


          ${
            isSports &&
            proposal.registrationEnabled
              ? `

                <p
                  style="
                    color:#147D64;
                    font-weight:900;
                  "
                >
                  ✓ Registration Form Enabled
                </p>

                <small>

                  Game:
                  ${escapeHTML(
                    proposal.gameName ||
                    "—"
                  )}

                  •

                  ${
                    numberValue(
                      proposal.entryFee
                    ) > 0

                      ? `₹${numberValue(
                          proposal.entryFee
                        )} Entry`

                      : "Free Entry"
                  }

                </small>

              `
              : ""
          }


          ${
            proposal.adminRemark
              ? `
                <p>
                  Admin:
                  ${escapeHTML(
                    proposal.adminRemark
                  )}
                </p>
              `
              : ""
          }

        </div>

      `;

    }).join("");

}


/* =========================================================
   VOLUNTEER RANKING
========================================================= */

function renderRanking() {

  const approved =
    volunteers
      .filter(
        volunteer =>
          normalize(
            volunteer.status
          ) === "approved"
      )
      .sort(
        (a, b) => {

          const pointDifference =
            numberValue(
              b.points
            ) -
            numberValue(
              a.points
            );


          if (
            pointDifference !== 0
          ) {

            return pointDifference;

          }


          return (
            numberValue(
              b.rating
            ) -
            numberValue(
              a.rating
            )
          );

        }
      );


  const myIndex =
    approved.findIndex(
      volunteer =>
        volunteer.key ===
        volunteerKey
    );


  const rank =
    myIndex >= 0
      ? myIndex + 1
      : "—";


  setText(
    "volunteerRank",
    rank
  );

  setText(
    "performanceVolunteerRank",
    rank
  );


  const body =
    $("volunteerRankingList");

  if (!body) return;


  if (!approved.length) {

    body.innerHTML = `
      <tr>
        <td colspan="5">
          No ranking available.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    approved.map(
      (volunteer, index) => {

        const isMe =
          volunteer.key ===
          volunteerKey;


        return `

          <tr
            ${
              isMe
                ? `style="background:rgba(214,173,69,.12);"`
                : ""
            }
          >

            <td>
              #${index + 1}
            </td>

            <td>
              ${escapeHTML(
                volunteer.name ||
                "Volunteer"
              )}
              ${
                isMe
                  ? " (You)"
                  : ""
              }
            </td>

            <td>
              ${escapeHTML(
                volunteer.volunteerId ||
                "—"
              )}
            </td>

            <td>
              ${numberValue(
                volunteer.points
              )}
            </td>

            <td>
              ${
                numberValue(
                  volunteer.rating
                )
                  ? numberValue(
                      volunteer.rating
                    ).toFixed(1)
                  : "0"
              }
            </td>

          </tr>

        `;

      }
    ).join("");

}


/* =========================================================
   COMPLAINTS
========================================================= */

function loadComplaints() {

  onValue(
    ref(
      db,
      "complaints"
    ),
    snapshot => {

      const complaints =
        objectToArray(
          snapshot.val()
        );


      const mine =
        complaints.filter(
          complaint => {

            const mobileMatch =
              currentVolunteer?.mobile &&
              clean(
                complaint.complainantMobile ||
                complaint.mobile
              ) ===
              clean(
                currentVolunteer.mobile
              );


            const nameMatch =
              normalize(
                complaint.complainantName
              ) ===
              normalize(
                currentVolunteer?.name
              );


            return (
              mobileMatch ||
              nameMatch
            );

          }
        );


      const body =
        $("volunteerComplaintList");


      if (!body) return;


      if (!mine.length) {

        body.innerHTML = `
          <tr>
            <td colspan="5">
              No complaints found.
            </td>
          </tr>
        `;

        return;
      }


      body.innerHTML =
        mine.map(
          complaint => `

            <tr>

              <td>
                ${escapeHTML(
                  complaint.complaintId ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  complaint.complaintAgainstName ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  complaint.reason ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHTML(
                  complaint.status ||
                  "submitted"
                )}
              </td>

              <td>
                ${escapeHTML(
                  complaint.adminReply ||
                  "—"
                )}
              </td>

            </tr>

          `
        ).join("");

    }
  );

}


/* =========================================================
   PUBLIC CONTENT
========================================================= */

function renderPublicContent(
  path,
  containerId,
  sportsMode = false
) {

  onValue(
    ref(
      db,
      path
    ),
    snapshot => {

      const container =
        $(containerId);

      if (!container) return;


      const list =
        objectToArray(
          snapshot.val()
        )
          .filter(item => {

            const status =
              normalize(
                item.status
              );

            return (
              !status ||
              [
                "active",
                "approved",
                "published",
                "upcoming"
              ].includes(status)
            );

          })
          .sort(
            (a, b) =>
              numberValue(
                b.createdAt
              ) -
              numberValue(
                a.createdAt
              )
          );


      if (!list.length) {

        container.innerHTML = `
          <div class="simple-item">
            No records available.
          </div>
        `;

        return;
      }


      container.innerHTML =
        list.map(item => `

          <div class="simple-item">

            <strong>
              ${escapeHTML(
                item.title ||
                item.name ||
                "Update"
              )}
            </strong>


            ${
              item.date
                ? `
                  <p>
                    ${escapeHTML(
                      formatDate(
                        item.date
                      )
                    )}
                  </p>
                `
                : ""
            }


            ${
              item.venue
                ? `
                  <p>
                    📍
                    ${escapeHTML(
                      item.venue
                    )}
                  </p>
                `
                : ""
            }


            ${
              item.description
                ? `
                  <p>
                    ${escapeHTML(
                      item.description
                    )}
                  </p>
                `
                : ""
            }


            ${
              sportsMode &&
              item.registrationEnabled
                ? `

                  <p
                    style="
                      color:#147D64;
                      font-weight:900;
                    "
                  >
                    ✓ Registration Open
                  </p>

                  <small>

                    ${
                      escapeHTML(
                        item.gameName ||
                        item.title ||
                        "Sports"
                      )
                    }

                    ${
                      item.registrationLastDate
                        ? `
                          • Last Date:
                          ${escapeHTML(
                            formatDate(
                              item.registrationLastDate
                            )
                          )}
                        `
                        : ""
                    }

                  </small>

                `
                : ""
            }

          </div>

        `).join("");

    }
  );

}


/* =========================================================
   TASKS LIVE
========================================================= */

onValue(
  ref(
    db,
    `volunteerTasks/${volunteerKey}`
  ),
  snapshot => {

    volunteerTasks =
      objectToArray(
        snapshot.val()
      )
        .sort(
          (a, b) =>
            numberValue(
              b.createdAt
            ) -
            numberValue(
              a.createdAt
            )
        );


    renderTasks();

  }
);


/* =========================================================
   VOLUNTEERS LIVE / RANKING
========================================================= */

onValue(
  ref(
    db,
    "volunteers"
  ),
  snapshot => {

    volunteers =
      objectToArray(
        snapshot.val()
      );


    renderRanking();

  }
);


/* =========================================================
   PROPOSALS LIVE
========================================================= */

onValue(
  ref(
    db,
    "proposals"
  ),
  snapshot => {

    proposals =
      objectToArray(
        snapshot.val()
      );


    renderMyProposals();

  }
);


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      $("volunteerTaskModal")
        ?.classList.remove("show");

      $("volunteerSidebar")
        ?.classList.remove("open");

    }

  }
);


/* =========================================================
   START
========================================================= */

async function startVolunteerPortal() {

  await loadVolunteer();

  loadComplaints();


  renderPublicContent(
    "festivals",
    "volunteerFestivalList"
  );


  renderPublicContent(
    "sports",
    "volunteerSportsList",
    true
  );


  renderPublicContent(
    "updates",
    "volunteerUpdatesList"
  );


  renderPublicContent(
    "gallery",
    "volunteerGalleryList"
  );

}


startVolunteerPortal();


console.log(
  "AAKASH EARTH Volunteer Portal + Sports Registration Proposal System connected."
);