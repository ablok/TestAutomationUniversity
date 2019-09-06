import fetch from "node-fetch";
import urljoin from "url-join";
import { Course, Question, SubmitQuestionsResult, Chapter } from "./course";
import * as fs from "fs";
import _, { concat } from "lodash";
import { authenticate } from "./utils"

const EMAIL = "c851350@urhen.com";
const PASSWORD = "test1234";

(async () => {
    const { baseUrl, token } = await authenticate(EMAIL, PASSWORD);

    let previouslyScrapedCourses = [];
    if (fs.existsSync("courses.json")) {
        previouslyScrapedCourses = JSON.parse(fs.readFileSync("courses.json", "utf8"));
    }

    const newCourses = await getNewLiveCourses(baseUrl, previouslyScrapedCourses);

    const newCoursesWithAnswers = await Promise.all(newCourses.map(async newCourse => {
        const newCourseWithQuesions = await getChaptersAndQuestions(baseUrl, newCourse);
        const newCourseWithAnswers = await getAnswers(baseUrl, token, newCourseWithQuesions);
        return newCourseWithAnswers;
    }));

    previouslyScrapedCourses.concat(newCoursesWithAnswers);

    fs.writeFileSync("courses.json", JSON.stringify(newCoursesWithAnswers));
})();

async function getNewLiveCourses(baseUrl: string, previouslyScrapedCourses: Course[]) {
    const endpoint = urljoin(baseUrl, "getCourses");
    const response = await fetch(endpoint);
    const courses = JSON.parse(await response.text()) as Course[];
    const liveCourses = courses.filter(course => course.status && course.status == "live");

    if (!liveCourses) {
        new Error("No live courses found");
    }

    const newLiveCourses = liveCourses.filter((liveCourse) => !previouslyScrapedCourses.some(previouslyScrapedCourse=> previouslyScrapedCourse.id === liveCourse.id))

    return newLiveCourses;
}

async function getChaptersAndQuestions(baseUrl: string, course: Course) {
    const endpoint = urljoin("https://testautomationu.applitools.com", course.titleSlug);
    const response = await fetch(endpoint);
    const html = await response.text();
    const matches1 = html.match(/(?<=>Chapter ).+?(?=\ |\.)/g);
    const matches2 = html.match(/(?<=>Chapter ).+?(?=[a-z]|\ |\.)/g);

    if (matches1 && matches2) {
        const matches = matches1.concat(matches2);
        if (matches.length > 0) {
            const chapters = await Promise.all(_.uniq(matches).map(async match => {
                const questions = await getQuestionsForChapter(baseUrl, course, `chapter${match}`);
                if (questions.length > 0) {
                    return { chapterId: `chapter${match}`, questions } as Chapter;
                }
            }));
            const filteredChapters = chapters.filter(chapter => chapter != null) as Chapter[];
            if (filteredChapters && filteredChapters.length > 0) {
                course.chapters = filteredChapters;
            }
        }
    } else {
        throw Error(`Unable to get chapters from the ${course.courseId} introduction page.`);
    }
    return course;
}

async function getAnswers(baseUrl: string, token: string, course: Course) {
    if (course.chapters) {
        for await (const chapter of course.chapters) {
            if (chapter.questions) {
                for await (const question of chapter.questions) {
                    console.log(`Scraping: ${course.courseId}\t${chapter.chapterId}\t${question.id}`);
                    const answerIndex = await getAnswerForQuestion(baseUrl, token, course, chapter.chapterId, question);
                    question.correctAnswerIndex = answerIndex;
                }
            }
        }
    }

    return course;
}

async function getQuestionsForChapter(baseUrl: string, course: Course, chapter: string) {
    const endpoint = urljoin(baseUrl, "quizzes", course.courseId, chapter);
    const response = await fetch(endpoint);
    return JSON.parse(await response.text()) as Question[]
}

async function getAnswerForQuestion(baseUrl: string, token: string, course: Course, chapter: string, question: Question) {
    const endpoint = urljoin(baseUrl, "validateQuizzes", course.courseId, chapter)

    for (let counter = 0; counter < question.answers.length; counter++) {
        const response = await fetch(endpoint, {
            method: "POST", headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ [question.id]: counter })
        });
        const json = JSON.parse(await response.text()) as SubmitQuestionsResult;
        if (json.passed.includes(question.id)) {
            return counter;
        }
    }
}