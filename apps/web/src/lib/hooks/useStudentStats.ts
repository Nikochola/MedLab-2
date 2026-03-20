import useSWR from "swr"

export interface StudentStats {
  totalXP: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
  ecgMastery: number
  casesCompleted: number
  simulationsCompleted: number
  lastActivityDate: string | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to fetch stats")
  }
  return res.json()
}

export function useStudentStats(studentId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<StudentStats>(studentId ? "/api/student/stats" : null, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 30000
  })

  return {
    stats: data,
    isLoading,
    isError: error,
    mutate
  }
}
