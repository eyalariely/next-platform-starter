"use client";

import { useActionState } from "react";
import Link from "next/link";

import { registerAction, type RegisterFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: RegisterFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>יצירת חשבון</CardTitle>
        <CardDescription>הרשמה חדשה ל-Smart Folio</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">שם מלא</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">אימות סיסמה</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-loss">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "יוצר חשבון..." : "הרשמה"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              התחברות
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
