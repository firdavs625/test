// Utility functions for the test platform

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getTimeOptions(): { value: number; label: string }[] {
  return [
    { value: 10, label: '10 soniya' },
    { value: 30, label: '30 soniya' },
    { value: 60, label: '1 daqiqa' },
    { value: 120, label: '2 daqiqa' },
    { value: 180, label: '3 daqiqa' },
    { value: 300, label: '5 daqiqa' },
    { value: 600, label: '10 daqiqa' },
  ];
}

export function getRankSuffix(rank: number): string {
  if (rank === 1) return '-chi';
  if (rank === 2) return '-chi';
  if (rank === 3) return '-chi';
  return '-chi';
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  if (percentage >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBgColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-100';
  if (percentage >= 60) return 'bg-yellow-100';
  if (percentage >= 40) return 'bg-orange-100';
  return 'bg-red-100';
}
