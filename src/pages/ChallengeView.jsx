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

  if (userRole === 'school_admin') {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

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
        <Link
          to={createPageUrl('InsightLibrary')}
          className="inline-flex items-center text-black mb-6 hover:opacity-80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Link>

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

        {progress?.personal_notes && (
          <Card className="bg-white border-[#2E5C6E]/20 mb-6">
            <CardHeader>
              <CardTitle className="text-[#1E1E1E]">Your Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#1E1E1E] whitespace-pre-wrap">{progress.personal_notes}</p>
            </CardContent>
          </Card>
        )}

        {progress && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setNotes(progress?.personal_notes || '');
                setShowNotesDialog(true);
              }}
            >
              Add / Edit Notes
            </Button>
          </div>
        )}

        <Dialog open={showCodeNameDialog} onOpenChange={setShowCodeNameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set your code name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="Enter code name"
              />
              <Button
                onClick={confirmStart}
                disabled={!codeName.trim() || startMutation.isPending}
                className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                {startMutation.isPending ? 'Starting...' : 'Start'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditCodeNameDialog} onOpenChange={setShowEditCodeNameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit code name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editCodeName}
                onChange={(e) => setEditCodeName(e.target.value)}
                placeholder="Enter code name"
              />
              <Button
                onClick={handleSaveCodeName}
                disabled={!editCodeName.trim() || updateProgressMutation.isPending}
                className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                {updateProgressMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your thoughts here..."
                rows={6}
              />
              <Button
                onClick={handleSaveNotes}
                disabled={updateProgressMutation.isPending}
                className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
              >
                {updateProgressMutation.isPending ? 'Saving...' : 'Save notes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Day {selectedDay}: {days.find(d => d.day_number === selectedDay)?.title || 'Execution'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-[#1E1E1E] whitespace-pre-wrap">
                {days.find(d => d.day_number === selectedDay)?.content || 'No content yet.'}
              </p>

              {progress && !progress.completed_days?.includes(selectedDay) && progress.current_day === selectedDay && (
                <Button
                  onClick={() => {
                    handleDayComplete(selectedDay);
                    setSelectedDay(null);
                  }}
                  className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
                >
                  Mark Day as Complete
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
