"use client";

import { useState, useEffect } from "react";
import {
  Star,
  Loader2,
  MessageSquare,
  SlidersHorizontal,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Rating {
  id: string;
  stars: number;
  feedback: string | null;
  redirected_google: boolean;
  created_at: string;
  call: {
    id: string;
    type: string;
    table: {
      id: string;
      label: string;
    };
    resolver: {
      id: string;
      name: string;
    } | null;
  };
}

interface Stats {
  total: number;
  average: number;
  negativeFeedbacks: number;
  distribution: Record<number, number>;
}

export function FeedbacksPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/feedbacks?stars=${filter}`
        : "/api/admin/feedbacks";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRatings(data.ratings);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StarRating = ({ stars }: { stars: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= stars
              ? "text-yellow-500 fill-yellow-500"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Feedbacks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Avaliações dos clientes sobre o atendimento
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Média</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">
                {stats.average.toFixed(1)}
              </span>
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Positivas (4-5)</p>
            <p className="text-2xl font-bold text-green-500 mt-1">
              {(stats.distribution[4] || 0) + (stats.distribution[5] || 0)}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Negativas (1-3)</p>
            <p className="text-2xl font-bold text-red-500 mt-1">
              {(stats.distribution[1] || 0) +
                (stats.distribution[2] || 0) +
                (stats.distribution[3] || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            filter === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          Todos
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setFilter(star)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1",
              filter === star
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {star}
            <Star
              className={cn(
                "h-3 w-3",
                filter === star
                  ? "fill-primary-foreground"
                  : "fill-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>

      {/* Ratings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : ratings.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum feedback encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className={cn(
                "bg-card border rounded-xl p-4",
                rating.stars <= 2
                  ? "border-red-500/30 bg-red-500/5"
                  : rating.stars === 3
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-border/50",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-2">
                  <StarRating stars={rating.stars} />

                  {rating.feedback && (
                    <p className="text-foreground">"{rating.feedback}"</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {rating.call.table.label}
                    </span>
                    {rating.call.resolver && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {rating.call.resolver.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(rating.created_at)}
                    </span>
                  </div>
                </div>

                {rating.redirected_google && (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full whitespace-nowrap">
                    Enviado ao Google
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
