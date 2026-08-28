import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Business } from "@/models/Business";

export async function POST() {
  try {
    await connectDB();

    const email =
      "demo@abchomeservices.com";

    const password =
      "Demo123456!";

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const business =
      await Business.findOneAndUpdate(
        {
          email,
        },
        {
          name:
            "ABC Home Services",
             slug: "abc-home-services",

          industry:
            "Roofing & HVAC",

          email,

          phone:
            "+1 555 123 4567",

          passwordHash,
        },
        {
          new: true,
          upsert: true,
        }
      );

    return NextResponse.json({
      success: true,

      message:
        "Demo business ready",

      login: {
        email,

        password:
          "Demo123456!",
      },

      business: {
        id:
          business._id.toString(),

        name:
          business.name,

        email:
          business.email,
      },
    });
  } catch (error) {
    console.error(
      "Setup error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to configure demo business.",
      },
      {
        status: 500,
      }
    );
  }
}