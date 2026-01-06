"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star, Loader2, X, ExternalLink } from "lucide-react";

interface RatingModalProps {
  callId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RatingModal({ callId, onClose, onSuccess }: RatingModalProps) {
  const t = useTranslations("client");

  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/avaliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId,
          stars,
          feedback: stars < 4 ? feedback : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.redirect) {
          setRedirecting(true);
          setTimeout(() => {
            window.open(data.redirect, "_blank");
            onSuccess();
          }, 1500);
        } else {
          onSuccess();
        }
      }
    } catch (err) {
      console.error("Error submitting rating:", err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = stars > 0 && stars < 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card-premium rounded-2xl p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {redirecting ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <ExternalLink className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gold mb-2">
              {t("thankYouRating")}
            </h3>
            <p className="text-muted-foreground">{t("redirectingGoogle")}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <span className="text-3xl">⭐</span>
              </div>
              <h3 className="text-2xl font-bold text-gold mb-2">
                {t("rateExperience")}
              </h3>
              <p className="text-muted-foreground text-sm">{t("ratePrompt")}</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredStar || stars)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Feedback for low ratings */}
            {showFeedback && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t("feedbackPlaceholder")}
                  className="w-full p-4 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl btn-secondary-premium font-medium"
              >
                {t("skipRating")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={stars === 0 || loading}
                className="flex-1 py-3 px-4 rounded-xl btn-gold font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("submitRating")
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
