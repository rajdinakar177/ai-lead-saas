import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export type DemoLead = {
  industry?: string;
  service?: string;
  location?: string;

  state?: string;
  stateCode?: string;
  address?: string;

  city?: string;
  cityVerified?: boolean;

  zipCode?: string;
  zipVerified?: boolean;

  urgency?: string;
  timeline?: string;
  name?: string;
  phone?: string;
  appointment?: string;
};

type Option = {
  label: string;
  value: string;
};

type Step =
  | "service"
  | "state"
  | "address"
  | "zipCode"
  | "city"
  | "urgency"
  | "timeline"
  | "name"
  | "phone";

type Reply = {
  lead: DemoLead;
  reply: string;
  options: Option[];
  readyToBook: boolean;
  status: "new" | "warm" | "hot";
};

type ZipPlace = {
  city: string;
  stateCode: string;
};

const STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

export const DEMO_WELCOME =
  "Hi! I can help you try a roofing or HVAC enquiry for a US property. " +
  "This is a simulated demo: use sample contact details, " +
  "and no real appointment or SMS will be created. " +
  "What do you need help with today?";

export const DEMO_SERVICE_OPTIONS: Option[] = [
  {
    label: "Roof leak",
    value: "My roof is leaking",
  },
  {
    label: "AC repair",
    value: "My AC is not cooling",
  },
  {
    label: "Heating repair",
    value: "My heating is not working",
  },
];

const PROMPTS: Record<Step, string> = {
  service: "What do you need help with: roofing, air conditioning, or heating?",

  state:
    "Which US state is the property in? Enter the full name, like Texas, or the abbreviation, TX.",

  address:
    "What's the street address, including the house number? Include an apartment or unit number if needed.",

  zipCode:
    "What's the property's 5-digit ZIP code? I'll check that it matches your state.",

  city: "Which city is the property in? I'll check that it matches your ZIP code and state.",

  urgency:
    "How urgent is the problem? Does it need attention right away, or can it wait?",

  timeline:
    "When would you like someone to visit: today, tomorrow, this week, or next week?",

  name: "Who should the team ask for? Please enter your name. A sample name is fine for this demo.",

  phone:
    "What's the best US phone number to reach you? Enter 10 digits, or +1 followed by 10 digits. No SMS will be sent in this demo.",
};

const OPTIONS: Partial<Record<Step, Option[]>> = {
  service: DEMO_SERVICE_OPTIONS,

  state: [
    { label: "Texas", value: "Texas" },
    { label: "California", value: "California" },
    { label: "Florida", value: "Florida" },
  ],

  urgency: [
    { label: "Urgent", value: "Urgent" },
    { label: "Can wait", value: "Not urgent" },
  ],

  timeline: [
    { label: "Today", value: "Today" },
    { label: "Tomorrow", value: "Tomorrow" },
    { label: "This week", value: "This week" },
    { label: "Next week", value: "Next week" },
  ],
};

const zipCache = new Map<
  string,
  {
    expires: number;
    places: ZipPlace[];
  }
>();

function nextStep(lead: DemoLead): Step | undefined {
  if (!lead.service) return "service";
  if (!lead.stateCode) return "state";
  if (!lead.address) return "address";

  if (!lead.zipCode || !lead.zipVerified) {
    return "zipCode";
  }

  if (!lead.city || !lead.cityVerified) {
    return "city";
  }

  if (!lead.urgency) return "urgency";
  if (!lead.timeline) return "timeline";
  if (!lead.name) return "name";
  if (!lead.phone) return "phone";

  return undefined;
}

function response(
  lead: DemoLead,
  message?: string,
  customOptions?: Option[],
): Reply {
  const step = nextStep(lead);

  const completedReply =
    `Thanks, ${lead.name}! Here's your enquiry:\n\n` +
    `Service: ${lead.service}\n` +
    `Address: ${lead.location}\n` +
    `Urgency: ${lead.urgency}\n` +
    `Preferred timing: ${lead.timeline}\n` +
    `Phone: ${lead.phone}\n\n` +
    "Choose a sample appointment below. " +
    "These times are illustrative, not live availability.";

  return {
    lead,

    reply: message ?? (step ? PROMPTS[step] : completedReply),

    options: customOptions ?? (step ? (OPTIONS[step] ?? []) : []),

    readyToBook: !step,

    status: !step ? "hot" : lead.service ? "warm" : "new",
  };
}

function readState(text: string): [string, string] | undefined {
  const value = text
    .replace(
      /^(?:i live in|i am in|i'm in|my state is|the state is|state:?)\s+/i,
      "",
    )
    .replace(/[.,!?]+$/, "")
    .trim()
    .replace(/\s+/g, " ");

  const normalized = value.toLowerCase();

  return Object.entries(STATES).find(([code, name]) => {
    return (
      code.toLowerCase() === normalized ||
      name.toLowerCase() === normalized ||
      (code === "DC" &&
        /^(?:washington,? dc|washington d\.c\.?|d\.c\.?)$/i.test(value))
    );
  });
}

function normalizeCity(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function getCityOptions(places: ZipPlace[]): Option[] {
  return [...new Set(places.map((place) => place.city))]
    .slice(0, 5)
    .map((city) => ({
      label: city,
      value: city,
    }));
}

async function lookupZip(zip: string): Promise<ZipPlace[]> {
  const cached = zipCache.get(zip);

  if (cached && cached.expires > Date.now()) {
    return cached.places;
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 6000);

  try {
    // Only the ZIP code is sent to this service.
    const result = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    if (result.status === 404) {
      return [];
    }

    if (!result.ok) {
      throw new Error("ZIP lookup unavailable.");
    }

    const data = await result.json();

    if (data["country abbreviation"] !== "US" || !Array.isArray(data.places)) {
      throw new Error("Unexpected ZIP lookup response.");
    }

    const places: ZipPlace[] = data.places.flatMap((place: unknown) => {
      if (!place || typeof place !== "object") {
        return [];
      }

      const record = place as Record<string, unknown>;

      const city = record["place name"];
      const stateCode = record["state abbreviation"];

      if (
        typeof city !== "string" ||
        typeof stateCode !== "string" ||
        !city.trim() ||
        !STATES[stateCode]
      ) {
        return [];
      }

      return [
        {
          city: city.trim(),
          stateCode,
        },
      ];
    });

    if (zipCache.size >= 256) {
      zipCache.clear();
    }

    zipCache.set(zip, {
      expires: Date.now() + 300_000,
      places,
    });

    return places;
  } finally {
    clearTimeout(timeout);
  }
}

function clearCity(lead: DemoLead) {
  delete lead.city;
  delete lead.cityVerified;
  delete lead.location;
  delete lead.appointment;
}

function clearZip(lead: DemoLead) {
  delete lead.zipCode;
  delete lead.zipVerified;

  clearCity(lead);
}

export async function getLocalDemoReply(
  text: string,
  previous: DemoLead,
): Promise<Reply> {
  const lead = { ...previous };
  const input = text.trim().slice(0, 500);

  if (!input) {
    return response(lead);
  }

  // Corrections invalidate dependent location fields.
  if (/^change state[.!]?$/i.test(input)) {
    delete lead.state;
    delete lead.stateCode;
    delete lead.address;

    clearZip(lead);

    return response(lead);
  }

  if (/^change address[.!]?$/i.test(input)) {
    delete lead.address;

    clearZip(lead);

    return response(lead);
  }

  if (/^change (?:zip|zip code)[.!]?$/i.test(input)) {
    clearZip(lead);

    return response(lead);
  }

  if (/^change city[.!]?$/i.test(input)) {
    clearCity(lead);

    return response(lead);
  }

  const step = nextStep(lead);

  if (!step) {
    return response(lead);
  }

  let acknowledgement = "";

  switch (step) {
    case "service": {
      if (/\b(?:roof|roofing|shingle|shingles)\b/i.test(input)) {
        lead.industry = "Roofing";

        lead.service = /leak/i.test(input)
          ? "Roof leak repair"
          : "Roof inspection";

        acknowledgement = /leak/i.test(input)
          ? "Sorry you're dealing with a roof leak. Let's collect the property details."
          : "I can help with a roofing enquiry.";
      } else if (
        /\b(?:ac|hvac|heating|heater|furnace)\b|air condition/i.test(input)
      ) {
        lead.industry = "HVAC";

        lead.service = /heat|furnace/i.test(input)
          ? "Heating repair"
          : "AC repair";

        acknowledgement = "Let's get the details for the HVAC team.";
      } else {
        return response(
          lead,
          "This demo supports roofing and HVAC enquiries. " +
            "Tell me about your roof, air conditioning, or heating issue.",
        );
      }

      break;
    }

    case "state": {
      const state = readState(input);

      if (!state) {
        return response(
          lead,
          "I couldn't recognise that as a US state. " +
            "Please enter one of the 50 state names or its " +
            "two-letter abbreviation. Washington, DC is also supported.",
        );
      }

      [lead.stateCode, lead.state] = state;

      acknowledgement = `Got it — ${lead.state}.`;

      break;
    }

    case "address": {
      const address = input
        .replace(/^(?:my address is|the address is|address:)\s*/i, "")
        .trim();

      const hasHouseNumber = /^\d+[A-Za-z]?(?:[-/]\d+)?\s+.+/.test(address);

      const hasStreetName = /[A-Za-z]{2}/.test(address);

      if (
        address.length < 6 ||
        address.length > 180 ||
        !hasHouseNumber ||
        !hasStreetName
      ) {
        return response(
          lead,
          "Please enter a street address with a house number, " +
            "for example 123 Main Street, Apt 4. " +
            "This checks the address format only.",
        );
      }

      lead.address = address;

      acknowledgement = "Thanks, I've noted the street address.";

      break;
    }

    case "zipCode": {
      if (!/^\d{5}$/.test(input)) {
        return response(
          lead,
          "Please enter a 5-digit ZIP code, keeping any leading zero. " +
            "If you have ZIP+4, enter only the first five digits.",
        );
      }

      let places: ZipPlace[];

      try {
        places = await lookupZip(input);
      } catch {
        return response(
          lead,
          "I can't reach the ZIP lookup right now, " +
            "so I haven't verified it. " +
            "Please try the ZIP code again in a moment.",
        );
      }

      if (!places.length) {
        return response(
          lead,
          "I couldn't find that ZIP code in the lookup. " +
            "Please check the five digits and try again.",
        );
      }

      const statePlaces = places.filter(
        (place) => place.stateCode === lead.stateCode,
      );

      if (!statePlaces.length) {
        const listedStates = [
          ...new Set(places.map((place) => STATES[place.stateCode])),
        ].join(" / ");

        return response(
          lead,
          `That ZIP code is listed in ${listedStates}, ` +
            `but you selected ${lead.state}. ` +
            `Please enter a ZIP code for ${lead.state}, ` +
            'or type "change state".',
        );
      }

      lead.zipCode = input;
      lead.zipVerified = true;

      // The city must be entered and matched separately.
      clearCity(lead);

      return response(
        lead,
        `That ZIP code matches ${lead.state}. ` + PROMPTS.city,
        getCityOptions(statePlaces),
      );
    }

    case "city": {
      if (!lead.zipCode || !lead.zipVerified || !lead.stateCode) {
        return response(lead, "Please verify your state and ZIP code first.");
      }

      const enteredCity = input
        .replace(/^(?:my city is|the city is|i live in|city:)\s*/i, "")
        .trim();

      if (enteredCity.length < 2 || enteredCity.length > 100) {
        return response(lead, "Please enter the city name for the property.");
      }

      let places: ZipPlace[];

      try {
        places = await lookupZip(lead.zipCode);
      } catch {
        return response(
          lead,
          "I can't reach the city lookup right now. " +
            "Your city hasn't been verified. Please try again.",
        );
      }

      const statePlaces = places.filter(
        (place) => place.stateCode === lead.stateCode,
      );

      if (!statePlaces.length) {
        return response(
          lead,
          "I couldn't confirm the places for this ZIP code. " +
            'Please try again or type "change ZIP" to correct it.',
        );
      }

      const normalizedInput = normalizeCity(enteredCity);

      const matchedPlace = statePlaces.find(
        (place) => normalizeCity(place.city) === normalizedInput,
      );

      if (!matchedPlace) {
        const cityOptions = getCityOptions(statePlaces);

        return response(
          lead,
          `I couldn't match "${enteredCity}" to ZIP code ` +
            `${lead.zipCode} in ${lead.state}. ` +
            `The lookup lists: ${cityOptions
              .map((option) => option.label)
              .join(", ")}. ` +
            "Please check the city spelling, select a matching city, " +
            'or type "change ZIP".',
          cityOptions,
        );
      }

      lead.city = matchedPlace.city;
      lead.cityVerified = true;

      lead.location =
        `${lead.address}, ${lead.city}, ` + `${lead.stateCode} ${lead.zipCode}`;

      acknowledgement = `Thanks — ${lead.city} matches your ZIP code and state.`;

      break;
    }

    case "urgency": {
      if (
        /not urgent|non[- ]urgent|no rush|can wait|not an emergency/i.test(
          input,
        )
      ) {
        lead.urgency = "Not urgent";
      } else if (/urgent|asap|emergency|right away|immediately/i.test(input)) {
        lead.urgency = "Urgent";
      } else {
        return response(
          lead,
          "Should I mark this as urgent, or can it wait? " +
            "You can choose below.",
        );
      }

      acknowledgement =
        lead.urgency === "Urgent"
          ? "I'll mark the enquiry as urgent. This demo doesn't dispatch a technician."
          : "Understood — it can wait.";

      break;
    }

    case "timeline": {
      if (/tomorrow/i.test(input)) {
        lead.timeline = "Tomorrow";
      } else if (/next week/i.test(input)) {
        lead.timeline = "Next week";
      } else if (/this week/i.test(input)) {
        lead.timeline = "This week";
      } else if (/today/i.test(input)) {
        lead.timeline = "Today";
      } else {
        return response(
          lead,
          "For this demo, please choose today, tomorrow, " +
            "this week, or next week.",
        );
      }

      acknowledgement = `I've noted ${lead.timeline.toLowerCase()} as your preference.`;

      break;
    }

    case "name": {
      const name = input
        .replace(/^(?:my name is|i am|i'm|call me)\s+/i, "")
        .trim();

      const validCharacters = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name);

      if (name.length < 2 || name.length > 80 || !validCharacters) {
        return response(
          lead,
          "Please enter a name using letters, spaces, " +
            "hyphens, or apostrophes. " +
            "A sample name is fine for this demo.",
        );
      }

      lead.name = name;

      acknowledgement = `Thanks, ${name}.`;

      break;
    }

    case "phone": {
      const value = input
        .replace(/^(?:my phone number is|my number is|phone:)\s*/i, "")
        .trim();

      const phone = parsePhoneNumberFromString(value, {
        defaultCountry: "US",
        extract: false,
      });

      if (!phone || phone.country !== "US" || !phone.isValid()) {
        return response(
          lead,
          "That doesn't look like a valid US phone number. " +
            "Please enter a US area code and number, " +
            "with 10 digits or +1. Canadian and other " +
            "international numbers aren't supported.",
        );
      }

      lead.phone = phone.number;

      break;
    }
  }

  const next = nextStep(lead);

  return response(
    lead,
    next ? `${acknowledgement} ${PROMPTS[next]}`.trim() : undefined,
  );
}

export function getLocalDemoSlots() {
  return [
    {
      label: "Sample slot: 9:00 AM",
      scheduledFor: "sample-09",
    },
    {
      label: "Sample slot: 2:00 PM",
      scheduledFor: "sample-14",
    },
  ];
}
