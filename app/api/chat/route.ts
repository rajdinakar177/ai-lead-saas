
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { Business } from "@/models/Business";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";
type ChatMessage = {
  sender: "ai" | "user";
  text: string;
};

type LeadData = {
  industry?: string;
  service?: string;
  urgency?: string;
  timeline?: string;
  name?: string;
  phone?: string;
  appointment?: string;
};

type RequestBody = {
  leadId: string;
  messages: ChatMessage[];
  lead: LeadData;
};
type QualificationField =
  | "name"
  | "phone"
  | "service"
  | "urgency"
  | "timeline";

type AISettings = {
  businessDescription: string;
  services: string[];
  serviceAreas: string[];
  welcomeMessage: string;
  tone:
  | "friendly"
  | "professional"
  | "casual";
  qualificationFields:
  QualificationField[];
  additionalInstructions: string;
};
type LeadStatus = "new" | "warm" | "hot";

type AIResult = {
  reply: string;
  lead: {
    industry: string | null;
    service: string | null;
    urgency: string | null;
    timeline: string | null;
    name: string | null;
    phone: string | null;
  };
  status: LeadStatus;
  readyToBook: boolean;
};

export async function POST(
  request: Request
) {
  try {
    const body: RequestBody =
      await request.json();

    if (!body.leadId) {
      return NextResponse.json(
        {
          error: "leadId is required.",
        },
        {
          status: 400,
        }
      );
    }

    await connectDB();

    const existingLead =
      await Lead.findById(
        body.leadId
      );

    if (!existingLead) {
      return NextResponse.json(
        {
          error: "Lead not found.",
        },
        {
          status: 404,
        }
      );
    }
    const business =
      await Business.findById(
        existingLead.businessId
      );

    if (!business) {
      return NextResponse.json(
        {
          error:
            "Business not found.",
        },
        {
          status: 404,
        }
      );
    }
    const aiSettings = {
      businessDescription:
        business.aiSettings?.businessDescription ?? "",

      services:
        business.aiSettings?.services ?? [],

      serviceAreas:
        business.aiSettings?.serviceAreas ?? [],

      welcomeMessage:
        business.aiSettings?.welcomeMessage ?? "",

      tone:
        business.aiSettings?.tone ?? "friendly",

      qualificationFields:
        business.aiSettings?.qualificationFields ?? [
          "name",
          "phone",
          "service",
          "urgency",
          "timeline",
        ],

      additionalInstructions:
        business.aiSettings?.additionalInstructions ?? "",
    };
    const latestUserMessage =
      [...body.messages]
        .reverse()
        .find(
          (message) =>
            message.sender === "user"
        );

    if (latestUserMessage) {
      await Message.create({
        leadId: body.leadId,
        sender: "lead",
        content:
          latestUserMessage.text,
      });
    }

    const mode =
      process.env.AI_MODE ||
      "mock";

    let result: AIResult;

    if (mode === "mock") {
      result =
        createMockResponse(
          body,
          aiSettings
        );

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 700)
      );
    } else if (mode === "openai") {
      result =
        await createOpenAIResponse(
          body,
          {
            name: business.name,
            industry: business.industry,
            aiSettings,
          }
        );
    } else {
      return NextResponse.json(
        {
          error: `Invalid AI_MODE: ${mode}`,
        },
        {
          status: 500,
        }
      );
    }

    await Lead.findByIdAndUpdate(
      body.leadId,
      {
        industry:
          result.lead.industry ??
          existingLead.industry,

        service:
          result.lead.service ??
          existingLead.service,

        urgency:
          result.lead.urgency ??
          existingLead.urgency,

        timeline:
          result.lead.timeline ??
          existingLead.timeline,

        name:
          result.lead.name ??
          existingLead.name,

        phone:
          result.lead.phone ??
          existingLead.phone,

        status:
          result.readyToBook
            ? "qualified"
            : result.status,
      },
      {
        new: true,
      }
    );

    const aiMessage =
      await Message.create({
        leadId: body.leadId,
        sender: "ai",
        content: result.reply,
      });

    return NextResponse.json({
      ...result,

      messageId:
        aiMessage._id.toString(),
    });
  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate AI response.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   MOCK MODE
   ========================================================= */

function createMockResponse(
  body: RequestBody,
  settings: AISettings
): AIResult {
  const latestUserMessage =
    [...body.messages]
      .reverse()
      .find(
        (message) =>
          message.sender === "user"
      )
      ?.text.trim() || "";

  const text =
    latestUserMessage.toLowerCase();

  const lead = {
    industry:
      body.lead.industry || null,

    service:
      body.lead.service || null,

    urgency:
      body.lead.urgency || null,

    timeline:
      body.lead.timeline || null,

    name:
      body.lead.name || null,

    phone:
      body.lead.phone || null,
  };

  /* =========================================================
     DETECT INDUSTRY
     ========================================================= */

  if (!lead.industry) {
    if (
      text.includes("roof") ||
      text.includes("leak") ||
      text.includes("shingle")
    ) {
      lead.industry =
        "Roofing";
    }

    if (
      text.includes("ac") ||
      text.includes(
        "air conditioner"
      ) ||
      text.includes(
        "air conditioning"
      ) ||
      text.includes("hvac") ||
      text.includes("heater") ||
      text.includes("heating")
    ) {
      lead.industry =
        "HVAC";
    }
  }

  /* =========================================================
     MATCH SERVICE FROM BUSINESS SETTINGS FIRST
     ========================================================= */

  if (
    !lead.service &&
    settings.services.length > 0
  ) {
    const matchedService =
      settings.services.find(
        (service) =>
          text.includes(
            service.toLowerCase()
          )
      );

    if (matchedService) {
      lead.service =
        matchedService;
    }
  }

  /* =========================================================
     FALLBACK SERVICE DETECTION
     ========================================================= */

  if (!lead.service) {
    if (
      text.includes("roof leak") ||
      text.includes("leaking") ||
      text.includes("leak")
    ) {
      lead.service =
        "Roof Leak Repair";
    } else if (
      text.includes(
        "roof replacement"
      ) ||
      text.includes(
        "replace roof"
      )
    ) {
      lead.service =
        "Roof Replacement";
    } else if (
      text.includes(
        "roof inspection"
      ) ||
      text.includes(
        "inspect roof"
      )
    ) {
      lead.service =
        "Roof Inspection";
    } else if (
      text.includes("ac repair") ||
      text.includes(
        "ac not working"
      ) ||
      text.includes(
        "air conditioner not working"
      )
    ) {
      lead.service =
        "AC Repair";
    } else if (
      text.includes(
        "heating repair"
      ) ||
      text.includes(
        "heater not working"
      )
    ) {
      lead.service =
        "Heating Repair";
    } else if (
      text.includes("new ac") ||
      text.includes("new hvac") ||
      text.includes(
        "installation"
      )
    ) {
      lead.service =
        "HVAC Installation";
    }
  }

  /* =========================================================
     DETECT URGENCY
     ========================================================= */

  if (!lead.urgency) {
    if (
      text.includes(
        "emergency"
      ) ||
      text.includes("urgent") ||
      text.includes(
        "water coming inside"
      ) ||
      text.includes(
        "water is coming"
      ) ||
      text.includes("flood") ||
      text.includes(
        "immediately"
      ) ||
      text.includes("asap")
    ) {
      lead.urgency =
        "Emergency";
    } else if (
      text.includes("today") ||
      text.includes(
        "24 hour"
      ) ||
      text.includes(
        "24 hours"
      )
    ) {
      lead.urgency =
        "Within 24 hours";
    } else if (
      text.includes(
        "this week"
      )
    ) {
      lead.urgency =
        "This week";
    } else if (
      text.includes(
        "not urgent"
      ) ||
      text.includes("no rush")
    ) {
      lead.urgency =
        "Not urgent";
    }
  }

  /* =========================================================
     DETECT TIMELINE
     ========================================================= */

  if (!lead.timeline) {
    if (
      text.includes("today")
    ) {
      lead.timeline =
        "Today";
    } else if (
      text.includes(
        "tomorrow"
      )
    ) {
      lead.timeline =
        "Tomorrow";
    } else if (
      text.includes(
        "next week"
      )
    ) {
      lead.timeline =
        "Next week";
    } else if (
      text.includes(
        "this week"
      )
    ) {
      lead.timeline =
        "This week";
    }
  }

  /* =========================================================
     DETECT PHONE
     ========================================================= */

  if (!lead.phone) {
    const phoneMatch =
      latestUserMessage.match(
        /(?:\+?\d[\d\s().-]{7,}\d)/
      );

    if (phoneMatch) {
      lead.phone =
        phoneMatch[0].trim();
    }
  }

  /* =========================================================
     DETECT NAME
     ========================================================= */

  if (!lead.name) {
    const namePatterns = [
      /my name is ([a-zA-Z ]+)/i,
      /i am ([a-zA-Z ]+)/i,
      /i'm ([a-zA-Z ]+)/i,
      /this is ([a-zA-Z ]+)/i,
    ];

    for (
      const pattern of namePatterns
    ) {
      const match =
        latestUserMessage.match(
          pattern
        );

      if (match?.[1]) {
        let possibleName =
          match[1].trim();

        possibleName =
          possibleName
            .split(
              /\b(and|my|phone|number|i need|i want|looking|from|tomorrow|today)\b/i
            )[0]
            .trim();

        if (
          possibleName.length >= 2
        ) {
          lead.name =
            possibleName;

          break;
        }
      }
    }
  }

  /* =========================================================
     STATUS
     ========================================================= */

  const collectedFields =
    Object.values(
      lead
    ).filter(Boolean).length;

  let status: LeadStatus =
    "new";

  if (
    collectedFields >= 2
  ) {
    status = "warm";
  }

  if (
    lead.urgency ===
      "Emergency" ||
    lead.urgency ===
      "Within 24 hours" ||
    collectedFields >= 5
  ) {
    status = "hot";
  }

  /* =========================================================
     QUALIFICATION SETTINGS
     ========================================================= */

  const requiredFields =
    settings.qualificationFields;

  const needs = (
    field: QualificationField
  ) =>
    requiredFields.includes(
      field
    );

  const readyToBook =
    requiredFields.every(
      (field) =>
        Boolean(
          lead[field]
        )
    );

  /* =========================================================
     SERVICE AREA INFO
     ========================================================= */

  const asksAboutArea =
    text.includes("area") ||
    text.includes("serve") ||
    text.includes("location") ||
    text.includes("city");

  if (
    asksAboutArea &&
    settings.serviceAreas.length >
      0
  ) {
    return {
      reply: `We currently serve: ${settings.serviceAreas.join(
        ", "
      )}. What service do you need?`,

      lead,
      status,
      readyToBook,
    };
  }

  /* =========================================================
     BUILD REPLY
     ========================================================= */

  let reply = "";

  if (
    !lead.industry
  ) {
    if (
      settings.services.length >
      0
    ) {
      reply =
        `What service are you looking for? We currently offer: ${settings.services.join(
          ", "
        )}.`;
    } else {
      reply =
        "What type of service are you looking for?";
    }
  } else if (
    needs("service") &&
    !lead.service
  ) {
    if (
      settings.services.length >
      0
    ) {
      reply =
        `Which service do you need? We currently offer: ${settings.services.join(
          ", "
        )}.`;
    } else {
      reply =
        "What service do you need?";
    }
  } else if (
    needs("urgency") &&
    !lead.urgency
  ) {
    reply =
      "How urgent is the issue — emergency, within 24 hours, this week, or not urgent?";
  } else if (
    needs("timeline") &&
    !lead.timeline
  ) {
    reply =
      "When would you ideally like someone to come out?";
  } else if (
    needs("name") &&
    !lead.name
  ) {
    reply =
      "What name should I put on the service request?";
  } else if (
    needs("phone") &&
    !lead.phone
  ) {
    reply =
      `Thanks${
        lead.name
          ? ` ${lead.name}`
          : ""
      }. What's the best phone number to reach you?`;
  } else {
    reply =
      "Great — I have everything I need. You can choose an available appointment time below.";
  }

  /* =========================================================
     APPLY TONE
     ========================================================= */

  if (
    settings.tone ===
    "professional"
  ) {
    reply =
      reply.replace(
        "Great —",
        "Thank you."
      );
  }

  if (
    settings.tone ===
      "casual" &&
    !readyToBook
  ) {
    reply =
      `${reply} 👍`;
  }

  return {
    reply,
    lead,
    status,
    readyToBook,
  };
}

/* =========================================================
   OPENAI MODE
   ========================================================= */

async function createOpenAIResponse(
  body: RequestBody,
  business: {
    name: string;
    industry: string;
    aiSettings: AISettings;
  }
): Promise<AIResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const conversation = body.messages
    .map(
      (message) =>
        `${message.sender === "ai" ? "Assistant" : "Customer"}: ${message.text
        }`
    )
    .join("\n");

  const response = await openai.responses.create({
    model: "gpt-5.4-mini",

    instructions: `
You are the AI lead qualification and scheduling assistant for ${business.name}.

Business industry:
${business.industry}

Business description:
${business.aiSettings.businessDescription || "Not provided"}

Services offered:
${business.aiSettings.services.length
        ? business.aiSettings.services.join(", ")
        : "Not specifically configured"
      }

Service areas:
${business.aiSettings.serviceAreas.length
        ? business.aiSettings.serviceAreas.join(", ")
        : "Not specifically configured"
      }

Conversation tone:
${business.aiSettings.tone}

Qualification fields that must be collected:
${business.aiSettings.qualificationFields.join(", ")}

Additional business instructions:
${business.aiSettings.additionalInstructions || "None"}

Rules:

- Ask only ONE question at a time.
- Keep responses concise and natural.
- Match the requested conversation tone.
- Never ask for information already provided.
- Extract multiple useful details if the customer gives them in one message.
- Only discuss services the business actually offers when services are configured.
- If the customer asks for a service outside the configured services, explain that the business may not offer it and guide them appropriately.
- If service areas are configured, use them when relevant.
- Do not promise prices.
- Do not invent appointment availability.
- Do not claim an appointment is booked until the application confirms it.
- Set readyToBook=true only when all configured qualification fields have been collected.

Status rules:

- "new" = little information collected
- "warm" = useful qualification information collected
- "hot" = urgent issue or clearly ready to schedule

Return ONLY valid JSON in this exact structure:

{
  "reply": "message",
  "lead": {
    "industry": null,
    "service": null,
    "urgency": null,
    "timeline": null,
    "name": null,
    "phone": null
  },
  "status": "new",
  "readyToBook": false
}
`,

    input: `
Existing lead information:

${JSON.stringify(body.lead, null, 2)}

Conversation:

${conversation}
`,

    text: {
      format: {
        type: "json_object",
      },
    },
  });

  if (!response.output_text) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  return JSON.parse(
    response.output_text
  ) as AIResult;
}