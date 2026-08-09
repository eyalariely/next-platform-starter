"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";

import {
  createPortfolioAction,
  updatePortfolioAction,
  type PortfolioFormState,
} from "@/app/(app)/portfolio/actions";
import { SUPPORTED_CURRENCIES } from "@/validators/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: PortfolioFormState = {};

export function PortfolioFormDialog({
  portfolio,
}: {
  portfolio?: { id: string; name: string; baseCurrency: string };
}) {
  const isEdit = Boolean(portfolio);
  const action = isEdit ? updatePortfolioAction : createPortfolioAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(portfolio?.baseCurrency ?? "USD");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil />
            עריכה
          </Button>
        ) : (
          <Button size="sm">
            <Plus />
            תיק חדש
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת תיק" : "יצירת תיק חדש"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "עדכן את שם התיק או את מטבע הבסיס שלו."
              : "תן שם לתיק ובחר את מטבע הבסיס שבו יוצגו כל הערכים המצטברים."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {isEdit ? <input type="hidden" name="portfolioId" value={portfolio!.id} /> : null}
          <input type="hidden" name="baseCurrency" value={currency} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">שם התיק</Label>
            <Input id="name" name="name" defaultValue={portfolio?.name} required maxLength={100} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="baseCurrency-trigger">מטבע בסיס</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={isEdit}>
              <SelectTrigger id="baseCurrency-trigger" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    <span className="ltr-numeric">{code}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit ? (
              <p className="text-xs text-muted-foreground">
                לא ניתן לשנות מטבע בסיס לתיק קיים כדי לא לעוות חישובים היסטוריים.
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-loss">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "שומר..." : isEdit ? "שמירה" : "יצירה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
