import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Physical Science",
  "Life Sciences",
  "English",
  "Accounting",
  "Economics",
  "Business Studies",
  "History",
  "Geography",
  "Xitsonga",
  "isiZulu",
  "Sesotho",
];

const emptyPreferences = {
  display_name: "",
  subjects: [],
  bookmark_enabled: true,
  progress_display_mode: "both",
};

export default function Personalisation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const studentId = user?.id;
  const userRole =
    user?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    "student";

  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");

  useEffect(() => {
    document.title = "EpsyApp | Personalisation";
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["student-preferences", studentId],
    enabled: !!studentId && userRole === "student",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_preferences")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      if (error) throw error;

      return data ?? { ...emptyPreferences, student_id: studentId };
    },
  });

  const currentPrefs = useMemo(() => {
    return {
      display_name: preferences?.display_name ?? "",
      subjects: Array.isArray(preferences?.subjects) ? preferences.subjects : [],
      bookmark_enabled:
        typeof preferences?.bookmark_enabled === "boolean"
          ? preferences.bookmark_enabled
          : true,
      progress_display_mode: preferences?.progress_display_mode ?? "both",
    };
  }, [preferences]);

  const [form, setForm] = useState(emptyPreferences);

  useEffect(() => {
    if (preferences) {
      setForm({
        display_name: preferences.display_name ?? "",
        subjects: Array.isArray(preferences.subjects) ? preferences.subjects : [],
        bookmark_enabled:
          typeof preferences.bookmark_enabled === "boolean"
            ? preferences.bookmark_enabled
            : true,
        progress_display_mode: preferences.progress_display_mode ?? "both",
      });
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (!studentId) throw new Error("No student account found.");

      const record = {
        student_id: studentId,
        display_name: payload.display_name.trim(),
        subjects: payload.subjects,
        bookmark_enabled: payload.bookmark_enabled,
        progress_display_mode: payload.progress_display_mode,
      };

      const { data, error } = await supabase
        .from("student_preferences")
        .upsert(record, { onConflict: "student_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setUiError("");
      setUiSuccess("Personalisation saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["student-preferences", studentId] });
    },
    onError: (error) => {
      setUiSuccess("");
      setUiError(error?.message || "Failed to save personalisation.");
    },
  });

  const toggleSubject = (subject) => {
    setForm((prev) => {
      const exists = prev.subjects.includes(subject);
      return {
        ...prev,
        subjects: exists
          ? prev.subjects.filter((item) => item !== subject)
          : [...prev.subjects, subject],
      };
    });
  };

  const handleSave = async () => {
    setUiError("");
    setUiSuccess("");
    await saveMutation.mutateAsync(form);
  };

  if (userRole !== "student") {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Personalisation</h1>
          <p className="text-[#2E5C6E] mt-2">
            Adjust how Epsy feels and responds to your learning journey.
          </p>
        </div>

        {uiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {uiError}
          </div>
        )}

        {uiSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {uiSuccess}
          </div>
        )}

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>How should Epsy address you?</Label>
            <Input
              value={form.display_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, display_name: e.target.value }))
              }
              placeholder="e.g. Aya"
            />
          </CardContent>
        </Card>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#2E5C6E]">
              Choose the subjects you want Epsy to personalise for you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SUBJECT_OPTIONS.map((subject) => {
                const selected = form.subjects.includes(subject);

                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[#0CC0DF] bg-[#0CC0DF]/10 text-[#1E1E1E]"
                        : "border-[#2E5C6E]/20 bg-white text-[#2E5C6E]"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>Word Bookmark Feature</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[#1E1E1E] font-medium">Enable Word Bookmarks</p>
              <p className="text-sm text-[#2E5C6E] mt-1">
                Let Epsy save and manage important words for you.
              </p>
            </div>

            <Switch
              checked={form.bookmark_enabled}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, bookmark_enabled: checked }))
              }
            />
          </CardContent>
        </Card>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>Progress Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Choose how your progress should be shown</Label>
            <select
              value={form.progress_display_mode}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  progress_display_mode: e.target.value,
                }))
              }
              className="w-full border rounded-md px-3 py-2 bg-white"
            >
              <option value="weekly_summary">Weekly Summary</option>
              <option value="total_steps">Total Steps</option>
              <option value="both">Both</option>
              <option value="hidden">Hidden</option>
            </select>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
          >
            {saveMutation.isPending ? "Saving..." : "Save Personalisation"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(currentPrefs);
              setUiError("");
              setUiSuccess("");
            }}
          >
            Reset Changes
          </Button>
        </div>
      </div>
    </div>
  );
}