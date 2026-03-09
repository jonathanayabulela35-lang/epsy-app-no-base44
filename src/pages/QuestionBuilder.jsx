import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ensureStudentPreferences } from "@/api/db";

function ExpandableTemplateCard({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-white border-[#2E5C6E]/20">
      <CardHeader
        className="cursor-pointer hover:bg-[#FAFBF9] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-[#1E1E1E] text-base">
              {item.template_text}
            </CardTitle>
            {item.category && (
              <p className="text-sm text-[#2E5C6E] mt-2">{item.category}</p>
            )}
          </div>

          <ChevronDown
            className={`w-5 h-5 text-[#2E5C6E] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </CardHeader>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="pt-0 space-y-4">

              {item.guidance && (
                <div>
                  <h4 className="font-medium text-[#1E1E1E] mb-2">Guidance</h4>
                  <p className="text-[#2E5C6E] leading-relaxed">
                    {item.guidance}
                  </p>
                </div>
              )}

              {item.weak_example && (
                <div>
                  <h4 className="font-medium text-[#1E1E1E] mb-2">Weak Example</h4>
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-[#2E5C6E]">
                    {item.weak_example}
                  </div>
                </div>
              )}

              {item.strong_example && (
                <div>
                  <h4 className="font-medium text-[#1E1E1E] mb-2">Strong Example</h4>
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-[#2E5C6E]">
                    {item.strong_example}
                  </div>
                </div>
              )}

            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function QuestionBuilder() {

  useEffect(() => {
    document.title = "EpsyApp | Question Builder";
  }, []);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["published-question-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_templates")
        .select("*")
        .eq("published", true)
        .order("subject", { ascending: true })
        .order("order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ["student-preferences-builder", userId],
    enabled: !!userId,
    queryFn: async () => {
      await ensureStudentPreferences(userId);

      const { data, error } = await supabase
        .from("student_preferences")
        .select("*")
        .eq("student_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
  });

  const subjects = useMemo(() => {
    const allSubjects = [
      ...new Set(templates.map((item) => item.subject).filter(Boolean)),
    ];

    const preferredSubjects = Array.isArray(preferences?.subjects)
      ? preferences.subjects
      : [];

    if (preferredSubjects.length === 0) {
      return allSubjects;
    }

    const normalizedPreferred = preferredSubjects.map((subject) =>
      subject.toLowerCase()
    );

    const preferred = allSubjects.filter((subject) =>
      normalizedPreferred.includes(subject.toLowerCase())
    );

    const others = allSubjects.filter(
      (subject) => !normalizedPreferred.includes(subject.toLowerCase())
    );

    return [...preferred, ...others];
  }, [templates, preferences]);

  const currentTemplates = useMemo(() => {
    return templates.filter((item) => item.subject === selectedSubject);
  }, [templates, selectedSubject]);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Question Builder</h1>
          <p className="text-[#2E5C6E] mt-2">
            Learn how to ask stronger academic questions by subject.
          </p>
        </div>

        {!selectedSubject ? (
          <div className="grid md:grid-cols-2 gap-4">

            {subjects.map((subject) => {

              const isPreferred =
                Array.isArray(preferences?.subjects) &&
                preferences.subjects.some(
                  (item) => item.toLowerCase() === subject.toLowerCase()
                );

              return (
                <Card
                  key={subject}
                  className="bg-white border-[#2E5C6E]/20 cursor-pointer hover:border-[#0CC0DF] transition-colors"
                  onClick={() => setSelectedSubject(subject)}
                >
                  <CardContent className="py-6">

                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-[#1E1E1E]">
                        {subject}
                      </h3>

                      {isPreferred && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#0CC0DF]/10 text-[#0CC0DF]">
                          Preferred
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#2E5C6E] mt-2">
                      Open templates
                    </p>

                  </CardContent>
                </Card>
              );
            })}

            {subjects.length === 0 && (
              <Card>
                <CardContent className="py-8 text-[#2E5C6E]">
                  No published question builder templates yet.
                </CardContent>
              </Card>
            )}

          </div>
        ) : (
          <div className="space-y-4">

            <button
              onClick={() => setSelectedSubject(null)}
              className="text-sm text-[#2E5C6E] hover:text-black"
            >
              ← Back to subjects
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">
                {selectedSubject}
              </h2>
            </div>

            <div className="space-y-4">

              {currentTemplates.map((item) => (
                <ExpandableTemplateCard key={item.id} item={item} />
              ))}

              {currentTemplates.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-[#2E5C6E]">
                    No templates available for this subject yet.
                  </CardContent>
                </Card>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}