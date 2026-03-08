import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/utils";

const sections = [
  {
    title: "Manage Challenges",
    description: "Create, edit, and publish psychological challenge content.",
    page: "AdminChallenges",
  },
  {
    title: "Manage Decoder Content",
    description: "Create and update subject-based question decoder guides.",
    page: "AdminDecoder",
  },
  {
    title: "Manage Builder Templates",
    description: "Create and organise academic question-building templates.",
    page: "AdminBuilder",
  },
  {
    title: "Manage Schools",
    description: "View and manage school records, codes, and seat counts.",
    page: "AdminSchools",
  },
  {
    title: "Student Access",
    description: "View student accounts and manage credentials and grade records.",
    page: "AdminStudentAccess",
  },
  {
    title: "Student View",
    description: "Go to the student-facing side of the app.",
    page: "Home",
  },
];

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Epsy Admin Dashboard</h1>
          <p className="text-[#2E5C6E] mt-2">
            Manage content, schools, student access, and platform operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link key={section.page} to={createPageUrl(section.page)}>
              <Card className="h-full border-[#2E5C6E]/15 hover:border-[#0CC0DF] transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-[#1E1E1E]">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#2E5C6E]">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}