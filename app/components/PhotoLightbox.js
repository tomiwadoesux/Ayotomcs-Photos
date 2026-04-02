"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function PhotoLightbox({ photo, cachedSrc, sourceRect, onClose }) {
  const overlayRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Backdrop eases in alongside the image
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: "power3.inOut" }
    );

    // FLIP: animate image from source position to center
    const img = imageRef.current;
    if (img && sourceRect) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const aspectRatio = (photo.width || 800) / (photo.height || 1000);
      const maxW = vw * 0.9;
      const maxH = vh * 0.9;

      let finalW, finalH;
      if (maxW / maxH > aspectRatio) {
        finalH = maxH;
        finalW = finalH * aspectRatio;
      } else {
        finalW = maxW;
        finalH = finalW / aspectRatio;
      }

      const finalX = (vw - finalW) / 2;
      const finalY = (vh - finalH) / 2;

      // Start at the source image's position
      gsap.set(img, {
        position: "fixed",
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
        zIndex: 60,
      });

      // Animate to center
      gsap.to(img, {
        left: finalX,
        top: finalY,
        width: finalW,
        height: finalH,
        duration: 0.45,
        ease: "power3.inOut",
      });
    } else {
      gsap.fromTo(
        img,
        { scale: 0.92, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: "power3.out" }
      );
    }

    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleClose = () => {
    const img = imageRef.current;

    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
    });

    if (img && sourceRect) {
      gsap.to(img, {
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
        duration: 0.4,
        ease: "power3.inOut",
        onComplete: onClose,
      });
    } else {
      gsap.to(img, {
        scale: 0.95,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: onClose,
      });
    }
  };

  // Use the exact same URL the browser already has cached
  const imgSrc = cachedSrc || photo.src;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50"
      style={{ opacity: 0 }}
    >
      {/* Blurry dark backdrop — click to close */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        onClick={handleClose}
      />

      {/* Image — uses the exact cached URL from the feed */}
      <div
        ref={imageRef}
        style={{
          position: "fixed",
          zIndex: 60,
          overflow: "hidden",
          borderRadius: "2px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={photo.title || "Photo"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
