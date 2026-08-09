"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionFormState,
} from "@/app/(app)/transactions/actions";
import { SUPPORTED_CURRENCIES } from "@/validators/portfolio";
import {
  QUANTITY_TYPES,
  SECURITY_REQUIRED_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionTypeValue,
} from "@/components/transactions/transaction-type-labels";
import { SecurityCombobox, type SecurityOption } from "@/components/transactions/security-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const initialState: TransactionFormState = {};

export interface TransactionFormValues {
  id: string;
  type: TransactionTypeValue;
  date: string;
  quantity: number | null;
  price: number | null;
  currency: string;
  fees: number;
  tax: number;
  notes: string | null;
  security: SecurityOption | null;
}

export function TransactionFormDialog({
  portfolioId,
  transaction,
  trigger,
}: {
  portfolioId: string;
  transaction?: TransactionFormValues;
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(transaction);
  const action = isEdit ? updateTransactionAction : createTransactionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionTypeValue>(transaction?.type ?? "BUY");
  const [currency, setCurrency] = useState(transaction?.currency ?? "USD");
  const [force, setForce] = useState(false);

  const needsSecurity = SECURITY_REQUIRED_TYPES.has(type);
  const needsQuantity = QUANTITY_TYPES.has(type);

  useEffect(() => {
    // Reacting to the server action's result (an external async event, not
    // a value derived from props/state within this component) — closing
    // the dialog here is the correct place for that synchronization.
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setForce(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForce(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus />
            עסקה חדשה
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת עסקה" : "עסקה חדשה"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "עדכן את פרטי העסקה." : "הוסף עסקה ידנית לתיק ההשקעות."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="portfolioId" value={portfolioId} />
          {isEdit ? <input type="hidden" name="transactionId" value={transaction!.id} /> : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="currency" value={currency} />
          {force ? <input type="hidden" name="force" value="1" /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type-trigger">סוג עסקה</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionTypeValue)}>
                <SelectTrigger id="type-trigger" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">תאריך</Label>
              <Input id="date" name="date" type="date" dir="ltr" defaultValue={transaction?.date} required />
            </div>
          </div>

          {needsSecurity ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="security-input">נייר ערך</Label>
              <SecurityCombobox name="security" defaultValue={transaction?.security ?? undefined} required />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            {needsQuantity ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="quantity">כמות</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0"
                  dir="ltr"
                  defaultValue={transaction?.quantity ?? undefined}
                  required
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="price">{needsQuantity ? "מחיר ליחידה" : "סכום כולל"}</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="any"
                min="0"
                dir="ltr"
                defaultValue={transaction?.price ?? undefined}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="currency-trigger">מטבע</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency-trigger" className="w-full">
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
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fees">עמלה</Label>
              <Input id="fees" name="fees" type="number" step="any" min="0" dir="ltr" defaultValue={transaction?.fees ?? 0} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tax">מס</Label>
              <Input id="tax" name="tax" type="number" step="any" min="0" dir="ltr" defaultValue={transaction?.tax ?? 0} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={transaction?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="confirmFutureDate" className="size-4" />
            אני מאשר שזו עסקה עם תאריך עתידי מכוון
          </label>

          {state.error ? (
            <div className="rounded-md border border-loss/30 bg-loss/10 p-3 text-sm text-loss">
              <p>{state.error}</p>
              {state.duplicateOf && !force ? (
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setForce(true)}
                >
                  שמירה בכל זאת
                </Button>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "שומר..." : isEdit ? "שמירה" : "הוספה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
