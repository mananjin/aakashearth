/* =========================================================
   AAKASH EARTH - PUBLIC COMPLAINT SYSTEM
   Realtime Database only
   Firebase Storage temporarily NOT used
========================================================= */

import {
  db,
  ref,
  push,
  set,
  get
} from "./firebase.js";


/* =========================================================
   ELEMENTS
========================================================= */

const complaintForm =
  document.getElementById("complaintForm");

const complainantName =
  document.getElementById("complainantName");

const complainantMobile =
  document.getElementById("complainantMobile");

const complainantAddress =
  document.getElementById("complainantAddress");

const complaintAgainstType =
  document.getElementById("complaintAgainstType");

const complaintAgainstName =
  document.getElementById("complaintAgainstName");

const complaintAgainstId =
  document.getElementById("complaintAgainstId");

const complaintAgainstIdField =
  document.getElementById("complaintAgainstIdField");

const complaintReason =
  document.getElementById("complaintReason");

const complaintDescription =
  document.getElementById("complaintDescription");

const complaintIncidentDate =
  document.getElementById("complaintIncidentDate");

const complaintIncidentTime =
  document.getElementById("complaintIncidentTime");

const complaintProof =
  document.getElementById("complaintProof");

const complaintProofPreview =
  document.getElementById("complaintProofPreview");

const complaintMessage =
  document.getElementById("complaintMessage");

const complaintSubmit =
  document.getElementById("complaintSubmit");

const complaintSubmitText =
  document.getElementById("complaintSubmitText");

const complaintFormContent =
  document.getElementById("complaintFormContent");

const complaintSuccess =
  document.getElementById("complaintSuccess");

const successComplaintId =
  document.getElementById("successComplaintId");

const submitAnotherComplaint =
  document.getElementById("submitAnotherComplaint");


/* TRACKING */

const complaintTrackForm =
  document.getElementById("complaintTrackForm");

const trackComplaintId =
  document.getElementById("trackComplaintId");

const trackComplaintMobile =
  document.getElementById("trackComplaintMobile");

const trackComplaintButton =
  document.getElementById("trackComplaintButton");

const trackComplaintMessage =
  document.getElementById("trackComplaintMessage");

const complaintTrackResult =
  document.getElementById("complaintTrackResult");


/* =========================================================
   STATE
========================================================= */

let selectedProofFile = null;


/* =========================================================
   HELPERS
========================================================= */

function cleanText(value = "") {
  return String(value).trim();
}

function cleanMobile(value = "") {
  let mobile =
    String(value)
      .replace(/\D/g, "");

  /*
    Support old records saved as:
    +91xxxxxxxxxx
    91xxxxxxxxxx
  */

  if (
    mobile.length === 12 &&
    mobile.startsWith("91")
  ) {
    mobile = mobile.slice(-10);
  }

  return mobile.slice(0, 10);
}

function normalize(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(
  message,
  type = "error"
) {
  if (!complaintMessage) return;

  complaintMessage.textContent =
    message;

  complaintMessage.className =
    `complaint-message show ${type}`;
}

function clearMessage() {
  if (!complaintMessage) return;

  complaintMessage.textContent = "";

  complaintMessage.className =
    "complaint-message";
}

function setSubmitting(loading) {
  if (complaintSubmit) {
    complaintSubmit.disabled =
      loading;
  }

  if (complaintSubmitText) {
    complaintSubmitText.textContent =
      loading
        ? "Submitting Complaint..."
        : "Submit Complaint →";
  }
}

function formatDate(value) {
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
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

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

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

function statusLabel(value) {
  const status =
    normalize(value);

  const labels = {
    submitted: "Submitted",
    under_review: "Under Review",
    in_progress: "In Progress",
    resolved: "Resolved",
    rejected: "Rejected"
  };

  return (
    labels[status] ||
    String(value || "Submitted")
      .replaceAll("_", " ")
  );
}


/* =========================================================
   RANDOM ID
========================================================= */

function randomCode(length = 6) {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  if (
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    const values =
      new Uint32Array(length);

    window.crypto.getRandomValues(
      values
    );

    for (
      let index = 0;
      index < length;
      index++
    ) {
      result +=
        characters[
          values[index] %
          characters.length
        ];
    }

    return result;
  }

  for (
    let index = 0;
    index < length;
    index++
  ) {
    result +=
      characters[
        Math.floor(
          Math.random() *
          characters.length
        )
      ];
  }

  return result;
}

function generateComplaintId() {
  const year =
    new Date().getFullYear();

  return (
    `AE-CMP-${year}-` +
    randomCode(6)
  );
}


/* =========================================================
   MOBILE INPUT
========================================================= */

complainantMobile?.addEventListener(
  "input",
  () => {
    complainantMobile.value =
      cleanMobile(
        complainantMobile.value
      );
  }
);

trackComplaintMobile?.addEventListener(
  "input",
  () => {
    trackComplaintMobile.value =
      cleanMobile(
        trackComplaintMobile.value
      );
  }
);


/* =========================================================
   AGAINST TYPE
========================================================= */

complaintAgainstType?.addEventListener(
  "change",
  () => {
    const type =
      normalize(
        complaintAgainstType.value
      );

    /*
      Member / Volunteer ke liye
      official ID useful hai.

      Admin / Other me ID field
      hide kar dete hain.
    */

    if (
      type === "member" ||
      type === "volunteer"
    ) {
      if (complaintAgainstIdField) {
        complaintAgainstIdField.style.display =
          "";
      }

      if (complaintAgainstId) {
        complaintAgainstId.placeholder =
          type === "member"
            ? "Example: AE-MEM-2026-XXXXXX"
            : "Example: AE-VOL-2026-XXXXXX";
      }
    } else {
      if (complaintAgainstIdField) {
        complaintAgainstIdField.style.display =
          "none";
      }

      if (complaintAgainstId) {
        complaintAgainstId.value = "";
      }
    }
  }
);


/* =========================================================
   PROOF PHOTO PREVIEW
   STORAGE NOT USED
========================================================= */

complaintProof?.addEventListener(
  "change",
  () => {
    clearMessage();

    const file =
      complaintProof.files?.[0];

    selectedProofFile = null;

    if (!file) {
      if (complaintProofPreview) {
        complaintProofPreview.src =
          "";

        complaintProofPreview.style.display =
          "none";
      }

      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      complaintProof.value = "";

      showMessage(
        "Please select a valid image file.",
        "error"
      );

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      complaintProof.value = "";

      showMessage(
        "Proof photo must be 5 MB or smaller.",
        "error"
      );

      return;
    }

    selectedProofFile = file;

    const reader =
      new FileReader();

    reader.onload = () => {
      if (!complaintProofPreview) {
        return;
      }

      complaintProofPreview.src =
        reader.result;

      complaintProofPreview.style.display =
        "block";
    };

    reader.onerror = () => {
      selectedProofFile = null;

      complaintProof.value = "";

      showMessage(
        "Unable to preview proof photo.",
        "error"
      );
    };

    reader.readAsDataURL(file);
  }
);


/* =========================================================
   INCIDENT DATE - NO FUTURE DATE
========================================================= */

if (complaintIncidentDate) {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  complaintIncidentDate.max =
    `${year}-${month}-${day}`;
}


/* =========================================================
   COMPLAINT SUBMISSION
========================================================= */

complaintForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();

    const name =
      cleanText(
        complainantName?.value
      );

    const mobile =
      cleanMobile(
        complainantMobile?.value
      );

    const address =
      cleanText(
        complainantAddress?.value
      );

    const againstType =
      normalize(
        complaintAgainstType?.value
      );

    const againstName =
      cleanText(
        complaintAgainstName?.value
      );

    const againstId =
      cleanText(
        complaintAgainstId?.value
      );

    const reason =
      cleanText(
        complaintReason?.value
      );

    const description =
      cleanText(
        complaintDescription?.value
      );

    const incidentDate =
      complaintIncidentDate?.value ||
      "";

    const incidentTime =
      complaintIncidentTime?.value ||
      "";


    /* VALIDATION */

    if (name.length < 2) {
      showMessage(
        "Please enter your full name.",
        "error"
      );

      complainantName?.focus();

      return;
    }

    if (mobile.length !== 10) {
      showMessage(
        "Please enter a valid 10-digit mobile number.",
        "error"
      );

      complainantMobile?.focus();

      return;
    }

    if (!address) {
      showMessage(
        "Please enter your address.",
        "error"
      );

      complainantAddress?.focus();

      return;
    }

    if (
      ![
        "member",
        "volunteer",
        "admin",
        "other"
      ].includes(againstType)
    ) {
      showMessage(
        "Please select who the complaint is against.",
        "error"
      );

      complaintAgainstType?.focus();

      return;
    }

    if (!againstName) {
      showMessage(
        "Please enter the person or party name.",
        "error"
      );

      complaintAgainstName?.focus();

      return;
    }

    if (!reason) {
      showMessage(
        "Please enter the complaint reason.",
        "error"
      );

      complaintReason?.focus();

      return;
    }

    if (
      description.length < 10
    ) {
      showMessage(
        "Please explain the complaint in more detail.",
        "error"
      );

      complaintDescription?.focus();

      return;
    }


    try {
      setSubmitting(true);

      showMessage(
        "Saving complaint...",
        "success"
      );


      /* GENERATE ID */

      const complaintId =
        generateComplaintId();


      /* CREATE FIREBASE KEY */

      const complaintRef =
        push(
          ref(db, "complaints")
        );


      /* DATA */

      const data = {
        complaintId,

        complainantName:
          name,

        complainantMobile:
          mobile,

        mobile,

        complainantAddress:
          address,

        address,

        complaintAgainstType:
          againstType,

        complaintAgainstName:
          againstName,

        complaintAgainstId:
          (
            againstType === "member" ||
            againstType === "volunteer"
          )
            ? againstId
            : "",

        reason,

        description,

        incidentDate,

        incidentTime,

        proofURL: "",

        proofPhotoName:
          selectedProofFile?.name ||
          "",

        proofPhotoType:
          selectedProofFile?.type ||
          "",

        proofPhotoSize:
          selectedProofFile?.size ||
          0,

        proofStoragePending:
          Boolean(
            selectedProofFile
          ),

        status:
          "submitted",

        adminReply:
          "",

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()
      };


      /* SAVE */

      await set(
        complaintRef,
        data
      );


      /* SUCCESS */

      if (successComplaintId) {
        successComplaintId.textContent =
          complaintId;
      }

      complaintFormContent
        ?.classList.add(
          "hidden"
        );

      complaintSuccess
        ?.classList.add(
          "show"
        );

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      console.log(
        "Complaint saved:",
        complaintId
      );
    }

    catch (error) {
      console.error(
        "Complaint submission error:",
        error
      );

      let message =
        "Unable to submit complaint. Please try again.";

      const errorText =
        String(
          error?.message || ""
        ).toLowerCase();

      if (
        errorText.includes(
          "permission"
        )
      ) {
        message =
          "Firebase Database permission denied. Please check Realtime Database rules.";
      }

      if (
        errorText.includes(
          "network"
        )
      ) {
        message =
          "Network error. Please check your internet connection.";
      }

      showMessage(
        message,
        "error"
      );
    }

    finally {
      setSubmitting(false);
    }
  }
);


/* =========================================================
   SUBMIT ANOTHER
========================================================= */

submitAnotherComplaint
  ?.addEventListener(
    "click",
    () => {
      complaintForm?.reset();

      selectedProofFile = null;

      clearMessage();

      if (complaintProofPreview) {
        complaintProofPreview.src =
          "";

        complaintProofPreview.style.display =
          "none";
      }

      complaintSuccess
        ?.classList.remove(
          "show"
        );

      complaintFormContent
        ?.classList.remove(
          "hidden"
        );

      if (
        complaintAgainstIdField
      ) {
        complaintAgainstIdField.style.display =
          "";
      }

      complainantName?.focus();
    }
  );


/* =========================================================
   TRACKING MESSAGE
========================================================= */

function showTrackMessage(
  message,
  isError = true
) {
  if (!trackComplaintMessage) {
    return;
  }

  trackComplaintMessage.textContent =
    message;

  trackComplaintMessage.style.display =
    "block";

  trackComplaintMessage.style.color =
    isError
      ? "#ffd2d7"
      : "#f5d98a";
}

function clearTrackMessage() {
  if (!trackComplaintMessage) {
    return;
  }

  trackComplaintMessage.textContent =
    "";

  trackComplaintMessage.style.display =
    "none";
}


/* =========================================================
   FIND COMPLAINT
========================================================= */

async function findComplaint(
  complaintId,
  mobile
) {
  const snapshot =
    await get(
      ref(db, "complaints")
    );

  if (!snapshot.exists()) {
    return null;
  }

  const records =
    snapshot.val();

  for (
    const [key, complaint]
    of Object.entries(records)
  ) {
    if (!complaint) {
      continue;
    }

    const storedId =
      normalize(
        complaint.complaintId
      );

    const storedMobile =
      cleanMobile(
        complaint.complainantMobile ||
        complaint.mobile
      );

    if (
      storedId ===
        normalize(complaintId) &&
      storedMobile === mobile
    ) {
      return {
        key,
        ...complaint
      };
    }
  }

  return null;
}


/* =========================================================
   RENDER TRACK RESULT
========================================================= */

function renderTrackResult(
  complaint
) {
  const againstType =
    String(
      complaint.complaintAgainstType ||
      "Other"
    );

  const againstName =
    String(
      complaint.complaintAgainstName ||
      "—"
    );

  document.getElementById(
    "trackResultId"
  ).textContent =
    complaint.complaintId ||
    "—";


  document.getElementById(
    "trackResultAgainst"
  ).textContent =
    `${againstType
      .charAt(0)
      .toUpperCase()}${againstType.slice(1)} — ${againstName}`;


  document.getElementById(
    "trackResultReason"
  ).textContent =
    complaint.reason ||
    "—";


  document.getElementById(
    "trackResultStatus"
  ).textContent =
    statusLabel(
      complaint.status
    );


  document.getElementById(
    "trackResultReply"
  ).textContent =
    complaint.adminReply ||
    "No reply yet";


  document.getElementById(
    "trackResultDate"
  ).textContent =
    complaint.createdAt
      ? formatDateTime(
          complaint.createdAt
        )
      : "—";


  complaintTrackResult
    ?.classList.add(
      "show"
    );
}


/* =========================================================
   TRACK COMPLAINT
========================================================= */

complaintTrackForm
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearTrackMessage();

      complaintTrackResult
        ?.classList.remove(
          "show"
        );


      const complaintId =
        cleanText(
          trackComplaintId?.value
        );

      const mobile =
        cleanMobile(
          trackComplaintMobile?.value
        );


      if (!complaintId) {
        showTrackMessage(
          "Please enter your Complaint ID."
        );

        return;
      }


      if (mobile.length !== 10) {
        showTrackMessage(
          "Please enter the same 10-digit mobile number used while submitting the complaint."
        );

        return;
      }


      try {
        if (
          trackComplaintButton
        ) {
          trackComplaintButton.disabled =
            true;

          trackComplaintButton.textContent =
            "Checking...";
        }


        const complaint =
          await findComplaint(
            complaintId,
            mobile
          );


        if (!complaint) {
          showTrackMessage(
            "Complaint not found. Please check your Complaint ID and registered mobile number."
          );

          return;
        }


        renderTrackResult(
          complaint
        );

        showTrackMessage(
          "Complaint record found.",
          false
        );
      }

      catch (error) {
        console.error(
          "Complaint tracking error:",
          error
        );

        showTrackMessage(
          "Unable to track complaint right now. Please try again."
        );
      }

      finally {
        if (
          trackComplaintButton
        ) {
          trackComplaintButton.disabled =
            false;

          trackComplaintButton.textContent =
            "Track Complaint →";
        }
      }
    }
  );


/* =========================================================
   START
========================================================= */

console.log(
  "AAKASH EARTH Public Complaint Portal connected."
);