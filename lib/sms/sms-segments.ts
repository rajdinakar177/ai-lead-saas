/*
 * GSM-7 characters.
 *
 * Characters in GSM_7_EXTENSION_TABLE consume
 * two septets because they require the escape character.
 */

const GSM_7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ" +
  " !\"#¤%&'()*+,-./" +
  "0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿" +
  "abcdefghijklmnopqrstuvwxyzäöñüà";

const GSM_7_EXTENSION = "^{}\\[~]|€";

export type SmsEncoding = "GSM-7" | "UCS-2";

export type SmsSegmentInfo = {
  encoding: SmsEncoding;
  segments: number;
  units: number;
  singleSegmentLimit: number;
  multipartSegmentLimit: number;
};

function getGsm7Units(text: string): number | null {
  let units = 0;

  for (const char of text) {
    if (GSM_7_BASIC.includes(char)) {
      units += 1;
      continue;
    }

    if (GSM_7_EXTENSION.includes(char)) {
      units += 2;
      continue;
    }

    return null;
  }

  return units;
}

export function calculateSmsSegments(text: string): SmsSegmentInfo {
  if (!text) {
    return {
      encoding: "GSM-7",
      segments: 0,
      units: 0,
      singleSegmentLimit: 160,
      multipartSegmentLimit: 153,
    };
  }

  const gsmUnits = getGsm7Units(text);

  /*
   * GSM-7
   */
  if (gsmUnits !== null) {
    const segments = gsmUnits <= 160 ? 1 : Math.ceil(gsmUnits / 153);

    return {
      encoding: "GSM-7",
      segments,
      units: gsmUnits,
      singleSegmentLimit: 160,
      multipartSegmentLimit: 153,
    };
  }

  /*
   * UCS-2 / Unicode.
   *
   * JavaScript string length counts UTF-16 code units,
   * which gives us a closer pre-send estimate for
   * Twilio SMS segmentation, including surrogate pairs.
   */
  const unicodeUnits = text.length;

  const segments = unicodeUnits <= 70 ? 1 : Math.ceil(unicodeUnits / 67);

  return {
    encoding: "UCS-2",
    segments,
    units: unicodeUnits,
    singleSegmentLimit: 70,
    multipartSegmentLimit: 67,
  };
}
