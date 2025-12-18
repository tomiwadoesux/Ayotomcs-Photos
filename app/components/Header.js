"use client";
import { useState, useEffect, useRef } from "react";
import SearchModal from "./SearchModal";
import gsap from "gsap";

const HoverButton = ({ children, onClick, className = "", ariaLabel }) => {
  const bgRef = useRef(null);

  const handleMouseEnter = (e) => {
    if (!bgRef.current) return;
    const { top, height } = e.currentTarget.getBoundingClientRect();
    const isEnterFromTop = e.clientY - top < height / 2;

    gsap.killTweensOf(bgRef.current);
    gsap.fromTo(
      bgRef.current,
      { y: isEnterFromTop ? "-100%" : "100%" },
      { y: "0%", duration: 0.25, ease: "power3.out" }
    );
  };

  const handleMouseLeave = (e) => {
    if (!bgRef.current) return;
    const { top, height } = e.currentTarget.getBoundingClientRect();
    const isExitToTop = e.clientY - top < height / 2;

    gsap.to(bgRef.current, {
      y: isExitToTop ? "-100%" : "100%",
      duration: 0.25,
      ease: "power3.in",
    });
  };

  const handleClick = (e) => {
    if (onClick) onClick(e);

    // Fix for Mobile: If hover is not supported (touch), animate out immediately after click
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: none)").matches
    ) {
      gsap.to(bgRef.current, {
        y: "100%", // Exit downwards
        duration: 0.25,
        ease: "power3.in",
        delay: 0.1, // Small delay for visual feedback
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden group flex items-center justify-center rounded-sm ${className}`}
      aria-label={ariaLabel}
    >
      <div
        ref={bgRef}
        className="absolute inset-0 bg-foreground"
        style={{ transform: "translateY(100%)" }}
      />
      <div className="relative z-10 mix-blend-exclusion flex items-center justify-center w-full h-full text-[#ededed]">
        {children}
      </div>
    </button>
  );
};

export default function Header({ currentView, onViewChange, stats, photos }) {
  const [time, setTime] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Time Clock
    const updateTime = () => {
      const now = new Date();
      setTime(
        now
          .toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
          .toUpperCase()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Theme check
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.add("light");
    }

    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full text-foreground border-b border-neutral-800/50 bg-background transition-colors duration-500">
        <div className="grid grid-cols-3 lg:grid-cols-4 w-full h-16 font-mono text-xs uppercase tracking-wider">
          {/* 1. TITLE (Ayotomcs) - Link */}
          <div className="flex items-center justify-center lg:justify-start px-6 border-r border-neutral-800/50">
            <a
              href="https://ayotomcs.me/"
              className="font-bold text-sm hover:opacity-70 transition-opacity"
            >
              Ayotomcs
            </a>
          </div>

          {/* 2. SEARCH (Icon Only) */}
          <div className="relative flex items-center justify-center px-6 border-r border-neutral-800/50">
            <HoverButton
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10"
              ariaLabel="Search"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </HoverButton>
          </div>

          {/* 3. THEME TOGGLE (Sun/Moon Icon) */}
          <div className="flex items-center justify-center px-6 lg:border-r border-neutral-800/50 gap-3 text-neutral-400">
            <HoverButton
              className="w-10 h-10"
              ariaLabel="Toggle Theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                // Show Sun (Switch to Light)
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.59ZM12 18.75a.75.75 0 0 1 .75.75V21.75a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75ZM5.106 17.834a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.061-1.061l-1.59 1.59ZM2.25 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75ZM6.166 5.106a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 1 0 1.061-1.06l-1.591-1.59Z" />
                </svg>
              ) : (
                // Show Moon (Switch to Dark)
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </HoverButton>
          </div>

          {/* 4. TIME (Desktop Only) */}
          <div className="hidden lg:flex items-center justify-end px-6 text-neutral-400 tabular-nums">
            {time}
          </div>
        </div>
      </header>

      {isSearchOpen && (
        <SearchModal
          stats={stats}
          photos={photos}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
}
