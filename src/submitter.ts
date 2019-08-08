import { authenticate } from "./utils";
import * as fs from "fs";
import { Course, SubmitQuestionsResult } from "./course";
import urljoin from "url-join";
import fetch from "node-fetch";

const EMAIL = "";
const PASSWORD = "";

(async () => {
    const { baseUrl, token } = await authenticate(EMAIL, PASSWORD);
    const courses = JSON.parse(fs.readFileSync("courses.json", { encoding: "utf-8" })) as Course[];

    // await Promise.all(courses.map(async course => {
    //     await submitQuestions(baseUrl, token, course);
    //     await generateCertificate(baseUrl, token, course);
    // }));

    for await(const course of courses) {
        await submitQuestions(baseUrl, token, course);
        await generateCertificate(baseUrl, token, course);
    }
})()

async function submitQuestions(baseUrl: string, token: string, course: Course) {
    if (course.chapters) {
        for await (const chapter of course.chapters) {
            if (chapter.questions && chapter.questions.length > 0) {
                let answers= {};

                for await (const question of chapter.questions) {
                    if (question.correctAnswerIndex !== undefined) {
                        Object.assign(answers, {[question.id]: question.correctAnswerIndex.toString()})
                    }
                }
                
                const endpoint = urljoin(baseUrl, "validateQuizzes", course.courseId, chapter.chapterId)
                console.log(`Submitting ${course.courseId}\t${chapter.chapterId} with\t${JSON.stringify(answers)}`)
                const response = await fetch(endpoint, {
                    method: "POST", headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(answers)
                });
                const json = JSON.parse(await response.text()) as SubmitQuestionsResult;
                if(!json.result) {
                    throw Error(`Something went wrong whils submitting questions for ${course.courseId} ${chapter.chapterId}.\n${json}`)
                }
            }
        }
    }
}

async function generateCertificate(baseUrl: string, token: string, course: Course) {
    const endpoint = urljoin(baseUrl, "generateUploadCertificate");
    console.log(`Generating certificate for ${course.courseId}`)
    await fetch(endpoint, {
        method: "POST", headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({"courseId": course.courseId})
    });
}