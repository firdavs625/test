import { Question, Variant } from '@/types';
import questionsData from './test.json';

// Load questions from JSON
const allQuestions: Question[] = questionsData.questions.map((q: any) => ({
  id: q.id,
  text: q.question,
  options: q.options,
  correctIndex: q.correctAnswer,
}));

// Questions per variant
const QUESTIONS_PER_VARIANT = 10;

// Calculate total variants based on questions count
const totalVariants = Math.ceil(allQuestions.length / QUESTIONS_PER_VARIANT);

// Generate variants automatically
export function generateVariants(): Variant[] {
  const variants: Variant[] = [];
  
  for (let i = 0; i < totalVariants; i++) {
    const startIndex = i * QUESTIONS_PER_VARIANT;
    const endIndex = Math.min(startIndex + QUESTIONS_PER_VARIANT, allQuestions.length);
    const variantQuestions = allQuestions.slice(startIndex, endIndex);
    
    // If last variant has less than 10 questions, pad with questions from beginning
    if (variantQuestions.length < QUESTIONS_PER_VARIANT) {
      const needed = QUESTIONS_PER_VARIANT - variantQuestions.length;
      for (let j = 0; j < needed; j++) {
        variantQuestions.push(allQuestions[j]);
      }
    }
    
    variants.push({
      id: i + 1,
      name: `Variant ${i + 1}`,
      questions: variantQuestions,
    });
  }
  
  return variants;
}

// Get all variants
export const variants = generateVariants();

// Get variant by ID
export function getVariantById(id: number): Variant | null {
  return variants.find((v) => v.id === id) || null;
}

// Get total questions count
export function getTotalQuestionsCount(): number {
  return allQuestions.length;
}

// Get total variants count
export function getTotalVariantsCount(): number {
  return variants.length;
}

// Get random questions for random test mode
export function getRandomQuestions(count: number): Question[] {
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, allQuestions.length));
}

// Get all questions
export function getAllQuestions(): Question[] {
  return allQuestions;
}
