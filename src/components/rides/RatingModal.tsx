import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  driverName: string;
  rideId: string;
}

export function RatingModal({
  open,
  onClose,
  driverName,
  rideId,
}: RatingModalProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/rides/${rideId}/rate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating: selected }),
        },
      );
      if (!res.ok) throw new Error("Failed to submit rating");
      toast({
        title: "Rating submitted! ⭐",
        description: `You rated ${driverName} ${selected} stars.`,
      });
      // Notify FindCarpool and UpcomingRides to refresh driver ratings
      window.dispatchEvent(new CustomEvent("ratingSubmitted"));
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Rate Your Ride 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            How was your experience with{" "}
            <span className="font-semibold text-foreground">{driverName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Stars */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(star)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (hovered || selected)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Label */}
          <p
            className={`text-lg font-semibold transition-opacity ${hovered || selected ? "opacity-100" : "opacity-0"}`}
          >
            {labels[hovered || selected]}
          </p>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!selected || submitting}
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
