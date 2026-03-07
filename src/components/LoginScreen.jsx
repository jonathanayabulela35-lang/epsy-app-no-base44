import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPin = pin.trim();

      if (!cleanUsername || !cleanPin) {
        throw new Error("Please enter your username and PIN.");
      }

      const { data, error: fnError } = await supabase.functions.invoke("login-with-pin", {
        body: {
          username: cleanUsername,
          pin: cleanPin,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Login failed.");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Login failed.");
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white border-[#2E5C6E]/20">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">Sign in</CardTitle>
          <p className="text-sm text-[#2E5C6E]">
            Use the login details provided by your school.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E1E1E]">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. testuser"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1E1E1E]">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}