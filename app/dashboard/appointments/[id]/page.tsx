import {
    ArrowLeft,
    CalendarDays,
    Clock3,
    Mail,
    MapPin,
    Phone,
    User,
    Zap,
    Wrench,
} from "lucide-react";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";
import { AppointmentNotes } from "@/components/dashboard/appointment-notes";
export const dynamic =
    "force-dynamic";

type AppointmentStatus =
    | "scheduled"
    | "confirmed"
    | "completed"
    | "cancelled";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

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

function formatAppointmentDate(
    scheduledFor: Date | string,
    timezone: string
) {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: timezone,
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
        }
    ).format(
        new Date(scheduledFor)
    );
}

function formatCreatedDate(
    date: Date | string,
    timezone: string
) {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: timezone,
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }
    ).format(
        new Date(date)
    );
}

export default async function AppointmentDetailsPage({
    params,
}: PageProps) {
    await connectDB();

    const business =
        await requireBusiness();

    if (!business) {
        return (
            <div>
                Business not found.
            </div>
        );
    }

    const { id } =
        await params;

    /*
     * Prevent invalid MongoDB IDs
     * from causing CastErrors.
     */
    if (
        !Types.ObjectId.isValid(id)
    ) {
        notFound();
    }

    /*
     * IMPORTANT:
     * businessId is included in
     * the query for tenant isolation.
     *
     * Business A cannot access an
     * appointment belonging to
     * Business B by changing the URL.
     */
    const appointment =
        await Appointment.findOne({
            _id: id,
            businessId:
                business._id,
        }).lean();

    if (!appointment) {
        notFound();
    }

    const lead =
        await Lead.findOne({
            _id: appointment.leadId,
            businessId:
                business._id,
        }).lean();

    if (!lead) {
        notFound();
    }

    const status =
        appointment.status as AppointmentStatus;

    return (
        <div>
            <Link
                href="/dashboard/appointments"
                className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
            >
                <ArrowLeft size={16} />

                Back to appointments
            </Link>

            <DashboardHeader
                title="Appointment Details"
                description="View customer and appointment information."
            />

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Appointment */}
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                                    Appointment
                                </p>

                                <h2 className="mt-2 text-xl font-semibold text-white">
                                    {lead.service ||
                                        "Service appointment"}
                                </h2>

                                <div className="mt-4 flex items-start gap-2 text-sm text-zinc-400">
                                    <CalendarDays
                                        size={17}
                                        className="mt-0.5 shrink-0 text-blue-400"
                                    />

                                    <span>
                                        {formatAppointmentDate(
                                            appointment.scheduledFor,
                                            business.timezone
                                        )}
                                    </span>
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

                        <div className="mt-6 border-t border-white/10 pt-2">
                            <AppointmentActions
                                appointmentId={appointment._id.toString()}
                                leadId={lead._id.toString()}
                                status={status}
                            />
                        </div>
                    </section>

                    {/* Customer */}
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-base font-semibold text-white">
                            Customer
                        </h2>

                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <DetailItem
                                icon={<User size={17} />}
                                label="Name"
                                value={
                                    lead.name ||
                                    "Not provided"
                                }
                            />

                            <DetailItem
                                icon={<Phone size={17} />}
                                label="Phone"
                                value={
                                    lead.phone ||
                                    "Not provided"
                                }
                            />

                            <DetailItem
                                icon={<Mail size={17} />}
                                label="Email"
                                value={
                                    lead.email ||
                                    "Not provided"
                                }
                            />

                            <DetailItem
                                icon={<MapPin size={17} />}
                                label="Location"
                                value={
                                    lead.location ||
                                    "Not provided"
                                }
                            />
                        </div>
                    </section>

                    {/* Service request */}
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-base font-semibold text-white">
                            Service Request
                        </h2>

                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <DetailItem
                                icon={<Wrench size={17} />}
                                label="Service"
                                value={
                                    lead.service ||
                                    "Not provided"
                                }
                            />

                            <DetailItem
                                icon={<Zap size={17} />}
                                label="Urgency"
                                value={
                                    lead.urgency ||
                                    "Not provided"
                                }
                            />

                            <DetailItem
                                icon={<Clock3 size={17} />}
                                label="Timeline"
                                value={
                                    lead.timeline ||
                                    "Not provided"
                                }
                            />

                            <DetailItem
                                icon={<CalendarDays size={17} />}
                                label="Lead status"
                                value={
                                    lead.status ||
                                    "Not provided"
                                }
                            />
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Lead information */}
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-base font-semibold text-white">
                            Lead Information
                        </h2>

                        <div className="mt-5 space-y-5">
                            <SimpleDetail
                                label="Source"
                                value={
                                    lead.source ||
                                    "website"
                                }
                            />

                            <SimpleDetail
                                label="Lead Status"
                                value={
                                    lead.status ||
                                    "Unknown"
                                }
                            />

                            <SimpleDetail
                                label="Created"
                                value={formatCreatedDate(
                                    lead.createdAt,
                                    business.timezone
                                )}
                            />

                            <SimpleDetail
                                label="Appointment Status"
                                value={status}
                            />
                        </div>
                    </section>

                    {/* Notes */}
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-base font-semibold text-white">
                            Notes
                        </h2>

                        <div className="mt-4">
                            <AppointmentNotes
                                appointmentId={
                                    appointment._id.toString()
                                }
                                initialNotes={
                                    appointment.notes ?? ""
                                }
                            />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function DetailItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-zinc-600">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-xs text-zinc-600">
                    {label}
                </p>

                <p className="mt-1 break-words text-sm font-medium capitalize text-zinc-300">
                    {value}
                </p>
            </div>
        </div>
    );
}

function SimpleDetail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
            <span className="text-sm text-zinc-600">
                {label}
            </span>

            <span className="text-right text-sm font-medium capitalize text-zinc-300">
                {value}
            </span>
        </div>
    );
}