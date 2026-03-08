import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const emptyForm = {
  id: null,
  subject: "",
  instruction_words_text: "",
  question_structure_text: "",
  how_to_respond_text: "",
  how_to_remember_text: "",
  common_traps_text: "",
  watch_for_text: "",
  past_paper_examples_text: "",
  published: false,
};

function parseLinesToArray(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function safeParseJson(text, fallback = []) {
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function stringifyJson(value, fallback = "[]") {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
}

function mapDecoderToForm(item) {
  return {
    id: item.id,
    subject: item.subject ?? "",
    instruction_words_text: stringifyJson(item.instruction_words, "[]"),
    question_structure_text: stringifyJson(item.question_structure, "[]"),
    how_to_respond_text: stringifyJson(item.how_to_respond, "[]"),
    how_to_remember_text: stringifyJson(item.how_to_remember, "[]"),
    common_traps_text: stringifyJson(item.common_traps, "[]"),
    watch_for_text: stringifyJson(item.watch_for, "[]"),
    past_paper_examples_text: stringifyJson(item.past_paper_examples, "[]"),
    published: !!item.published,
  };
}

function buildPayload(form) {
  return {
    subject: form.subject.trim(),
    instruction_words: safeParseJson(form.instruction_words_text, []),
    question_structure: safeParseJson(form.question_structure_text, []),
    how_to_respond: safeParseJson(form.how_to_respond_text, []),
    how_to_remember: safeParseJson(form.how_to_remember_text, []),
    common_traps: safeParseJson(form.common_traps_text, parseLinesToArray(form.common_traps_text)),
    watch_for: safeParseJson(form.watch_for_text, parseLinesToArray(form.watch_for_text)),
    past_paper_examples: safeParseJson(form.past_paper_examples_text, []),
    published: !!form.published,
  };
}

export default function AdminDecoder() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const {
    data: decoders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-decoder-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decoder_contents")
        .select("*")
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
          .from("decoder_contents")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("decoder_contents")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-decoder-contents"] });
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("decoder_contents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-decoder-contents"] });
      if (form.id) setForm(emptyForm);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }) => {
      const { data, error } = await supabase
        .from("decoder_contents")
        .update({ published })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-decoder-contents"] });
    },
  });

  const sortedDecoders = useMemo(() => decoders, [decoders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMutation.mutateAsync(form);
  };

  const editDecoder = (item) => {
    setForm(mapDecoderToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Decoder</h1>
          <p className="text-[#2E5C6E] mt-2">
            Create and manage subject-based decoder guides for students.
          </p>
        </div>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>{form.id ? "Edit Decoder Subject" : "Create Decoder Subject"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>

              <div>
                <Label>Instruction Words (JSON array)</Label>
                <Textarea
                  rows={8}
                  value={form.instruction_words_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, instruction_words_text: e.target.value }))
                  }
                  placeholder={`[
  {
    "word": "Discuss",
    "meaning": "Give a balanced explanation",
    "required": "Show more than one side",
    "example": "Discuss the causes of inflation"
  }
]`}
                />
              </div>

              <div>
                <Label>Question Structure (JSON array or object)</Label>
                <Textarea
                  rows={5}
                  value={form.question_structure_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, question_structure_text: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>How to Respond (JSON array or object)</Label>
                <Textarea
                  rows={5}
                  value={form.how_to_respond_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, how_to_respond_text: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>How to Remember (JSON array or object)</Label>
                <Textarea
                  rows={5}
                  value={form.how_to_remember_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, how_to_remember_text: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Common Traps (JSON array or one item per line)</Label>
                <Textarea
                  rows={5}
                  value={form.common_traps_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, common_traps_text: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Watch For (JSON array or one item per line)</Label>
                <Textarea
                  rows={5}
                  value={form.watch_for_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, watch_for_text: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Past Paper Examples (JSON array)</Label>
                <Textarea
                  rows={8}
                  value={form.past_paper_examples_text}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, past_paper_examples_text: e.target.value }))
                  }
                  placeholder={`[
  {
    "question": "Discuss the effects of inflation",
    "breakdown": "You must explain more than one effect clearly"
  }
]`}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.published}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, published: checked }))
                  }
                />
                <Label>Published</Label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Decoder Subject"}
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

        {isLoading && <p className="text-[#2E5C6E]">Loading decoder subjects...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        <div className="grid gap-4">
          {sortedDecoders.map((item) => (
            <Card key={item.id} className="border-[#2E5C6E]/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#1E1E1E]">{item.subject}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#2E5C6E]">
                <p>
                  Published: <span className="font-medium">{item.published ? "Yes" : "No"}</span>
                </p>
                <p>
                  Instruction words:{" "}
                  <span className="font-medium">
                    {Array.isArray(item.instruction_words) ? item.instruction_words.length : 0}
                  </span>
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => editDecoder(item)}>
                    Edit
                  </Button>

                  <Button
                    onClick={() =>
                      publishMutation.mutate({
                        id: item.id,
                        published: !item.published,
                      })
                    }
                    className={
                      item.published
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                    }
                  >
                    {item.published ? "Unpublish" : "Publish"}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!isLoading && sortedDecoders.length === 0 && (
            <Card>
              <CardContent className="py-8 text-[#2E5C6E]">
                No decoder subjects yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}