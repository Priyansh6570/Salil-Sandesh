"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");

  const requestOtp = useMutation({
    mutationFn: async () => {
      const response = await postJson("/api/auth/request-otp", { phone });
      if (!response.ok) {
        throw new Error(response.status === 429 ? "बहुत अधिक प्रयास, कुछ देर बाद कोशिश करें" : "अमान्य फ़ोन नंबर");
      }
    },
    onSuccess: () => {
      setError("");
      setStep("code");
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      const response = await postJson("/api/auth/verify", { phone, code });
      if (!response.ok) {
        throw new Error(response.status === 429 ? "बहुत अधिक प्रयास, कुछ देर बाद कोशिश करें" : "अमान्य कोड");
      }
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">सलिल संदेश — प्रबंधन</CardTitle>
          <CardDescription>
            {step === "phone" ? "फ़ोन नंबर से लॉगिन करें" : "सर्वर लॉग में आया कोड दर्ज करें"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestOtp.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="phone">फ़ोन नंबर</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+919999000001"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={requestOtp.isPending}>
                कोड भेजें
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                verifyOtp.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="code">ओटीपी कोड</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
                लॉगिन करें
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
              >
                नंबर बदलें
              </Button>
            </form>
          )}
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
