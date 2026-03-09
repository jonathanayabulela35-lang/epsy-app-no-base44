import React, { useEffect, useMemo, useState } from "react";
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
  grade: "",
  school_id: "",
  access_status: "active",
  status: "unused",
};

function generateRandomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function extractUsernameNumber(username, schoolCode) {
  if (!username || !schoolCode) return null;

  const normalizedUsername = username.toLowerCase();
  const normalizedSchoolCode = schoolCode.toLowerCase();

  if (!normalizedUsername.startsWith(normalizedSchoolCode)) return null;

  const suffix = normalizedUsername.slice(normalizedSchoolCode.length);
  if (!/^\d+$/.test(suffix)) return null;

  return Number(suffix);
}

function buildUsername(schoolCode, number) {
  return `${schoolCode.toLowerCase()}${String(number).padStart(3, "0")}`;
}

export default function AdminStudentAccess() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");

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
        .order("username", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["admin-schools-for-student-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, school_code, seat_limit, seats_generated")
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const schoolMap = useMemo(() => {
    const map = {};
    for (const school of schools) {
      map[school.id] = school;
    }
    return map;
  }, [schools]);

  const selectedSchool = form.school_id ? schoolMap[form.school_id] : null;

  const getNextUsernameForSchool = (schoolId) => {
    const school = schoolMap[schoolId];
    if (!school?.school_code) return "";

    const usedNumbers = studentAccounts
      .filter((account) => account.school_id === schoolId)
      .map((account) => extractUsernameNumber(account.username, school.school_code))
      .filter((num) => Number.isInteger(num));

    let nextNumber = 1;
    while (usedNumbers.includes(nextNumber)) {
      nextNumber += 1;
    }

    return buildUsername(school.school_code, nextNumber);
  };

  useEffect(() => {
    if (!form.school_id) {
      return;
    }

    if (form.id) {
      return;
    }

    const nextUsername = getNextUsernameForSchool(form.school_id);

    setForm((prev) => {
      if (prev.school_id !== form.school_id) return prev;

      return {
        ...prev,
        username: nextUsername,
        pin: generateRandomPin(),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.school_id, form.id, studentAccounts, schools]);

  const saveMutation = useMutation({
    mutationFn: async (currentForm) => {
      const payload = {
        username: currentForm.username.trim().toLowerCase(),
        pin: currentForm.pin.trim(),
        role: currentForm.role,
        grade: currentForm.grade.trim(),
        school_id: currentForm.school_id || null,
        access_status: currentForm.access_status,
        status: currentForm.status,
      };

      let savedAccount;

      if (currentForm.id) {
        const { data, error } = await supabase
          .from("student_accounts")
          .update(payload)
          .eq("id", currentForm.id)
          .select()
          .single();

        if (error) throw error;
        savedAccount = data;
      } else {
        const { data, error } = await supabase
          .from("student_accounts")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        savedAccount = data;

        if (currentForm.school_id) {
          const school = schoolMap[currentForm.school_id];
          const nextSeatsGenerated = Number(school?.seats_generated || 0) + 1;

          const { error: schoolUpdateError } = await supabase
            .from("schools")
            .update({ seats_generated: nextSeatsGenerated })
            .eq("id", currentForm.school_id);

          if (schoolUpdateError) throw schoolUpdateError;
        }
      }

      return savedAccount;
    },
    onSuccess: (_, variables) => {
      setUiError("");
      setUiSuccess("Account saved successfully.");

      queryClient.invalidateQueries({ queryKey: ["admin-student-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-schools-for-student-access"] });
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });

      if (variables.id) {
        setForm(emptyForm);
        return;
      }

      const preservedSchoolId = variables.school_id;
      const preservedRole = variables.role;
      const preservedGrade = variables.grade;
      const preservedAccessStatus = variables.access_status;
      const preservedStatus = variables.status;

      if (!preservedSchoolId) {
        setForm(emptyForm);
        return;
      }

      const nextUsername = getNextUsernameForSchool(preservedSchoolId);

      setForm({
        id: null,
        username: nextUsername,
        pin: generateRandomPin(),
        role: preservedRole,
        grade: preservedGrade,
        school_id: preservedSchoolId,
        access_status: preservedAccessStatus,
        status: preservedStatus,
      });
    },
    onError: (error) => {
      setUiSuccess("");
      setUiError(error?.message || "Failed to save account.");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiError("");
    setUiSuccess("");
    await saveMutation.mutateAsync(form);
  };

  const editStudent = (student) => {
    setUiError("");
    setUiSuccess("");
    setForm({
      id: student.id,
      username: student.username ?? "",
      pin: student.pin ?? "",
      role: student.role ?? "student",
      grade: student.grade ?? "",
      school_id: student.school_id ?? "",
      access_status: student.access_status ?? "active",
      status: student.status ?? "unused",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const regenerateCredentials = () => {
    if (!form.school_id) {
      setUiError("Please select a school first.");
      return;
    }

    setUiError("");
    setUiSuccess("");

    setForm((prev) => ({
      ...prev,
      username: getNextUsernameForSchool(prev.school_id),
      pin: generateRandomPin(),
    }));
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
            <CardTitle>{form.id ? "Edit Account" : "Create Account"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>School</Label>
                <select
                  value={form.school_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      school_id: e.target.value,
                      id: null,
                    }))
                  }
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">No school selected</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                {selectedSchool && (
                  <p className="text-xs text-[#2E5C6E] mt-2">
                    School code: {selectedSchool.school_code || "—"} • Seats used:{" "}
                    {selectedSchool.seats_generated ?? 0}/{selectedSchool.seat_limit ?? 0}
                  </p>
                )}
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
                <Label>Grade</Label>
                <Input
                  value={form.grade}
                  onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
                  placeholder="e.g. Grade 10"
                />
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

              <div></div>

              <div>
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Auto-generated from school"
                  required
                />
              </div>

              <div>
                <Label>PIN</Label>
                <Input
                  type="password"
                  value={form.pin}
                  onChange={(e) => setForm((prev) => ({ ...prev, pin: e.target.value }))}
                  placeholder="Auto-generated 6-digit PIN"
                  required
                />
              </div>

              <div className="md:col-span-2 flex gap-3 flex-wrap">
                {!form.id && (
                  <Button type="button" variant="outline" onClick={regenerateCredentials}>
                    Regenerate Username and PIN
                  </Button>
                )}

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

        {isLoading && <p className="text-[#2E5C6E]">Loading student accounts...</p>}
        {error && <p className="text-red-600">{error.message}</p>}

        <div className="grid gap-4">
          {studentAccounts.map((student) => (
            <Card key={student.id} className="border-[#2E5C6E]/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#1E1E1E]">
                  {student.username}
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
                <p>PIN: {student.pin || "—"}</p>

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