import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";

import { type AppointmentListItem } from "@/components/dashboard/appointments-list";

import { AppointmentsView } from "@/components/dashboard/appointments-view";

export const dynamic = "force-dynamic";

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled";

type PopulatedLead = {
  _id: {
    toString(): string;
  };

  name?: string;
  phone?: string;
  service?: string;
  urgency?: string;
  location?: string;
};

export default async function AppointmentsPage() {
  await connectDB();

  /*
   * Register Lead model before
   * Appointment.populate().
   */
  void Lead;

  const business = await requireBusiness();

  if (!business) {
    return <div>Business not found.</div>;
  }

  const appointments = await Appointment.find({
    businessId: business._id,
  })
    .populate("leadId", "name phone service urgency location")
    .lean();

  const now = new Date();

  /*
   * Dashboard ordering:
   *
   * 1. Upcoming active appointments
   *    - earliest first
   *
   * 2. Past / completed / cancelled
   *    - newest first
   */
  appointments.sort((a, b) => {
    const aTime = new Date(a.scheduledFor).getTime();

    const bTime = new Date(b.scheduledFor).getTime();

    const aActiveUpcoming =
      aTime > now.getTime() && a.status !== "completed" && a.status !== "cancelled";

    const bActiveUpcoming =
      bTime > now.getTime() && b.status !== "completed" && b.status !== "cancelled";

    if (aActiveUpcoming && !bActiveUpcoming) {
      return -1;
    }

    if (!aActiveUpcoming && bActiveUpcoming) {
      return 1;
    }

    if (aActiveUpcoming && bActiveUpcoming) {
      return aTime - bTime;
    }

    return bTime - aTime;
  });

  /*
   * Summary statistics.
   */
  const totalAppointments = appointments.length;

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      new Date(appointment.scheduledFor) > now &&
      appointment.status !== "cancelled" &&
      appointment.status !== "completed",
  ).length;

  const confirmedAppointments = appointments.filter(
    (appointment) => appointment.status === "confirmed",
  ).length;

  const completedAppointments = appointments.filter(
    (appointment) => appointment.status === "completed",
  ).length;

  /*
   * Serialize Mongoose data before
   * sending it to Client Components.
   */
  const appointmentItems: AppointmentListItem[] = appointments.map((appointment) => {
    const lead = appointment.leadId as unknown as PopulatedLead | null;

    return {
      id: appointment._id.toString(),

      scheduledFor: new Date(appointment.scheduledFor).toISOString(),

      status: appointment.status as AppointmentStatus,

      lead: lead
        ? {
            id: lead._id.toString(),

            name: lead.name,

            phone: lead.phone,

            service: lead.service,

            urgency: lead.urgency,

            location: lead.location,
          }
        : null,
    };
  });

  return (
    <div>
      <DashboardHeader
        title="Appointments"
        description="View and manage appointments booked through your AI assistant."
      />

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-500">Total</p>

          <p className="mt-2 text-2xl font-semibold text-white">{totalAppointments}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-500">Upcoming</p>

          <p className="mt-2 text-2xl font-semibold text-white">{upcomingAppointments}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-500">Confirmed</p>

          <p className="mt-2 text-2xl font-semibold text-white">{confirmedAppointments}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-500">Completed</p>

          <p className="mt-2 text-2xl font-semibold text-white">{completedAppointments}</p>
        </div>
      </div>

      <AppointmentsView appointments={appointmentItems} timezone={business.timezone} />
    </div>
  );
}
