export const en = {
  errors: {
    // Generic errors
    generic: "Something went wrong. Please try again.",
    networkError: "Connection issue. Please try again in a moment.",
    sessionExpired: "Your session has expired. Please log in again.",

    // Django REST Framework validations (keep as-is since they're already in English)
    validation: {
      "Ensure this value is greater than or equal to":
        "Ensure this value is greater than or equal to",
      "Ensure this value is less than or equal to":
        "Ensure this value is less than or equal to",
      "This field is required.": "This field is required.",
      "This field may not be blank.": "This field may not be blank.",
      "This field may not be null.": "This field may not be null.",
      "Not found.": "Not found.",
      "A valid integer is required.": "A valid integer is required.",
      "A valid number is required.": "A valid number is required.",
      "Enter a valid email address.": "Enter a valid email address.",
      "Enter a valid URL.": "Enter a valid URL.",
      "This password is too short.": "This password is too short.",
      "This password is too common.": "This password is too common.",
      "This password is entirely numeric.": "This password is entirely numeric.",
      "The two password fields didn't match.": "The two password fields didn't match.",
      "A user with that username already exists.":
        "A user with that username already exists.",
      "A user with that email already exists.":
        "A user with that email already exists.",
      "Unable to log in with provided credentials.":
        "Unable to log in with provided credentials.",
      "Invalid token.": "Invalid token.",
      "Token has expired.": "Token has expired.",
      "No active account found with the given credentials.":
        "No active account found with the given credentials.",
      "String value too large.": "String value too large.",
      "Ensure this field has no more than": "Ensure this field has no more than",
      "Ensure this field has at least": "Ensure this field has at least",
      characters: "characters",
      "Invalid pk": "Invalid pk",
      "does not exist.": "does not exist.",
      "Incorrect type.": "Incorrect type.",
      "Expected a": "Expected a",
      "but got": "but got",
      "This list may not be empty.": "This list may not be empty.",
      "Duplicate values are not allowed.": "Duplicate values are not allowed.",
    },
  },
} as const
