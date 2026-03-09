import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ensureStudentPreferences } from "@/api/db";

function Section({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-white border-[#2E5C6E]/20">
      <CardHeader
        className="cursor-pointer hover:bg-[#FAFBF9] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1E1E1E] text-base">{title}</CardTitle>
          <ChevronDown
            className={`w-5 h-5 text-[#2E5C6E] transition-transform ${open ? "rotate-180" : ""}`}
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
            <CardContent className="pt-0">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function QuestionDecoder() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: decoderSubjects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["published-decoder-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decoder_contents")
        .select("*")
        .eq("published", true)
        .order("subject", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ["student-preferences-decoder", userId],
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

  const prioritizedSubjects = useMemo(() => {
    const preferredSubjects = Array.isArray(preferences?.subjects)
      ? preferences.subjects
      : [];

    if (preferredSubjects.length === 0) {
      return decoderSubjects;
    }

    const normalizedPreferred = preferredSubjects.map((s) => s.toLowerCase());

    const preferred = decoderSubjects.filter((item) =>
      normalizedPreferred.includes((item.subject || "").toLowerCase())
    );

    const others = decoderSubjects.filter(
      (item) =>
        !normalizedPreferred.includes((item.subject || "").toLowerCase())
    );

    return [...preferred, ...others];
  }, [decoderSubjects, preferences]);

  const current = prioritizedSubjects.find((item) => item.id === selectedSubject);

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
          <h1 className="text-3xl font-bold text-black">Question Decoder</h1>
          <p className="text-[#2E5C6E] mt-2">
            Learn how to interpret academic question language by subject.
          </p>
        </div>

        {!selectedSubject ? (
          <div className="grid md:grid-cols-2 gap-4">
            {prioritizedSubjects.map((item) => {
              const isPreferred =
                Array.isArray(preferences?.subjects) &&
                preferences.subjects.some(
                  (subject) =>
                    subject.toLowerCase() === (item.subject || "").toLowerCase()
                );

              return (
                <Card
                  key={item.id}
                  className="bg-white border-[#2E5C6E]/20 cursor-pointer hover:border-[#0CC0DF] transition-colors"
                  onClick={() => setSelectedSubject(item.id)}
                >
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-[#1E1E1E]">
                        {item.subject}
                      </h3>
                      {isPreferred && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#0CC0DF]/10 text-[#0CC0DF]">
                          Preferred
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#2E5C6E] mt-2">
                      Open subject decoder
                    </p>
                  </CardContent>
                </Card>
              );
            })}

            {prioritizedSubjects.length === 0 && (
              <Card>
                <CardContent className="py-8 text-[#2E5C6E]">
                  No published decoder subjects yet.
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
              <h2 className="text-2xl font-bold text-black">{current?.subject}</h2>
            </div>

            <Section title="Instruction Words">
              <div className="space-y-4">
                {Array.isArray(current?.instruction_words) && current.instruction_words.length > 0 ? (
                  current.instruction_words.map((word, index) => (
                    <div key={index} className="border border-[#2E5C6E]/10 rounded-lg p-4">
                      <p className="font-semibold text-[#1E1E1E]">{word.word || "Instruction word"}</p>
                      <p className="text-[#2E5C6E] mt-1">{word.meaning || ""}</p>
                      {word.required && (
                        <p className="text-sm mt-2">
                          <span className="font-medium text-[#1E1E1E]">What is required:</span>{" "}
                          <span className="text-[#2E5C6E]">{word.required}</span>
                        </p>
                      )}
                      {word.example && (
                        <p className="text-sm mt-2 italic text-[#2E5C6E]">
                          Example: {word.example}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[#2E5C6E]">No instruction words added.</p>
                )}
              </div>
            </Section>

            <Section title="Question Structure">
              {Array.isArray(current?.question_structure) && current.question_structure.length > 0 ? (
                <ul className="list-disc pl-5 text-[#2E5C6E] space-y-2">
                  {current.question_structure.map((item, index) => (
                    <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#2E5C6E]">No question structure added.</p>
              )}
            </Section>

            <Section title="How to Respond">
              {Array.isArray(current?.how_to_respond) && current.how_to_respond.length > 0 ? (
                <ul className="list-disc pl-5 text-[#2E5C6E] space-y-2">
                  {current.how_to_respond.map((item, index) => (
                    <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#2E5C6E]">No response guidance added.</p>
              )}
            </Section>

            <Section title="How to Remember">
              {Array.isArray(current?.how_to_remember) && current.how_to_remember.length > 0 ? (
                <ul className="list-disc pl-5 text-[#2E5C6E] space-y-2">
                  {current.how_to_remember.map((item, index) => (
                    <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#2E5C6E]">No memory guidance added.</p>
              )}
            </Section>

            <Section title="Common Traps">
              {Array.isArray(current?.common_traps) && current.common_traps.length > 0 ? (
                <ul className="list-disc pl-5 text-[#2E5C6E] space-y-2">
                  {current.common_traps.map((item, index) => (
                    <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#2E5C6E]">No common traps added.</p>
              )}
            </Section>

            <Section title="Watch For">
              {Array.isArray(current?.watch_for) && current.watch_for.length > 0 ? (
                <ul className="list-disc pl-5 text-[#2E5C6E] space-y-2">
                  {current.watch_for.map((item, index) => (
                    <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#2E5C6E]">No watch-for notes added.</p>
              )}
            </Section>

            <Section title="Past Paper Examples">
              <div className="space-y-4">
                {Array.isArray(current?.past_paper_examples) && current.past_paper_examples.length > 0 ? (
                  current.past_paper_examples.map((item, index) => (
                    <div key={index} className="border border-[#2E5C6E]/10 rounded-lg p-4">
                      <p className="font-medium text-[#1E1E1E]">
                        {item.question || `Example ${index + 1}`}
                      </p>
                      <p className="text-[#2E5C6E] mt-2">
                        {item.breakdown || ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[#2E5C6E]">No past paper examples added.</p>
                )}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}