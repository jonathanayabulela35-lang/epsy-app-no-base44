import { supabase } from '@/lib/supabaseClient'

// NOTE:
// These helpers assume your Supabase tables are named exactly like your entity schemas:
// Challenge, ChallengeDay, StudentProgress, School, SchoolPlan, StudentCredential, etc.
// If your table names are snake_case (e.g. challenges), update the TABLE constants below.

const TABLE = {
  Challenge: 'Challenge',
  ChallengeDay: 'ChallengeDay',
  StudentProgress: 'StudentProgress',
  School: 'School',
  SchoolPlan: 'SchoolPlan',
  StudentCredential: 'StudentCredential',
  QuestionTemplate: 'QuestionTemplate',
  DecoderContent: 'DecoderContent',
  WordBook: 'WordBook',
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
  // Expect progress to include: linked_user_id, challenge_id, ...
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
