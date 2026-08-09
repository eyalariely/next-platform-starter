"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deletePortfolioAction } from "@/app/(app)/portfolio/actions";
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

export function DeletePortfolioButton({
  portfolioId,
  portfolioName,
}: {
  portfolioId: string;
  portfolioName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-loss hover:text-loss">
          <Trash2 />
          מחיקה
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>מחיקת תיק &quot;{portfolioName}&quot;</DialogTitle>
          <DialogDescription>
            פעולה זו תמחק לצמיתות את כל העסקאות, ההיסטוריה והתרחישים השייכים לתיק
            זה. לא ניתן לבטל פעולה זו.
          </DialogDescription>
        </DialogHeader>
        <form action={deletePortfolioAction}>
          <input type="hidden" name="portfolioId" value={portfolioId} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" variant="destructive">
              מחיקה לצמיתות
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
