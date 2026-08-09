"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteTransactionAction } from "@/app/(app)/transactions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-loss hover:text-loss" aria-label="מחיקת עסקה">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>מחיקת עסקה</DialogTitle>
          <DialogDescription>
            פעולה זו תמחק את העסקה לצמיתות ותשפיע על חישובי האחזקות של התיק. לא
            ניתן לבטל פעולה זו.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteTransactionAction}>
          <input type="hidden" name="transactionId" value={transactionId} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" variant="destructive">
              מחיקה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
