import {
  CalendarDays,
  Clock3,
  User,
} from "lucide-react";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";

export const dynamic =
  "force-dynamic";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled";

function getStatusClasses(
  status: AppointmentStatus
) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-400";

    case "cancelled":
      return "bg-red-500/10 text-red-400";

    case "confirmed":
      return "bg-blue-500/10 text-blue-400";

    default:
      return "bg-amber-500/10 text-amber-400";
  }
}

export default async function AppointmentsPage() {
  await connectDB();

  // Important so Mongoose knows
  // about Lead before populate().
  void Lead;

  const business =
    await requireBusiness();

  if (!business) {
    return (
      <div>
        Business not found.
      </div>
    );
  }

  const appointments =
    await Appointment.find({
      businessId:
        business._id,
    })
      .populate(
        "leadId",
        "name phone service urgency"
      )
      .sort({
        scheduledFor: 1,
      })
      .lean();

  return (
    <div>
      <DashboardHeader
        title="Appointments"
        description="View and manage appointments booked through your AI assistant."
      />

      <div className="mt-8 grid gap-4">
        {appointments.length ===
          0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/3 p-12 text-center">
            <CalendarDays
              size={28}
              className="mx-auto text-zinc-700"
            />

            <p className="mt-4 text-sm text-zinc-600">
              No appointments yet.
            </p>
          </div>
        ) : (
          appointments.map(
            (appointment) => {
              const lead =
                appointment.leadId as unknown as {
                  _id: {
                    toString(): string;
                  };
                  name?: string;
                  phone?: string;
                  service?: string;
                  urgency?: string;
                };

              const status =
                appointment.status as AppointmentStatus;

              return (
                <div
                  key={appointment._id.toString()}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <CalendarDays
                          size={20}
                        />
                      </div>

                      <div>
                        <p className="font-medium text-white">
                          {
                            appointment.label
                          }
                        </p>

                        <p className="mt-1 text-sm text-zinc-600">
                          {lead?.service ||
                            "Service appointment"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-2">
                            <User
                              size={14}
                            />

                            {lead?.name ||
                              "Unknown lead"}
                          </span>

                          <span className="flex items-center gap-2">
                            <Clock3
                              size={14}
                            />

                            {new Date(
                              appointment.scheduledFor
                            ).toLocaleString(
                              "en-US",
                              {
                                month:
                                  "short",

                                day:
                                  "numeric",

                                hour:
                                  "numeric",

                                minute:
                                  "2-digit",
                              }
                            )}
                          </span>
                        </div>

                        <AppointmentActions
                          appointmentId={appointment._id.toString()}
                          leadId={
                            lead?._id?.toString() ??
                            appointment.leadId._id?.toString()
                          }
                          status={status}
                        />
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium capitalize ${getStatusClasses(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>
    </div>
  );
}