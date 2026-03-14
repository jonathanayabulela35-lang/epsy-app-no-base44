import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, School, UserCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AccountAccess() {
  const { user } = useAuth();

  const userRole =
    user?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    'student';

  const userId = user?.id;

  useEffect(() => {
    document.title = 'EpsyApp | Account Access';
  }, []);

  const { data: account, isLoading, error } = useQuery({
    queryKey: ['student-account-access', userId],
    enabled: !!userId && userRole === 'student',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_accounts')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: school } = useQuery({
    queryKey: ['student-account-school', account?.school_id],
    enabled: !!account?.school_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', account.school_id)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
  });

  if (userRole !== 'student') {
    return (
      <div className="min-h-screen bg-[#F1F4F6] p-8 flex items-center justify-center">
        <p className="text-[#2E5C6E]">Access denied</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to={createPageUrl('Settings')}
          className="inline-flex items-center text-black hover:opacity-80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-black">Account Access</h1>
          <p className="text-[#2E5C6E] mt-2">
            View your school-linked account details and access information.
          </p>
        </div>

        <Card className="bg-white border-[#2E5C6E]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1E1E1E]">
              <UserCircle className="w-5 h-5 text-[#0CC0DF]" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-[#2E5C6E]/10 pb-3">
              <span className="text-[#2E5C6E]">Username</span>
              <span className="font-medium text-[#1E1E1E]">
                {account?.username || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2E5C6E]/10 pb-3">
              <span className="text-[#2E5C6E]">Role</span>
              <span className="font-medium text-[#1E1E1E]">
                {account?.role || 'student'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2E5C6E]/10 pb-3">
              <span className="text-[#2E5C6E]">Grade</span>
              <span className="font-medium text-[#1E1E1E]">
                {account?.grade || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2E5C6E]/10 pb-3">
              <span className="text-[#2E5C6E]">Account Status</span>
              <span className="font-medium text-[#1E1E1E]">
                {account?.status || 'unused'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#2E5C6E]">Access Status</span>
              <span className="font-medium text-[#1E1E1E]">
                {account?.access_status || 'active'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#2E5C6E]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1E1E1E]">
              <School className="w-5 h-5 text-[#0CC0DF]" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-[#2E5C6E]/10 pb-3">
              <span className="text-[#2E5C6E]">School Name</span>
              <span className="font-medium text-[#1E1E1E]">
                {school?.name || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#2E5C6E]">School Code</span>
              <span className="font-medium text-[#1E1E1E]">
                {school?.school_code || '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#2E5C6E]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1E1E1E]">
              <Shield className="w-5 h-5 text-[#0CC0DF]" />
              Access Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#2E5C6E] leading-relaxed">
              Your Epsy access is linked to your school-managed account. If your
              account or access status changes, this page will reflect it here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}