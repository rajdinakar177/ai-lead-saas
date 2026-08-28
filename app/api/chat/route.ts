
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
        createMockResponse(body);

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 700)
      );
    } else if (mode === "openai") {
      result = await createOpenAIResponse(
        body,
        {
          name: business.name,
          industry: business.industry,
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

function createMockResponse(body: RequestBody): AIResult {
  const latestUserMessage =
    [...body.messages]
      .reverse()
      .find((message) => message.sender === "user")
      ?.text.trim() || "";

  const text = latestUserMessage.toLowerCase();

  const lead = {
    industry: body.lead.industry || null,
    service: body.lead.service || null,
    urgency: body.lead.urgency || null,
    timeline: body.lead.timeline || null,
    name: body.lead.name || null,
    phone: body.lead.phone || null,
  };

  /* -------------------------
     Detect industry
  ------------------------- */

  if (!lead.industry) {
    if (
      text.includes("roof") ||
      text.includes("leak") ||
      text.includes("shingle")
    ) {
      lead.industry = "Roofing";
    }

    if (
      text.includes("ac") ||
      text.includes("air conditioner") ||
      text.includes("air conditioning") ||
      text.includes("hvac") ||
      text.includes("heater") ||
      text.includes("heating")
    ) {
      lead.industry = "HVAC";
    }
  }

  /* -------------------------
     Detect service
  ------------------------- */

  if (!lead.service) {
    if (
      text.includes("roof leak") ||
      text.includes("leaking") ||
      text.includes("leak")
    ) {
      lead.service = "Roof Leak Repair";
    } else if (
      text.includes("roof replacement") ||
      text.includes("replace roof")
    ) {
      lead.service = "Roof Replacement";
    } else if (
      text.includes("roof inspection") ||
      text.includes("inspect roof")
    ) {
      lead.service = "Roof Inspection";
    } else if (
      text.includes("ac repair") ||
      text.includes("ac not working") ||
      text.includes("air conditioner not working")
    ) {
      lead.service = "AC Repair";
    } else if (
      text.includes("heating repair") ||
      text.includes("heater not working")
    ) {
      lead.service = "Heating Repair";
    } else if (
      text.includes("new ac") ||
      text.includes("new hvac") ||
      text.includes("installation")
    ) {
      lead.service = "HVAC Installation";
    }
  }

  /* -------------------------
     Detect urgency
  ------------------------- */

  if (!lead.urgency) {
    if (
      text.includes("emergency") ||
      text.includes("urgent") ||
      text.includes("water coming inside") ||
      text.includes("water is coming") ||
      text.includes("flood") ||
      text.includes("immediately") ||
      text.includes("asap")
    ) {
      lead.urgency = "Emergency";
    } else if (
      text.includes("today") ||
      text.includes("24 hour") ||
      text.includes("24 hours")
    ) {
      lead.urgency = "Within 24 hours";
    } else if (text.includes("this week")) {
      lead.urgency = "This week";
    } else if (
      text.includes("not urgent") ||
      text.includes("no rush")
    ) {
      lead.urgency = "Not urgent";
    }
  }

  /* -------------------------
     Detect timeline
  ------------------------- */

  if (!lead.timeline) {
    if (text.includes("today")) {
      lead.timeline = "Today";
    } else if (text.includes("tomorrow")) {
      lead.timeline = "Tomorrow";
    } else if (text.includes("next week")) {
      lead.timeline = "Next week";
    } else if (text.includes("this week")) {
      lead.timeline = "This week";
    }
  }

  /* -------------------------
     Detect phone
  ------------------------- */

  if (!lead.phone) {
    const phoneMatch = latestUserMessage.match(
      /(?:\+?\d[\d\s().-]{7,}\d)/
    );

    if (phoneMatch) {
      lead.phone = phoneMatch[0].trim();
    }
  }

  /* -------------------------
     Detect name
  ------------------------- */

  if (!lead.name) {
    const namePatterns = [
      /my name is ([a-zA-Z ]+)/i,
      /i am ([a-zA-Z ]+)/i,
      /i'm ([a-zA-Z ]+)/i,
      /this is ([a-zA-Z ]+)/i,
    ];

    for (const pattern of namePatterns) {
      const match = latestUserMessage.match(pattern);

      if (match?.[1]) {
        let possibleName = match[1].trim();

        // Remove common trailing phrases.
        possibleName = possibleName
          .split(
            /\b(and|my|phone|number|i need|i want|looking|from|tomorrow|today)\b/i
          )[0]
          .trim();

        if (possibleName.length >= 2) {
          lead.name = possibleName;
          break;
        }
      }
    }
  }

  const collectedFields = Object.values(lead).filter(Boolean).length;

  let status: LeadStatus = "new";

  if (collectedFields >= 2) {
    status = "warm";
  }

  if (
    lead.urgency === "Emergency" ||
    lead.urgency === "Within 24 hours" ||
    collectedFields >= 5
  ) {
    status = "hot";
  }

  const readyToBook = Boolean(
    lead.industry &&
    lead.service &&
    lead.urgency &&
    lead.timeline &&
    lead.name &&
    lead.phone
  );

  let reply = "";

  if (!lead.industry) {
    reply =
      "Sure — is this for a roofing issue or an HVAC issue?";
  } else if (!lead.service) {
    if (lead.industry === "Roofing") {
      reply =
        "Got it. What roofing service do you need — repair, replacement, inspection, or something else?";
    } else {
      reply =
        "Got it. What HVAC service do you need — AC repair, heating repair, installation, or maintenance?";
    }
  } else if (!lead.urgency) {
    reply =
      "Thanks. How urgent is the issue — emergency, within 24 hours, this week, or not urgent?";
  } else if (!lead.timeline) {
    reply =
      "When would you ideally like someone to come out — today, tomorrow, this week, or next week?";
  } else if (!lead.name) {
    reply =
      "Perfect. What name should I put on the service request?";
  } else if (!lead.phone) {
    reply =
      `Thanks ${lead.name}. What's the best phone number for the technician to reach you?`;
  } else {
    reply =
      "Great — I have everything I need. You can choose an available appointment time below.";
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
You are a friendly AI scheduling and lead qualification assistant for ${business.name}.

Business industry:
${business.industry}

You are communicating with a potential customer of this business.

Your job is to qualify incoming leads through a short text conversation.

Collect:

1. industry — Roofing or HVAC
2. service
3. urgency
4. timeline
5. name
6. phone

Rules:

- Ask only ONE question at a time.
- Keep responses short and conversational.
- Do not sound robotic.
- Never ask for information already provided.
- Extract multiple pieces of information if the customer provides them
  in the same message.
- Do not promise prices.
- Do not invent appointment availability.
- Once all six required fields are collected, set readyToBook=true.

Status:

- "new" when very little information is available
- "warm" when the lead has provided useful qualification information
- "hot" when the issue is urgent or the customer is clearly ready to schedule

Return ONLY JSON using this exact structure:

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