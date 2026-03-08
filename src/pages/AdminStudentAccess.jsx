import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const emptyForm = {
  id: null,
  username: "",
  pin: "",
  role: "student",
  full_name: "",
  display_name: "",
  grade: "",
  school_id: "",
  access_status: "active",
  status: "unused",
};

export default function AdminStudentAccess() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const {
    data: studentAccounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-student-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["admin-schools-for-student-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, school_code")
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (currentForm) => {
      const payload = {
        username: currentForm.username.trim().toLowerCase(),
        pin: currentForm.pin.trim(),
        role: currentForm.role,
        full_name: currentForm.full_name.trim(),
        display_name: currentForm.display_name.trim(),
        grade: currentForm.grade.trim(),
        school_id: currentForm.school_id || null,
        access_status: currentForm.access_status,
        status: currentForm.status,
      };

      if (currentForm.id) {
        const { data, error } = await supabase
          .from("student_accounts")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("student_accounts")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      setForm(emptyForm);
    },
  });

  const schoolMap = useMemo(() => {
    const map = {};
    for (const school of schools) {
      map[school.id] = school;
    }
    return map;
  }, [schools]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMutation.mutateAsync(form);
  };

  const editStudent = (student) => {
    setForm({
      id: student.id,
      username: student.username ?? "",
      pin: student.pin ?? "",
      role: student.role ?? "student",
      full_name: student.full_name ?? "",
      display_name: student.display_name ?? "",
      grade: student.grade ?? "",
      school_id: student.school_id ?? "",
      access_status: student.access_status ?? "active",
      status: student.status ?? "unused",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Student Access</h1>
          <p className="text-[#2E5C6E] mt-2">
            Create and manage student and admin accounts, grades, and access settings.
          </p>
        </div>

        <Card className="border-[#2E5C6E]/15">
          <CardHeader>
            <CardTitle>{form.id ? "Edit Account" : "Create Account"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. aya01"
                  required
                />
              </div>

              <div>
                <Label>PIN</Label>
                <Input
                  value={form.pin}
                  onChange={(e) => setForm((prev) => ({ ...prev, pin: e.target.value }))}
                  placeholder="e.g. 1234"
                  required
                />
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Student full name"
                />
              </div>

              <div>
                <Label>Display Name</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Optional display name"
                />
              </div>

              <div>
                <Label>Grade</Label>
                <Input
                  value={form.grade}
                  onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
                  placeholder="e.g. Grade 10"
                />
              </div>

              <div>
                <Label>Role</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="student">student</option>
                  <option value="epsy_admin">epsy_admin</option>
                </select>
              </div>

              <div>
                <Label>School</Label>
                <select
                  value={form.school_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, school_id: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">No school selected</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Access Status</Label>
                <select
                  value={form.access_status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, access_status: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div>
                <Label>Account Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="unused">unused</option>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Account"}
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

        {isLoading && <p className="text-[#2E5C6E]">Loading student accounts...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        <div className="grid gap-4">
          {studentAccounts.map((student) => (
            <Card key={student.id} className="border-[#2E5C6E]/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#1E1E1E]">
                  {student.display_name || student.full_name || student.username}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#2E5C6E] space-y-1">
                <p>Username: {student.username}</p>
                <p>Role: {student.role || "student"}</p>
                <p>Grade: {student.grade || "—"}</p>
                <p>
                  School: {student.school_id && schoolMap[student.school_id]
                    ? schoolMap[student.school_id].name
                    : "—"}
                </p>
                <p>Status: {student.status || "unused"}</p>
                <p>Access Status: {student.access_status || "active"}</p>
                <p>Last Login: {student.last_login_at || "—"}</p>

                <div className="pt-2">
                  <Button variant="outline" onClick={() => editStudent(student)}>
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!isLoading && studentAccounts.length === 0 && (
            <Card>
              <CardContent className="py-8 text-[#2E5C6E]">
                No accounts yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}