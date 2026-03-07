import { supabase } from '@/lib/supabaseClient'

// Supabase table names
// These are the snake_case table names your app should use in Supabase.
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
  return singleOrNull(
    supabase
      .from(TABLE.Challenge)
      .select('*')
      .eq('id', id)
      .limit(1)
  )
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
  return singleOrNull(
    supabase
      .from(TABLE.StudentProgress)
      .select('*')
      .eq('linked_user_id', userId)
      .eq('challenge_id', challengeId)
      .limit(1)
  )
}

export async function upsertStudentProgress(progress) {
  const { data, error } = await supabase
    .from(TABLE.StudentProgress)
    .upsert(progress)
    .select('*')

  if (error) throw error
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
}

export async function listRecentProgress(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from(TABLE.StudentProgress)
    .select('*')
    .eq('linked_user_id', userId)
    .order('last_accessed', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) throw error
  return data ?? []
}