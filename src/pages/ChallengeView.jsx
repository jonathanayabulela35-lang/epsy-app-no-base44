import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronDown, ChevronRight, Check, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/lib/AuthContext';
import {
  getChallengeById,
  listChallengeDays,
  getStudentProgress,
  upsertStudentProgress,
} from '@/api/db';

function normalizeExecutionOverview(executionOverview = []) {
  return executionOverview.map((step, index) => {
    if (typeof step === "string") {
      const match = step.match(/^day\s*(\d+)\s*[-:]\s*(.*)$/i);
      if (match) {
        return {
          day: Number(match[1]),
          label: match[2]?.trim() || `Day ${match[1]}`,
        };
      }

      return {
        day: index + 1,
        label: step,
      };
    }

    if (step && typeof step === "object") {
      return {
        day: Number(step.day) || index + 1,
        label: step.label || `Day ${Number(step.day) || index + 1}`,
      };
    }

    return {
      day: index + 1,
      label: `Day ${index + 1}`,
    };
  });
}

export default function ChallengeView() {
  const urlParams = new URLSearchParams(window.location.search);
  const challengeId = urlParams.get('id');

  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showCodeNameDialog, setShowCodeNameDialog] = useState(false);
  const [showEditCodeNameDialog, setShowEditCodeNameDialog] = useState(false);
  const [codeName, setCodeName] = useState('');
  const [editCodeName, setEditCodeName] = useState('');
  const [uiError, setUiError] = useState('');

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const userRole =
    user?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role;

  const userId = user?.id;

  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: () => getChallengeById(challengeId),
    enabled: !!challengeId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: days = [] } = useQuery({
    queryKey: ['challenge-days', challengeId],
    queryFn: () => listChallengeDays(challengeId),
    enabled: !!challengeId,
  });

  const { data: progress } = useQuery({
    queryKey: ['progress', challengeId, userId],
    queryFn: () => getStudentProgress({ userId, challengeId }),
    enabled: !!challengeId && !!userId,
  });

  const startMutation = useMutation({
    mutationFn: (data) => upsertStudentProgress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', challengeId, userId] });
      setShowCodeNameDialog(false);
      setCodeName('');
      setUiError('');
    },
    onError: (error) => {
      setUiError(error?.message || 'Failed to start journey.');
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: (data) => upsertStudentProgress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', challengeId, userId] });
      setUiError('');
    },
    onError: (error) => {
      setUiError(error?.message || 'Failed to update progress.');
    },
  });

  const executionSteps = useMemo(
    () => normalizeExecutionOverview(challenge?.execution_overview || []),
    [challenge?.execution_overview]
  );

  if (userRole === 'school_admin') {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

  const handleStart = () => {
    setUiError('');
    setShowCodeNameDialog(true);
  };

  const confirmStart = () => {
    if (!codeName.trim() || !userId || !challengeId) {
      setUiError('Missing code name, student id, or challenge id.');
      return;
    }

    startMutation.mutate({
      user_id: userId,
      challenge_id: challengeId,
      code_name: codeName.trim(),
      current_day: 1,
      completed_days: [],
      started_date: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
    });
  };

  const handleDayComplete = (dayNumber) => {
    if (!progress) return;

    const existingCompleted = Array.isArray(progress.completed_days)
      ? progress.completed_days
      : [];

    const completedDays = existingCompleted.includes(dayNumber)
      ? existingCompleted
      : [...existingCompleted, dayNumber];

    updateProgressMutation.mutate({
      ...progress,
      completed_days: completedDays,
      current_day: dayNumber + 1,
      last_accessed: new Date().toISOString(),
    });
  };

  const handleEditCodeName = () => {
    setUiError('');
    setEditCodeName(progress?.code_name || '');
    setShowEditCodeNameDialog(true);
  };

  const handleSaveCodeName = () => {
    if (!progress || !editCodeName.trim()) return;

    updateProgressMutation.mutate({
      ...progress,
      code_name: editCodeName.trim(),
      last_accessed: new Date().toISOString(),
    });

    setShowEditCodeNameDialog(false);
  };

  const sections = [
    { key: 'why', label: 'Why This Happens', content: challenge?.why_this_happens },
    { key: 'reframe', label: 'How to Reframe It', content: challenge?.how_to_reframe },
    { key: 'ignore', label: 'If You Ignore It', content: challenge?.if_you_ignore },
    { key: 'act', label: 'If You Act On It', content: challenge?.if_you_act },
    { key: 'full', label: 'Full Breakdown', content: challenge?.full_breakdown },
  ];

  if (challengeLoading || !challenge) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-6">
          <Link to={createPageUrl('InsightLibrary')} className="inline-flex items-center text-black hover:opacity-80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Link>
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-black hover:opacity-80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl">{challenge.icon}</span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-black">{challenge.title}</h1>
            {progress && (
              <p className="text-[#2E5C6E] mt-1">Your code name: {progress.code_name}</p>
            )}
          </div>
          {progress && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditCodeName}>
                  Set Code Name
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {uiError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {uiError}
          </div>
        )}

        <div className="space-y-3 mb-8">
          {sections.map((section) => section.content && (
            <Card key={section.key} className="bg-white border-[#2E5C6E]/20">
              <CardHeader
                className="cursor-pointer hover:bg-[#FAFBF9] transition-colors"
                onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E1E1E] text-base">{section.label}</CardTitle>
                  <ChevronDown
                    className={`w-5 h-5 text-[#2E5C6E] transition-transform ${
                      expandedSection === section.key ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>

              <AnimatePresence>
                {expandedSection === section.key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="pt-0">
                      <p className="text-[#1E1E1E] leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        <Card className="bg-white border-[#2E5C6E]/20 mb-6">
          <CardHeader>
            <CardTitle className="text-[#1E1E1E]">Daily Execution</CardTitle>
          </CardHeader>
          <CardContent>
            {!progress ? (
              <div className="text-center py-8">
                <p className="text-[#2E5C6E] mb-4">Ready to start this journey?</p>
                <Button
                  onClick={handleStart}
                  className="bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  Start Challenge
                </Button>
              </div>
            ) : executionSteps.length === 0 ? (
              <div className="text-center py-6 text-[#2E5C6E]">
                No execution steps have been added for this challenge yet.
              </div>
            ) : (
              <div className="space-y-3">
                {executionSteps.map((step) => (
                  <div
                    key={step.day}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      progress.completed_days?.includes(step.day)
                        ? 'border-[#0CC0DF] bg-[#0CC0DF]/5'
                        : progress.current_day === step.day
                        ? 'border-[#C6A85E] bg-[#C6A85E]/5'
                        : 'border-[#2E5C6E]/20'
                    }`}
                    onClick={() => setSelectedDay(step.day)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {progress.completed_days?.includes(step.day) && (
                          <Check className="w-5 h-5 text-[#0CC0DF]" />
                        )}
                        <span className="font-medium text-[#1E1E1E]">Day {step.day}</span>
                        <span className="text-[#2E5C6E]">{step.label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#2E5C6E]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {challenge.thought_offering && (
          <Card className="bg-[#FAFBF9] border-[#C6A85E]/30">
            <CardContent className="p-6">
              <p className="text-[#1E1E1E] italic leading-relaxed">
                {challenge.thought_offering}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={showCodeNameDialog} onOpenChange={setShowCodeNameDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">Create Your Code Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-[#2E5C6E]">
                For your privacy, create a code name for this challenge. This is what you'll see in notifications.
              </p>
              <Input
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="e.g., Project Shield, Level Up"
              />
              <Button
                onClick={confirmStart}
                disabled={startMutation.isPending}
                className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                {startMutation.isPending ? "Starting..." : "Start Journey"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditCodeNameDialog} onOpenChange={setShowEditCodeNameDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">Edit Code Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-[#2E5C6E]">
                Update the private code name for this challenge.
              </p>
              <Input
                value={editCodeName}
                onChange={(e) => setEditCodeName(e.target.value)}
                placeholder="e.g., Project Shield, Level Up"
              />
              <Button
                onClick={handleSaveCodeName}
                disabled={updateProgressMutation.isPending}
                className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                Save Code Name
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
          <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedDay && days.find((d) => d.day_number === selectedDay) && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-black">Day {selectedDay}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {(() => {
                    const day = days.find((d) => d.day_number === selectedDay);
                    return (
                      <>
                        <div>
                          <h4 className="font-medium text-[#1E1E1E] mb-2">Goal</h4>
                          <p className="text-[#2E5C6E] leading-relaxed">{day.goal}</p>
                        </div>

                        <div>
                          <h4 className="font-medium text-[#1E1E1E] mb-2">Today's Task</h4>
                          <p className="text-[#1E1E1E] leading-relaxed">{day.daily_task}</p>
                        </div>

                        {day.example && (
                          <div>
                            <h4 className="font-medium text-[#1E1E1E] mb-2">Example</h4>
                            <p className="text-[#2E5C6E] leading-relaxed">{day.example}</p>
                          </div>
                        )}

                        {day.deeper_explanation && (
                          <details className="border border-[#2E5C6E]/20 rounded-lg p-4">
                            <summary className="font-medium text-[#1E1E1E] cursor-pointer">
                              Deeper Explanation
                            </summary>
                            <p className="text-[#2E5C6E] mt-3 leading-relaxed">
                              {day.deeper_explanation}
                            </p>
                          </details>
                        )}

                        {day.thought_offering && (
                          <div className="bg-[#FAFBF9] p-4 rounded-lg border border-[#C6A85E]/30">
                            <p className="text-[#1E1E1E] italic">{day.thought_offering}</p>
                          </div>
                        )}

                        {progress && !progress.completed_days?.includes(selectedDay) && (
                          <Button
                            onClick={() => {
                              handleDayComplete(selectedDay);
                              setSelectedDay(null);
                            }}
                            disabled={updateProgressMutation.isPending}
                            className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                          >
                            Mark Complete
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}