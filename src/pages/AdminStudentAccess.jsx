import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminStudentAccess() {
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

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Student Access</h1>
          <p className="text-[#2E5C6E] mt-2">
            View student accounts, credentials, grades, and access status.
          </p>
        </div>

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
                <p>Status: {student.status || "unused"}</p>
                <p>Access Status: {student.access_status || "active"}</p>
                <p>Last Login: {student.last_login_at || "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}