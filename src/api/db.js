import { supabase } from '@/lib/supabaseClient'

// Supabase table names
const TABLE = {
  Challenge: 'challenges',
  ChallengeDay: 'challenge_days',
  StudentProgress: 'student_progress',
  School: 'schools',
  SchoolPlan: 'school_plans',
  StudentCredential: 'student_accounts',
  QuestionTemplate: 'question_templates',
  DecoderContent: 'decoder_contents',
  WordBook: 'word_bookmarks',
}

async function singleOrNull(q) {
  const { data, error } = await q
  if (error) throw error
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
}

export async function listPublishedChallenges() {
  const { data, error } = await supabase
    .from(TABLE.Challenge)
    .select('*')
    .eq('published', true)
    .order('order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getChallengeById(id) {
  if (!id) return null

  const { data, error } = await supabase
    .from(TABLE.Challenge)
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data ?? null
}

export async function listChallengeDays(challengeId) {
  if (!challengeId) return []

  const { data, error } = await supabase
    .from(TABLE.ChallengeDay)
    .select('*')
    .eq('challenge_id', challengeId)
    .order('day_number', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getStudentProgress({ userId, challengeId }) {
  if (!userId || !challengeId) return null

  const { data, error } = await supabase
    .from(TABLE.StudentProgress)
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function upsertStudentProgress(progress) {
  if (!progress?.user_id || !progress?.challenge_id) {
    throw new Error('Missing user_id or challenge_id for student progress.')
  }

  const payload = {
    user_id: progress.user_id,
    challenge_id: progress.challenge_id,
    code_name: progress.code_name ?? null,
    current_day: progress.current_day ?? 1,
    completed_days: Array.isArray(progress.completed_days) ? progress.completed_days : [],
    started_date: progress.started_date ?? new Date().toISOString(),
    last_accessed: progress.last_accessed ?? new Date().toISOString(),
    personal_notes: progress.personal_notes ?? null,
  }

  const { data, error } = await supabase
    .from(TABLE.StudentProgress)
    .upsert(payload, {
      onConflict: 'user_id,challenge_id',
    })
    .select('*')
    .single()

  if (error) {
    console.error('upsertStudentProgress error:', error)
    throw error
  }

  return data ?? null
}

export async function listRecentProgress(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from(TABLE.StudentProgress)
    .select('*')
    .eq('user_id', userId)
    .order('last_accessed', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) throw error
  return data ?? []
}