import fetch from "node-fetch";
import { User } from "./User";
import { Course, ValidateQuizzesResult, FullQuizResultsForUser, Question } from "../../typings/TAU";

export class TAU {
    private apiServerUrl: string | undefined;
    private token: string | undefined;

    constructor(private readonly user: User) {}

    async getCourse(activeOnly = false) {
        const response = await fetch(`${this.apiServerUrl}/getCourses?activeOnly=${activeOnly}`);
        const courseInfo = (await response.json()).map((course: Course) => {
            return { courseId: course.courseId, chaptersCount: course.chaptersCount };
        });
        return courseInfo as Course[];
    }

    async getCompletedCourseIdsAndChapters() {
        const response = await fetch(`${this.apiServerUrl}/getFullQuizResultsForUser/${this.user.id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });
        const json = (await response.json()) as FullQuizResultsForUser;
        return {
            completedCourseIds: Object.keys(json.courseCertificates ?? []),
            completedChapters: json.completedChapters ?? [],
        };
    }

    async getChapters(course: Course) {
        const chapters = [];
        let chapterId = "chapter1";
        let counter = course.chaptersCount;

        console.log(`Getting chapters for ${course.courseId}:`);
        while (counter) {
            const response = await fetch(`${this.apiServerUrl}/quizzes/${course.courseId}/${chapterId}`);
            if ((await response.json()).length === 0) {
                const lastChar = chapterId.slice(-1);
                if (isNaN(Number(lastChar))) {
                    chapterId = chapterId.slice(0, -1);
                    const newChapterNr = Number(chapterId.replace("chapter", "")) + 1;
                    chapterId = `chapter${newChapterNr}`;
                } else {
                    chapterId = chapterId + "a";
                }
            } else {
                console.log(chapterId);
                chapters.push({ chapterId });
                counter--;

                const lastChar = chapterId.slice(-1);
                if (isNaN(Number(lastChar))) {
                    const unicodeChar = lastChar.charCodeAt(0);
                    chapterId = chapterId.slice(0, -1);
                    chapterId = chapterId + String.fromCharCode(unicodeChar + 1);
                } else {
                    const newChapterNr = Number(chapterId.replace("chapter", "")) + 1;
                    chapterId = `chapter${newChapterNr}`;
                }
            }
        }
        console.log("Done!");

        return chapters;
    }

    async getQuestionsAndAnswers(courseId: string, chapterId: string) {
        const questionsAndAnswers: { questionId: string; correctAnswerIndex: number }[] = [];

        console.log(`Getting questions for ${courseId} ${chapterId}:`);
        let results = await this.validateQuizzes(courseId, chapterId, {});
        const allQuestionIds = results.failed;

        for (let index = 0; questionsAndAnswers.length < allQuestionIds.length; index++) {
            const questions: { [questionId: string]: number } = {};
            allQuestionIds.forEach((questionId) => {
                if (!questionsAndAnswers.map((question) => question.questionId).includes(questionId)) {
                    questions[questionId] = index;
                }
            });
            console.log(`${Object.keys(questions).length} answer(s) to go`);
            results = await this.validateQuizzes(courseId, chapterId, questions);
            results.passed.forEach((passedQuestionId) => {
                questionsAndAnswers.push({ questionId: passedQuestionId, correctAnswerIndex: index });
            });
        }
        console.log("Done!");

        return questionsAndAnswers;
    }

    async submit(courseId: string, chapterId: string, questions: Question[]) {
        const questionsAndAnswers: { [questionId: string]: number } = {};
        questions.forEach((question) => (questionsAndAnswers[question.questionId] = question.correctAnswerIndex));

        console.log(`Submitting ${Object.keys(questionsAndAnswers).length} answer(s) for ${courseId} ${chapterId}.`);
        const validateQuizzesResponse = await this.validateQuizzes(courseId, chapterId, questionsAndAnswers);
        if (!validateQuizzesResponse.result) {
            throw Error(
                `Something went wrong whils submitting answers for ${courseId} ${chapterId}.\n${JSON.stringify(
                    validateQuizzesResponse
                )}.`
            );
        }
    }

    async generateCertificate(courseId: string) {
        console.log(`Generating certificate for ${courseId}.`);
        await fetch(`${this.apiServerUrl}/generateUploadCertificate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ courseId }),
        });
    }

    async signIn() {
        if (!this.token || !this.apiServerUrl || !this.user.id) {
            console.log(`Logging in for ${this.user.email}.`);
            const { apiServerUrl, apiKey } = await this.getApiServerUrlAndApiKey();
            this.apiServerUrl = apiServerUrl;
            const userIdAndBearerToken = await this.getUserIdAndBearerToken(apiKey);
            this.user.id = userIdAndBearerToken.userId;
            this.token = userIdAndBearerToken.token;
            console.log("Done!");
        }
        return this;
    }

    private async validateQuizzes(courseId: string, chapterId: string, answers: { [key: string]: number }) {
        const response = await fetch(`${this.apiServerUrl}/validateQuizzes/${courseId}/${chapterId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify(answers),
        });

        const json = await response.json();
        return json as ValidateQuizzesResult;
    }

    private async getApiServerUrlAndApiKey() {
        const url = "https://testautomationu.applitools.com";
        const response = await fetch(url);
        const html = await response.text();
        const apiServerUrlMatch = html.match(/(?<=let serverURL = ").*(?=")/);
        if (!apiServerUrlMatch) {
            throw Error(`Unable to retreive the API server url from ${url}`);
        }
        const apiKeyMatchResult = html.match(/(?<=apiKey: ").*(?=")/);
        if (!apiKeyMatchResult) {
            throw Error(`Unable to retreive the API key from ${url}`);
        }
        return { apiServerUrl: apiServerUrlMatch[0], apiKey: apiKeyMatchResult[0] };
    }

    private async getUserIdAndBearerToken(apiKey: string) {
        const response = await fetch(
            `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: this.user.email, password: this.user.password, returnSecureToken: true }),
            }
        );
        const json = await response.json();
        return { userId: json.localId, token: json.idToken };
    }
}
