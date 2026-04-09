"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAppRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/collection");
  }, [router]);

  return null;
}