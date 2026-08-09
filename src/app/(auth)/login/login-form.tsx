"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction, type LoginFormState } from "./actions";
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

const initialState: LoginFormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>התחברות</CardTitle>
        <CardDescription>היכנס לחשבון Smart Folio שלך</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

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
              autoComplete="current-password"
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
            {pending ? "מתחבר..." : "התחברות"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            אין לך חשבון?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              הרשמה
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
