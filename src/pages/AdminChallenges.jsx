import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

const emptyForm = {
  id: null,
  title: "",
  slug: "",
  icon: "",
  why_this_happens: "",
  how_to_reframe: "",
  if_you_ignore: "",
  if_you_act: "",
  full_breakdown: "",
  thought_offering: "",
  execution_overview_text: "",
  published: false,
  order: 0,
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function mapChallengeToForm(challenge) {
  return {
    id: challenge.id,
    title: challenge.title ?? "",
    slug: challenge.slug ?? "",
    icon: challenge.icon ?? "",
    why_this_happens: challenge.why_this_happens ?? "",
    how_to_reframe: challenge.how_to_reframe ?? "",
    if_you_ignore: challenge.if_you_ignore ?? "",
    if_you_act: challenge.if_you_act ?? "",
    full_breakdown: challenge.full_breakdown ?? "",
    thought_offering: challenge.thought_offering ?? "",
    execution_overview_text: Array.isArray(challenge.execution_overview)
      ? challenge.execution_overview.join("\n")
      : "",
    published: !!challenge.published,
    order: challenge.order ?? 0,
  };
}

function buildPayload(form) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim() || slugify(form.title),
    icon: form.icon.trim(),
    why_this_happens: form.why_this_happens.trim(),
    how_to_reframe: form.how_to_reframe.trim(),
    if_you_ignore: form.if_you_ignore.trim(),
    if_you_act: form.if_you_act.trim(),
    full_breakdown: form.full_breakdown.trim(),
    thought_offering: form.thought_offering.trim(),
    execution_overview: form.execution_overview_text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    published: !!form.published,
    order: Number(form.order) || 0,
  };
}

export default function AdminChallenges() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const {
    data: challenges = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (currentForm) => {
      const payload = buildPayload(currentForm);

      if (currentForm.id) {
        const { data, error } = await supabase
          .from("challenges")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("challenges")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      setOpen(false);
      setForm(emptyForm);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }) => {
      const { data, error } = await supabase
        .from("challenges")
        .update({ published })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
  });

  const sortedChallenges = useMemo(() => challenges, [challenges]);

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (challenge) => {
    setForm(mapChallengeToForm(challenge));
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMutation.mutateAsync(form);
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">Admin Challenges</h1>
            <p className="text-[#2E5C6E] mt-1">
              Create, edit, and publish psychological challenge content.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreate}
                className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                New Challenge
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {form.id ? "Edit Challenge" : "Create Challenge"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                          slug:
                            prev.id || prev.slug
                              ? prev.slug
                              : slugify(e.target.value),
                        }))
                      }
                      placeholder="e.g. Exam Anxiety"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      placeholder="e.g. exam-anxiety"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Icon / Emoji</Label>
                    <Input
                      value={form.icon}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, icon: e.target.value }))
                      }
                      placeholder="e.g. 🧠"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      value={form.order}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, order: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Why This Happens</Label>
                  <Textarea
                    value={form.why_this_happens}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        why_this_happens: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>How to Reframe It</Label>
                  <Textarea
                    value={form.how_to_reframe}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        how_to_reframe: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>If You Ignore It</Label>
                  <Textarea
                    value={form.if_you_ignore}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        if_you_ignore: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>If You Act On It</Label>
                  <Textarea
                    value={form.if_you_act}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        if_you_act: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Full Breakdown</Label>
                  <Textarea
                    value={form.full_breakdown}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        full_breakdown: e.target.value,
                      }))
                    }
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Thought Offering</Label>
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

                <div className="space-y-2">
                  <Label>Execution Overview (one day label per line)</Label>
                  <Textarea
                    value={form.execution_overview_text}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        execution_overview_text: e.target.value,
                      }))
                    }
                    rows={5}
                    placeholder={`Day 1 - Awareness\nDay 2 - Reflection\nDay 3 - Action`}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={form.published}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, published: checked }))
                    }
                  />
                  <Label>Published</Label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setForm(emptyForm);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Challenge"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="py-8 text-[#2E5C6E]">
              Loading challenges...
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-red-600">
              {error.message || "Failed to load challenges."}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && sortedChallenges.length === 0 && (
          <Card>
            <CardContent className="py-8 text-[#2E5C6E]">
              No challenges yet. Create your first one.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {sortedChallenges.map((challenge) => (
            <Card key={challenge.id} className="border-[#2E5C6E]/15">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-[#1E1E1E] flex items-center gap-2">
                      <span>{challenge.icon || "🧠"}</span>
                      <span>{challenge.title}</span>
                    </CardTitle>
                    <p className="text-sm text-[#2E5C6E] mt-2">
                      Slug: {challenge.slug || "—"}
                    </p>
                    <p className="text-sm text-[#2E5C6E]">
                      Order: {challenge.order ?? 0}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEdit(challenge)}
                    >
                      Edit
                    </Button>

                    <Button asChild variant="outline">
                      <Link to={`${createPageUrl("AdminChallengeDays")}?challengeId=${challenge.id}`}>
                        Days
                      </Link>
                    </Button>

                    <Button
                      onClick={() =>
                        publishMutation.mutate({
                          id: challenge.id,
                          published: !challenge.published,
                        })
                      }
                      disabled={publishMutation.isPending}
                      className={
                        challenge.published
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                      }
                    >
                      {challenge.published ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-sm text-[#2E5C6E]">
                <div>
                  <span className="font-medium text-[#1E1E1E]">
                    Published:
                  </span>{" "}
                  {challenge.published ? "Yes" : "No"}
                </div>

                <div>
                  <span className="font-medium text-[#1E1E1E]">
                    Why This Happens:
                  </span>{" "}
                  {challenge.why_this_happens
                    ? challenge.why_this_happens.slice(0, 140) +
                      (challenge.why_this_happens.length > 140 ? "..." : "")
                    : "—"}
                </div>

                <div>
                  <span className="font-medium text-[#1E1E1E]">
                    Execution Overview:
                  </span>{" "}
                  {Array.isArray(challenge.execution_overview) &&
                  challenge.execution_overview.length > 0
                    ? challenge.execution_overview.join(" • ")
                    : "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}