"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/ui/dashboard-shell";
import { dashboardSections } from "./dashboard-sections";

export default function DashboardLayoutClient({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const response = await fetch("/api/profile/", {
          method: "GET",
          cache: "no-store",
        });

        if (!isMounted) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile) {
            setProfile(data.profile);
            setStatus("ready");
            return;
          }
        }
      } catch {
        // Fall through to redirect below.
      }

      if (isMounted) {
        router.replace("/");
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (status !== "ready") {
    return null;
  }

  return <DashboardShell items={dashboardSections} initialProfile={profile}>{children}</DashboardShell>;
}
