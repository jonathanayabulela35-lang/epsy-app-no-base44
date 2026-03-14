import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Personalisation() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

  const initialDisplayName = useMemo(() => {
    return user?.user_metadata?.display_name || "";
  }, [user]);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (userRole === "school_admin") {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const trimmedDisplayName = displayName.trim();

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          display_name: trimmedDisplayName,
        },
      });

      if (updateError) throw updateError;

      setMessage("Personalisation updated successfully.");
    } catch (err) {
      setError(err?.message || "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-3xl mx-auto">
        <Link
          to={createPageUrl("Settings")}
          className="inline-flex items-center text-black mb-6 hover:opacity-80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Personalisation</h1>
            <p className="text-[#2E5C6E]">
              Adjust how your name appears inside the EpsyApp.
            </p>
          </div>

          <Card className="bg-white border-[#2E5C6E]/20">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
                <User className="w-5 h-5 text-[#0CC0DF]" />
                Display Name
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#1E1E1E] block mb-2">
                    Display name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Kimberley"
                    maxLength={40}
                  />
                  <p className="text-xs text-[#2E5C6E] mt-2">
                    This is the name EpsyApp can use to personalise your experience.
                  </p>
                </div>

                {message && (
                  <div className="rounded-xl border border-[#0CC0DF]/30 bg-[#0CC0DF]/5 px-4 py-3 text-sm text-[#1E1E1E] flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#0CC0DF]" />
                    {message}
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white rounded-xl"
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
