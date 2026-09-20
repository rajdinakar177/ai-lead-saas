import parsePhoneNumber, { type CountryCode } from "libphonenumber-js";

export type PhoneValidationResult = {
  valid: boolean;
  normalized: string | null;
  formatted: string | null;
  error: string | null;
};

export function validatePhoneNumber(
  value: string,
  country: string = "US",
): PhoneValidationResult {
  const input = value.trim();

  if (!input) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      error: "Phone number is required.",
    };
  }

  try {
    const phoneNumber = parsePhoneNumber(
      input,
      country.toUpperCase() as CountryCode,
    );

    if (!phoneNumber) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        error: "Please enter a valid phone number.",
      };
    }

    if (!phoneNumber.isPossible()) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        error: "That phone number does not look complete.",
      };
    }

    return {
      valid: true,

      // E.164 format, best format for DB/SMS providers.
      normalized: phoneNumber.number,

      formatted: phoneNumber.formatInternational(),

      error: null,
    };
  } catch {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      error: "Please enter a valid phone number.",
    };
  }
}
