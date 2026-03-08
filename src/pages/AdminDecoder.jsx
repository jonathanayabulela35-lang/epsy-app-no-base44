import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const emptyInstructionWord = {
  word: "",
  meaning: "",
  required: "",
  example: "",
};

const emptyPastPaperExample = {
  question: "",
  breakdown: "",
};

const emptyForm = {
  id: null,
  subject: "",
  instruction_words: [emptyInstructionWord],
  question_structure: "",
  how_to_respond: "",
  how_to_remember: "",
  common_traps: [""],
  watch_for: [""],
  past_paper_examples: [emptyPastPaperExample],
  published: false,
};

function normalizeStringArray(arr) {
  return (arr || []).map((item) => (typeof item === "string" ? item : "")).filter((item) => item.trim() !== "");
}

function mapDecoderToForm(item) {
  return {
    id: item.id,
    subject: item.subject ?? "",
    instruction_words:
      Array.isArray(item.instruction_words) && item.instruction_words.length > 0
        ? item.instruction_words.map((word) => ({
            word: word.word ?? "",
            meaning: word.meaning ?? "",
            required: word.required ?? "",
            example: word.example ?? "",
          }))
        : [emptyInstructionWord],
    question_structure: Array.isArray(item.question_structure)
      ? item.question_structure.join("\n")
      : typeof item.question_structure === "string"
      ? item.question_structure
      : "",
    how_to_respond: Array.isArray(item.how_to_respond)
      ? item.how_to_respond.join("\n")
      : typeof item.how_to_respond === "string"
      ? item.how_to_respond
      : "",
    how_to_remember: Array.isArray(item.how_to_remember)
      ? item.how_to_remember.join("\n")
      : typeof item.how_to_remember === "string"
      ? item.how_to_remember
      : "",
    common_traps:
      Array.isArray(item.common_traps) && item.common_traps.length > 0
        ? item.common_traps.map((trap) => (typeof trap === "string" ? trap : ""))
        : [""],
    watch_for:
      Array.isArray(item.watch_for) && item.watch_for.length > 0
        ? item.watch_for.map((watch) => (typeof watch === "string" ? watch : ""))
        : [""],
    past_paper_examples:
      Array.isArray(item.past_paper_examples) && item.past_paper_examples.length > 0
        ? item.past_paper_examples.map((example) => ({
            question: example.question ?? "",
            breakdown: example.breakdown ?? "",
          }))
        : [emptyPastPaperExample],
    published: !!item.published,
  };
}

function buildPayload(form) {
  return {
    subject: form.subject.trim(),
    instruction_words: form.instruction_words
      .map((word) => ({
        word: word.word.trim(),
        meaning: word.meaning.trim(),
        required: word.required.trim(),
        example: word.example.trim(),
      }))
      .filter((word) => word.word || word.meaning || word.required || word.example),
    question_structure: form.question_structure
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    how_to_respond: form.how_to_respond
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    how_to_remember: form.how_to_remember
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    common_traps: normalizeStringArray(form.common_traps),
    watch_for: normalizeStringArray(form.watch_for),
    past_paper_examples: form.past_paper_examples
      .map((item) => ({
        question: item.question.trim(),
        breakdown: item.breakdown.trim(),
      }))
      .filter((item) => item.question || item.breakdown),
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

  const updateInstructionWord = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.instruction_words];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, instruction_words: updated };
    });
  };

  const addInstructionWord = () => {
    setForm((prev) => ({
      ...prev,
      instruction_words: [...prev.instruction_words, { ...emptyInstructionWord }],
    }));
  };

  const removeInstructionWord = (index) => {
    setForm((prev) => ({
      ...prev,
      instruction_words:
        prev.instruction_words.length > 1
          ? prev.instruction_words.filter((_, i) => i !== index)
          : [{ ...emptyInstructionWord }],
    }));
  };

  const updateStringList = (field, index, value) => {
    setForm((prev) => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const addStringListItem = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeStringListItem = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        prev[field].length > 1
          ? prev[field].filter((_, i) => i !== index)
          : [""],
    }));
  };

  const updatePastPaperExample = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.past_paper_examples];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, past_paper_examples: updated };
    });
  };

  const addPastPaperExample = () => {
    setForm((prev) => ({
      ...prev,
      past_paper_examples: [...prev.past_paper_examples, { ...emptyPastPaperExample }],
    }));
  };

  const removePastPaperExample = (index) => {
    setForm((prev) => ({
      ...prev,
      past_paper_examples:
        prev.past_paper_examples.length > 1
          ? prev.past_paper_examples.filter((_, i) => i !== index)
          : [{ ...emptyPastPaperExample }],
    }));
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Instruction Words</Label>
                {form.instruction_words.map((word, index) => (
                  <Card key={index} className="border-[#2E5C6E]/10">
                    <CardContent className="pt-6 space-y-3">
                      <Input
                        placeholder="Instruction word"
                        value={word.word}
                        onChange={(e) => updateInstructionWord(index, "word", e.target.value)}
                      />
                      <Textarea
                        placeholder="Meaning"
                        value={word.meaning}
                        onChange={(e) => updateInstructionWord(index, "meaning", e.target.value)}
                        rows={3}
                      />
                      <Textarea
                        placeholder="What is required from the student"
                        value={word.required}
                        onChange={(e) => updateInstructionWord(index, "required", e.target.value)}
                        rows={3}
                      />
                      <Textarea
                        placeholder="Example"
                        value={word.example}
                        onChange={(e) => updateInstructionWord(index, "example", e.target.value)}
                        rows={3}
                      />
                      <Button type="button" variant="outline" onClick={() => removeInstructionWord(index)}>
                        Remove Instruction Word
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addInstructionWord}>
                  Add Instruction Word
                </Button>
              </div>

              <div>
                <Label>Question Structure</Label>
                <Textarea
                  value={form.question_structure}
                  onChange={(e) => setForm((prev) => ({ ...prev, question_structure: e.target.value }))}
                  rows={5}
                  placeholder="Write one point per line"
                />
              </div>

              <div>
                <Label>How to Respond</Label>
                <Textarea
                  value={form.how_to_respond}
                  onChange={(e) => setForm((prev) => ({ ...prev, how_to_respond: e.target.value }))}
                  rows={5}
                  placeholder="Write one point per line"
                />
              </div>

              <div>
                <Label>How to Remember</Label>
                <Textarea
                  value={form.how_to_remember}
                  onChange={(e) => setForm((prev) => ({ ...prev, how_to_remember: e.target.value }))}
                  rows={5}
                  placeholder="Write one point per line"
                />
              </div>

              <div className="space-y-3">
                <Label>Common Traps</Label>
                {form.common_traps.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateStringList("common_traps", index, e.target.value)}
                      placeholder="Common mistake students make"
                    />
                    <Button type="button" variant="outline" onClick={() => removeStringListItem("common_traps", index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addStringListItem("common_traps")}>
                  Add Common Trap
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Watch For</Label>
                {form.watch_for.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateStringList("watch_for", index, e.target.value)}
                      placeholder="What students should notice"
                    />
                    <Button type="button" variant="outline" onClick={() => removeStringListItem("watch_for", index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addStringListItem("watch_for")}>
                  Add Watch For Item
                </Button>
              </div>

              <div className="space-y-4">
                <Label>Past Paper Examples</Label>
                {form.past_paper_examples.map((item, index) => (
                  <Card key={index} className="border-[#2E5C6E]/10">
                    <CardContent className="pt-6 space-y-3">
                      <Textarea
                        placeholder="Question"
                        value={item.question}
                        onChange={(e) => updatePastPaperExample(index, "question", e.target.value)}
                        rows={3}
                      />
                      <Textarea
                        placeholder="Breakdown / explanation"
                        value={item.breakdown}
                        onChange={(e) => updatePastPaperExample(index, "breakdown", e.target.value)}
                        rows={4}
                      />
                      <Button type="button" variant="outline" onClick={() => removePastPaperExample(index)}>
                        Remove Example
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addPastPaperExample}>
                  Add Past Paper Example
                </Button>
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