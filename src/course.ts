export type Course = {
    id: string,
    chaptersCount: number,
    status?: string,
    credits: number,
    courseId: string,
    category: string,
    groupName: string,
    title: string,
    titleSlug: string,
    teacher: {
        twitter: string,
        name: string,
        photoURL: string,
        profilePath: string
    },
    level: string,
    type: string,
    abstract: string,
    sortOrder: number,
    group: string,
    releaseDate: string
    chapters?: Chapter[]
}

export type Chapter = {
    chapterId: string,
    questions?: Question[]
}

export type Question = {
    answers: string[],
    id: string,
    question: string,
    type: string,
    correctAnswerIndex?: number
}

export type SubmitQuestionsResult = {
    attempts: number,
    chapterId: string,
    courseId: string,
    credits: number,
    failed: string[],
    passed: string[],
    result: boolean
}