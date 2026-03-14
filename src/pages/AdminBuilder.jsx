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
  category: "",
  template_text: "",
  guidance: "",
  weak_example: "",
  strong_example: "",
  order: 0,
  published: false,
};

function mapTemplateToForm(item) {
  return {
    id: item.id,
    subject: item.subject ?? "",
    category: item.category ?? "",
    template_text: item.template_text ?? "",
    guidance: item.guidance ?? "",
    weak_example: item.weak_example ?? "",
    strong_example: item.strong_example ?? "",
    order: item.order ?? 0,
    published: !!item.published,
  };
}

function buildPayload(form) {
  return {
    subject: form.subject.trim(),
    category: form.category.trim(),
    template_text: form.template_text.trim(),
    guidance: form.guidance.trim(),
    weak_example: form.weak_example.trim(),
    strong_example: form.strong_example.trim(),
    order: Number(form.order) || 0,
    published: !!form.published,
  };
}

export default function AdminBuilder() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-question-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_templates")
        .select("*")
        .order("subject", { ascending: true })
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
          .from("question_templates")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("question_templates")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-templates"] });
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("question_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-templates"] });
      if (form.id) setForm(emptyForm);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }) => {
      const { data, error } = await supabase
        .from("question_templates")
        .update({ published })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-templates"] });
    },
  });

  const sortedTemplates = useMemo(() => templates, [templates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMutation.mutateAsync(form);
  };

  const editTemplate = (item) => {
    setForm(mapTemplateToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Builder</h1>
          <p className="text-[#2E5C6E] mt-2">
            Create and manage question-building templates for students.
          </p>
        </div>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>{form.id ? "Edit Template" : "Create Template"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
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
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Clarification"
                  />
                </div>

                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>Template Text</Label>
                <Textarea
                  value={form.template_text}
                  onChange={(e) => setForm((prev) => ({ ...prev, template_text: e.target.value }))}
                  rows={4}
                  placeholder='e.g. I understand [X], but I am confused about [Y] because...'
                  required
                />
              </div>

              <div>
                <Label>Guidance</Label>
                <Textarea
                  value={form.guidance}
                  onChange={(e) => setForm((prev) => ({ ...prev, guidance: e.target.value }))}
                  rows={4}
                  placeholder="Explain how students should use this template."
                />
              </div>

              <div>
                <Label>Weak Example</Label>
                <Textarea
                  value={form.weak_example}
                  onChange={(e) => setForm((prev) => ({ ...prev, weak_example: e.target.value }))}
                  rows={4}
                  placeholder="A poor version of the question"
                />
              </div>

              <div>
                <Label>Strong Example</Label>
                <Textarea
                  value={form.strong_example}
                  onChange={(e) => setForm((prev) => ({ ...prev, strong_example: e.target.value }))}
                  rows={4}
                  placeholder="A strong version of the question"
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
                  {saveMutation.isPending ? "Saving..." : "Save Template"}
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

        {isLoading && <p className="text-[#2E5C6E]">Loading templates...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        <div className="grid gap-4">
          {sortedTemplates.map((item) => (
            <Card key={item.id} className="border-[#2E5C6E]/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#1E1E1E]">
                  {item.subject} {item.category ? `• ${item.category}` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#2E5C6E]">
                <p>
                  Published: <span className="font-medium">{item.published ? "Yes" : "No"}</span>
                </p>
                <p>
                  Order: <span className="font-medium">{item.order ?? 0}</span>
                </p>
                <p>
                  Template:{" "}
                  <span className="font-medium text-[#1E1E1E]">
                    {item.template_text}
                  </span>
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => editTemplate(item)}>
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

          {!isLoading && sortedTemplates.length === 0 && (
            <Card>
              <CardContent className="py-8 text-[#2E5C6E]">
                No templates yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}