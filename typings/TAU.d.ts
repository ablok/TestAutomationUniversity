export type Question = {
    questionId: string;
    correctAnswerIndex: number;
};

export type Course = {
    [x: string]: { chapterId: string }[];
    courseId: string;
    chaptersCount: number;
    chapters?: {
        chapterId: string;
        questions?: Question[];
    }[];
};

export type ValidateQuizzesResult = {
    failed: string[];
    passed: string[];
    result: boolean;
};

export type FullQuizResultsForUser = {
    completedChapters?: string[];
    courseCertificates?: { [courseId: string?]: string };
};
