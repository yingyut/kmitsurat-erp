"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const loggedIn = localStorage.getItem("kmit_logged_in") === "true";
    window.location.href = loggedIn ? "/dashboard" : "/login";
  }, []);
  return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted">Redirecting...</p></div>;
}
