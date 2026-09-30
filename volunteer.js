/* =========================================================
   AAKASH EARTH - VOLUNTEER REGISTRATION
   firebase.js KO TOUCH NAHI KARNA

   IMPORTANT:
   Firebase Storage temporarily NOT used.
   Volunteer application Realtime Database me save hogi.
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

const form =
  document.getElementById(
    "volunteerRegistrationForm"
  );

const nameInput =
  document.getElementById(
    "volunteerName"
  );

const mobileInput =
  document.getElementById(
    "volunteerMobile"
  );

const dobInput =
  document.getElementById(
    "volunteerDob"
  );

const genderInput =
  document.getElementById(
    "volunteerGender"
  );

const yearInput =
  document.getElementById(
    "volunteerYear"
  );

const areaInput =
  document.getElementById(
    "volunteerArea"
  );

const addressInput =
  document.getElementById(
    "volunteerAddress"
  );

const reasonInput =
  document.getElementById(
    "volunteerReason"
  );

const photoInput =
  document.getElementById(
    "volunteerPhoto"
  );

const photoPreview =
  document.getElementById(
    "volunteerPhotoPreview"
  );

const termsInput =
  document.getElementById(
    "volunteerTerms"
  );

const messageBox =
  document.getElementById(
    "volunteerMessage"
  );

const submitButton =
  document.getElementById(
    "volunteerSubmit"
  );

const submitText =
  document.getElementById(
    "volunteerSubmitText"
  );

const formContent =
  document.getElementById(
    "registrationFormContent"
  );

const successBox =
  document.getElementById(
    "registrationSuccess"
  );

const successApplicationId =
  document.getElementById(
    "successApplicationId"
  );


/* =========================================================
   STATE
========================================================= */

let selectedPhoto = null;


/* =========================================================
   HELPERS
========================================================= */

function cleanText(value = "") {
  return String(value).trim();
}

function cleanMobile(value = "") {
  return String(value)
    .replace(/\D/g, "")
    .slice(0, 10);
}

function showMessage(
  message,
  type = "error"
) {
  if (!messageBox) return;

  messageBox.textContent =
    message;

  messageBox.className =
    `vol-message show ${type}`;
}

function clearMessage() {
  if (!messageBox) return;

  messageBox.textContent = "";

  messageBox.className =
    "vol-message";
}

function setLoading(loading) {
  if (!submitButton) return;

  submitButton.disabled = loading;

  if (submitText) {
    submitText.textContent =
      loading
        ? "Submitting Application..."
        : "Submit Volunteer Application";
  }
}


/* =========================================================
   MOBILE - NUMBERS ONLY
========================================================= */

mobileInput?.addEventListener(
  "input",
  () => {
    mobileInput.value =
      cleanMobile(
        mobileInput.value
      );
  }
);


/* =========================================================
   PHOTO PREVIEW
   NO FIREBASE STORAGE UPLOAD
========================================================= */

photoInput?.addEventListener(
  "change",
  () => {
    clearMessage();

    const file =
      photoInput.files?.[0];

    selectedPhoto = null;

    if (!file) {
      photoPreview.innerHTML =
        "👤";

      return;
    }


    /* IMAGE CHECK */

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      photoInput.value = "";

      photoPreview.innerHTML =
        "👤";

      showMessage(
        "Please select a valid image file.",
        "error"
      );

      return;
    }


    /* 5 MB LIMIT */

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      photoInput.value = "";

      photoPreview.innerHTML =
        "👤";

      showMessage(
        "Photo must be 5 MB or smaller.",
        "error"
      );

      return;
    }


    selectedPhoto = file;


    /* LOCAL PREVIEW */

    const reader =
      new FileReader();

    reader.onload = () => {
      photoPreview.innerHTML = `
        <img
          src="${reader.result}"
          alt="Volunteer Photo Preview"
        >
      `;
    };

    reader.onerror = () => {
      selectedPhoto = null;

      photoInput.value = "";

      photoPreview.innerHTML =
        "👤";

      showMessage(
        "Unable to preview selected photo.",
        "error"
      );
    };

    reader.readAsDataURL(file);
  }
);


/* =========================================================
   APPLICATION ID
========================================================= */

function randomCode(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  const cryptoArray =
    new Uint32Array(length);

  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(
      cryptoArray
    );

    for (
      let i = 0;
      i < length;
      i++
    ) {
      result +=
        chars[
          cryptoArray[i] %
          chars.length
        ];
    }

    return result;
  }

  for (
    let i = 0;
    i < length;
    i++
  ) {
    result +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];
  }

  return result;
}

function generateApplicationId(
  year
) {
  const applicationYear =
    year ||
    new Date().getFullYear();

  return (
    `AE-VAPP-${applicationYear}-` +
    randomCode(6)
  );
}


/* =========================================================
   CHECK DUPLICATE MOBILE
========================================================= */

async function mobileAlreadyRegistered(
  mobile
) {
  const snapshot =
    await get(
      ref(db, "volunteers")
    );

  if (!snapshot.exists()) {
    return false;
  }

  const volunteers =
    snapshot.val();

  return Object.values(
    volunteers
  ).some((volunteer) => {
    if (!volunteer) {
      return false;
    }

    return (
      cleanMobile(
        volunteer.mobile
      ) === mobile
    );
  });
}


/* =========================================================
   FORM SUBMIT
========================================================= */

form?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();


    /* ---------------------------------------------
       READ VALUES
    --------------------------------------------- */

    const name =
      cleanText(
        nameInput?.value
      );

    const mobile =
      cleanMobile(
        mobileInput?.value
      );

    const dob =
      cleanText(
        dobInput?.value
      );

    const gender =
      cleanText(
        genderInput?.value
      );

    const year =
      cleanText(
        yearInput?.value
      );

    const area =
      cleanText(
        areaInput?.value
      );

    const address =
      cleanText(
        addressInput?.value
      );

    const reason =
      cleanText(
        reasonInput?.value
      );


    /* ---------------------------------------------
       VALIDATION
    --------------------------------------------- */

    if (!name) {
      showMessage(
        "Please enter your full name.",
        "error"
      );

      nameInput?.focus();

      return;
    }


    if (name.length < 2) {
      showMessage(
        "Please enter a valid full name.",
        "error"
      );

      nameInput?.focus();

      return;
    }


    if (mobile.length !== 10) {
      showMessage(
        "Please enter a valid 10-digit mobile number.",
        "error"
      );

      mobileInput?.focus();

      return;
    }


    if (!year) {
      showMessage(
        "Please select volunteer year.",
        "error"
      );

      yearInput?.focus();

      return;
    }


    if (!address) {
      showMessage(
        "Please enter your address.",
        "error"
      );

      addressInput?.focus();

      return;
    }


    if (
      !termsInput?.checked
    ) {
      showMessage(
        "Please confirm the declaration before submitting.",
        "error"
      );

      return;
    }


    try {
      setLoading(true);


      /* ---------------------------------------------
         CHECK DUPLICATE MOBILE
      --------------------------------------------- */

      showMessage(
        "Checking registration details...",
        "success"
      );

      const duplicate =
        await mobileAlreadyRegistered(
          mobile
        );

      if (duplicate) {
        throw new Error(
          "An application with this mobile number already exists. Please contact the administrator."
        );
      }


      /* ---------------------------------------------
         GENERATE APPLICATION ID
      --------------------------------------------- */

      const applicationId =
        generateApplicationId(
          year
        );


      /* ---------------------------------------------
         CREATE FIREBASE RECORD
      --------------------------------------------- */

      const volunteerRef =
        push(
          ref(db, "volunteers")
        );


      /*
        IMPORTANT:

        Photo Firebase Storage me upload nahi ho rahi.

        selected photo ka:
        - filename
        - size
        - type

        database me save hoga.

        Later Storage fix hone ke baad actual photoURL
        add kar sakte hain.
      */

      const volunteerData = {
        applicationId,

        volunteerId: "",

        name,
        mobile,
        dob,
        gender,
        year,
        area,
        address,
        reason,

        photoURL: "",

        photoName:
          selectedPhoto?.name ||
          "",

        photoType:
          selectedPhoto?.type ||
          "",

        photoSize:
          selectedPhoto?.size ||
          0,

        photoStoragePending:
          Boolean(selectedPhoto),

        status:
          "pending",

        points:
          0,

        rating:
          0,

        rank:
          null,

        approvedAt:
          null,

        approvedBy:
          null,

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()
      };


      /* ---------------------------------------------
         SAVE
      --------------------------------------------- */

      showMessage(
        "Saving volunteer application...",
        "success"
      );

      await set(
        volunteerRef,
        volunteerData
      );


      /* ---------------------------------------------
         SUCCESS
      --------------------------------------------- */

      if (
        successApplicationId
      ) {
        successApplicationId.textContent =
          applicationId;
      }


      formContent?.classList.add(
        "hidden"
      );

      successBox?.classList.add(
        "show"
      );


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });


      console.log(
        "Volunteer application saved:",
        volunteerRef.key
      );
    }

    catch (error) {
      console.error(
        "Volunteer registration error:",
        error
      );


      let message =
        error?.message ||
        "Unable to submit application. Please try again.";


      /* Firebase permission error */

      if (
        String(error?.code || "")
          .includes(
            "PERMISSION_DENIED"
          ) ||
        String(error?.message || "")
          .toLowerCase()
          .includes(
            "permission"
          )
      ) {
        message =
          "Firebase Database permission denied. Please check Realtime Database rules.";
      }


      /* Network */

      if (
        String(error?.message || "")
          .toLowerCase()
          .includes(
            "network"
          )
      ) {
        message =
          "Network error. Please check your internet connection and try again.";
      }


      showMessage(
        message,
        "error"
      );
    }

    finally {
      setLoading(false);
    }
  }
);


/* =========================================================
   PREVENT FUTURE DOB
========================================================= */

if (dobInput) {
  const today =
    new Date();

  const yyyy =
    today.getFullYear();

  const mm =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const dd =
    String(
      today.getDate()
    ).padStart(2, "0");

  dobInput.max =
    `${yyyy}-${mm}-${dd}`;
}


/* =========================================================
   DEFAULT YEAR
========================================================= */

if (
  yearInput &&
  !yearInput.value
) {
  const currentYear =
    String(
      new Date().getFullYear()
    );

  const optionExists =
    [...yearInput.options].some(
      (option) =>
        option.value ===
        currentYear
    );

  if (optionExists) {
    yearInput.value =
      currentYear;
  }
}


/* =========================================================
   START
========================================================= */

console.log(
  "AAKASH EARTH Volunteer Registration connected."
);