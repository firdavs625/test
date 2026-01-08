// Type definitions for the test platform

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  isAdmin?: boolean;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Variant {
  id: number;
  name: string;
  questions: Question[];
}

export interface TestSession {
  id: string;
  variantId: number;
  variantName: string;
  isRandom: boolean;
  questionCount: number;
  questionTimeLimit: number; // seconds per question
  startTime: number | null;
  endTime: number | null;
  waitingTime: number; // in seconds
  status: 'waiting' | 'active' | 'finished';
  participants: SessionParticipant[];
  createdBy: number;
  createdByName: string;
  createdAt: number;
  currentQuestionIndex: number;
  questionStartTime: number | null;
}

export interface SessionParticipant {
  userId: number;
  username: string;
  name: string;
  currentQuestion: number;
  answers: number[];
  score: number;
  finishedAt: number | null;
  leftEarly: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface TestResult {
  odimId: number;
  username: string;
  name: string;
  score: number;
  total: number;
  answers: {
    questionIndex: number;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
  }[];
  finishedAt: number;
}

export interface LeaderboardEntry {
  odimId: number;
  odimname: string;
  name: string;
  odire: number;
  total: number;
  percentage: number;
  finishedAt: number;
  rank: number;
}

export interface GlobalLeaderboardEntry {
  userId: number;
  username: string;
  name: string;
  totalTests: number;
  totalScore: number;
  totalQuestions: number;
  averagePercentage: number;
  bestScore: number;
  lastTestDate: number;
}
