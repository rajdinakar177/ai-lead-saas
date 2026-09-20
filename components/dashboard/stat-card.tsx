"use client";

import {
  CalendarCheck,
  CalendarDays,
  CircleCheckBig,
  Flame,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

type IconName =
  "users" | "flame" | "calendar" | "calendar-check" | "check" | "trend";

type Props = {
  label: string;
  value: string | number;
  description: string;
  icon: IconName;
};

const icons = {
  users: Users,
  flame: Flame,
  calendar: CalendarDays,
  "calendar-check": CalendarCheck,
  check: CircleCheckBig,
  trend: TrendingUp,
};

export function StatCard({ label, value, description, icon }: Props) {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -4,
      }}
      transition={{
        duration: 0.35,
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl transition group-hover:bg-blue-500/15" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/10 text-blue-400">
          <Icon size={19} />
        </div>
      </div>

      <p className="relative mt-4 text-xs text-slate-600">{description}</p>
    </motion.div>
  );
}
