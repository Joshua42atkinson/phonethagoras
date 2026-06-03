import { useState, useCallback } from 'react';

// ════════════════════════════════════════════════════════════
// useCodexProgress — Academy Lesson Tracking
// ════════════════════════════════════════════════════════════
// Persists lesson completion in localStorage.
// Each lesson = XP. Each Tome = unlocked by completing previous.
// Existential mode: the Codex IS your character's training.

const STORAGE_KEY = 'daydream_academy_progress';
const XP_PER_LESSON = 100;
const LESSONS_TO_UNLOCK = 2; // Complete this many lessons in a tome to unlock next

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: [], xp: 0, enrolled: false, startedAt: null };
  } catch {
    return { completed: [], xp: 0, enrolled: false, startedAt: null };
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function useCodexProgress(tomes) {
  const [progress, setProgress] = useState(() => loadProgress());

  const totalLessons = tomes.reduce((sum, t) => sum + t.sections.length, 0);
  const completedCount = progress.completed.length;
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const isTomeUnlocked = useCallback(
    (tomeIndex) => {
      if (tomeIndex === 0) return true;
      const prevTome = tomes[tomeIndex - 1];
      const prevLessonIds = prevTome.sections.map((_, i) => `${tomes[tomeIndex - 1].id}_lesson_${i}`);
      const prevCompleted = prevLessonIds.filter((id) => progress.completed.includes(id)).length;
      return prevCompleted >= Math.min(LESSONS_TO_UNLOCK, prevLessonIds.length);
    },
    [progress.completed, tomes]
  );

  const isLessonCompleted = useCallback(
    (tomeId, lessonIndex) => progress.completed.includes(`${tomeId}_lesson_${lessonIndex}`),
    [progress.completed]
  );

  const completeLesson = useCallback(
    (tomeId, lessonIndex) => {
      const lessonId = `${tomeId}_lesson_${lessonIndex}`;
      if (progress.completed.includes(lessonId)) return;

      const next = {
        ...progress,
        completed: [...progress.completed, lessonId],
        xp: progress.xp + XP_PER_LESSON,
      };
      setProgress(next);
      saveProgress(next);
    },
    [progress]
  );

  const enroll = useCallback(() => {
    const next = { ...progress, enrolled: true, startedAt: new Date().toISOString() };
    setProgress(next);
    saveProgress(next);
  }, [progress]);

  const resetProgress = useCallback(() => {
    const fresh = { completed: [], xp: 0, enrolled: false, startedAt: null };
    setProgress(fresh);
    saveProgress(fresh);
  }, []);

  return {
    progress,
    enrolled: progress.enrolled,
    xp: progress.xp,
    overallPct,
    totalLessons,
    completedCount,
    isTomeUnlocked,
    isLessonCompleted,
    completeLesson,
    enroll,
    resetProgress,
  };
}
