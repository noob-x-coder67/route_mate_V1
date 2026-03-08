import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Timer, Zap, Users } from "lucide-react";

interface WaitOrStartModalProps {
  open: boolean;
  passengerName: string;
  remainingSeats: number;
  onWait: () => void;
  onStart: () => void;
}

export function WaitOrStartModal({
  open,
  passengerName,
  remainingSeats,
  onWait,
  onStart,
}: WaitOrStartModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm mx-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            🎉 {passengerName} Accepted!
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              <strong className="text-foreground">{remainingSeats}</strong> seat
              {remainingSeats !== 1 ? "s" : ""} still available in your ride
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Do you want to wait for more passengers or start the ride now?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onWait}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all text-center"
          >
            <Timer className="h-7 w-7 text-primary" />
            <span className="text-sm font-semibold">Wait 2 Minutes</span>
            <span className="text-xs text-muted-foreground">
              Timer shows for you & passengers
            </span>
          </button>

          <button
            onClick={onStart}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-500/30 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all text-center"
          >
            <Zap className="h-7 w-7 text-green-600" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-500">
              Start Now
            </span>
            <span className="text-xs text-muted-foreground">
              Close remaining seats & go
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
