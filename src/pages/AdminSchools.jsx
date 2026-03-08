import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const emptyForm = {
  id: null,
  name: "",
  school_code: "",
  seat_limit: 0,
  seats_generated: 0,
  status: "active",
};

export default function AdminSchools() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");

  const {
    data: schools = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (currentForm) => {
      const payload = {
        name: currentForm.name.trim(),
        school_code: currentForm.school_code.trim(),
        seat_limit: Number(currentForm.seat_limit) || 0,
        seats_generated: Number(currentForm.seats_generated) || 0,
        status: currentForm.status || "active",
      };

      console.log("Saving school payload:", payload);

      if (currentForm.id) {
        const { data, error } = await supabase
          .from("schools")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("schools")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("School save success:", data);
      setUiError("");
      setUiSuccess("School saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      setForm(emptyForm);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => {
      console.error("School save error:", error);
      setUiSuccess("");
      setUiError(error?.message || "Failed to save school.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("schools")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      setUiError("");
      setUiSuccess("School deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (error) => {
      console.error("School delete error:", error);
      setUiSuccess("");
      setUiError(error?.message || "Failed to delete school.");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiError("");
    setUiSuccess("");
    await saveMutation.mutateAsync(form);
  };

  const editSchool = (school) => {
    setUiError("");
    setUiSuccess("");
    setForm({
      id: school.id,
      name: school.name ?? "",
      school_code: school.school_code ?? "",
      seat_limit: school.seat_limit ?? 0,
      seats_generated: school.seats_generated ?? 0,
      status: school.status ?? "active",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Schools</h1>
          <p className="text-[#2E5C6E] mt-2">
            Create and manage school records and seat counts.
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
            <CardTitle>{form.id ? "Edit School" : "Create School"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">School Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Hillview High"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">School Code</label>
                <Input
                  value={form.school_code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, school_code: e.target.value }))
                  }
                  placeholder="e.g. HILL001"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Seat Limit</label>
                <Input
                  type="number"
                  value={form.seat_limit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, seat_limit: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Seats Generated</label>
                <Input
                  type="number"
                  value={form.seats_generated}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, seats_generated: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1E1E1E]">Status</label>
                <Input
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  placeholder="active"
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  {saveMutation.isPending ? "Saving..." : "Save School"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(emptyForm);
                    setUiError("");
                    setUiSuccess("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isLoading && <p className="text-[#2E5C6E]">Loading schools...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        <div className="grid gap-4">
          {schools.map((school) => (
            <Card key={school.id} className="border-[#2E5C6E]/15">
              <CardContent className="py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-[#1E1E1E]">{school.name}</p>
                  <p className="text-sm text-[#2E5C6E]">
                    Code: {school.school_code || "—"}
                  </p>
                  <p className="text-sm text-[#2E5C6E]">
                    Seats: {school.seats_generated ?? 0} / {school.seat_limit ?? 0}
                  </p>
                  <p className="text-sm text-[#2E5C6E]">
                    Status: {school.status || "active"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => editSchool(school)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(school.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!isLoading && schools.length === 0 && (
            <Card>
              <CardContent className="py-8 text-[#2E5C6E]">
                No schools yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}