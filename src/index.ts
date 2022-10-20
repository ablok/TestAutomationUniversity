import { TAU } from "./objects/TAU";
import { User } from "./objects/User";

const GATHER_EMAIL = process.env.GATHER_EMAIL!;
const GATHER_PASSWORD = process.env.GATHER_PASSWORD!;
const SUBMIT_EMAIL = process.env.SUBMIT_EMAIL!;
const SUBMIT_PASSWORD = process.env.SUBMIT_PASSWORD!;

(async () => {
    const submitUser = new User(SUBMIT_EMAIL, SUBMIT_PASSWORD);
    const submitAccount = await new TAU(submitUser).signIn();

    const gatherUser = new User(GATHER_EMAIL, GATHER_PASSWORD);
    const gatherAccount = await new TAU(gatherUser).signIn();

    const { completedCourseIds, completedChapters } = await submitAccount.getCompletedCourseIdsAndChapters();
    const courses = (await gatherAccount.getCourse(false)).filter(
        (courseInfo) => !completedCourseIds.includes(courseInfo.courseId)
    );

    for (const course of courses) {
        course.chapters = (await gatherAccount.getChapters(course)).filter(
            (chapter) => !completedChapters.includes(`${course.courseId}_${chapter}`)
        );

        for (const chapter of course.chapters) {
            chapter.questions = await gatherAccount.getQuestionsAndAnswers(course.courseId, chapter.chapterId);

            await submitAccount.submit(course.courseId, chapter.chapterId, chapter.questions);
        }

        await submitAccount.generateCertificate(course.courseId);
    }
})();
