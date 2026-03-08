import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const emptyForm = {
  id: null,
  day_number: 1,
  goal: "",
  daily_task: "",
  example: "",
  deeper_explanation: "",
  thought_offering: "",
};

function mapDayToForm(day) {
  return {
    id: day.id,
    day_number: day.day_number ?? 1,
    goal: day.goal ?? "",
    daily_task: day.daily_task ?? "",
    example: day.example ?? "",
    deeper_explanation: day.deeper_explanation ?? "",
    thought_offering: day.thought_offering ?? "",
  };
}

export default function AdminChallengeDays() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const challengeId = searchParams.get("challengeId");
  const [form, setForm] = useState(emptyForm);

  const {
    data: challenge,
    isLoading: challengeLoading,
    error: challengeError,
  } = useQuery({
    queryKey: ["admin-challenge", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const {
    data: days = [],
    isLoading: daysLoading,
    error: daysError,
  } = useQuery({
    queryKey: ["admin-challenge-days", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_days")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (currentForm) => {
      const payload = {
        challenge_id: challengeId,
        day_number: Number(currentForm.day_number) || 1,
        goal: currentForm.goal.trim(),
        daily_task: currentForm.daily_task.trim(),
        example: currentForm.example.trim(),
        deeper_explanation: currentForm.deeper_explanation.trim(),
        thought_offering: currentForm.thought_offering.trim(),
      };

      if (currentForm.id) {
        const { data, error } = await supabase
          .from("challenge_days")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("challenge_days")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-challenge-days", challengeId],
      });
      setForm(emptyForm);
    },
  });

  const sortedDays = useMemo(() => days, [days]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMutation.mutateAsync(form);
  };

  const editDay = (day) => {
    setForm(mapDayToForm(day));
  };

  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-8 text-[#2E5C6E]">
              No challenge selected. Go back to Admin Challenges and click “Days”.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Challenge Days</h1>
          <p className="text-[#2E5C6E] mt-2">
            {challengeLoading
              ? "Loading challenge..."
              : challengeError
              ? "Failed to load challenge"
              : `Managing daily steps for: ${challenge?.title || "Challenge"}`}
          </p>
        </div>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>{form.id ? "Edit Day" : "Add Day"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Day Number</label>
                <Input
                  type="number"
                  value={form.day_number}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, day_number: e.target.value }))
                  }
                  min="1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Goal</label>
                <Textarea
                  value={form.goal}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, goal: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Daily Task</label>
                <Textarea
                  value={form.daily_task}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, daily_task: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Example</label>
                <Textarea
                  value={form.example}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, example: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">
                  Deeper Explanation
                </label>
                <Textarea
                  value={form.deeper_explanation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deeper_explanation: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Thought Offering</label>
                <Textarea
                  value={form.thought_offering}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      thought_offering: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Day"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(emptyForm)}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {daysLoading && <p className="text-[#2E5C6E]">Loading days...</p>}
        {daysError && <p className="text-red-600">{daysError.message}</p>}

        <div className="grid gap-4">
          {sortedDays.map((day) => (
            <Card key={day.id} className="border-[#2E5C6E]/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#1E1E1E]">
                  Day {day.day_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[#2E5C6E]">
                <p>
                  <span className="font-medium text-[#1E1E1E]">Goal:</span>{" "}
                  {day.goal || "—"}
                </p>
                <p>
                  <span className="font-medium text-[#1E1E1E]">Task:</span>{" "}
                  {day.daily_task || "—"}
                </p>
                <p>
                  <span className="font-medium text-[#1E1E1E]">Example:</span>{" "}
                  {day.example || "—"}
                </p>

                <Button variant="outline" onClick={() => editDay(day)}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}