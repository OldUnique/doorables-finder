"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("doorables_subscribed", "true");
    setTimeout(() => {
      router.push("/app");
    }, 1500);
  }, []);

  return <div style={{padding:40}}>Payment successful! Loading your collection...</div>;
}