import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LessonList from "../LessionLIst/LessionLIst";
// import QuizRenderer from "../../../components/QuizRenderer/QuizRenderer";
// import VideoPlayer from "../../../components/VideoPlayer/VideoPlayer";
// import { apiRequest } from "../../../
import { useProgress } from "../../hooks/useProgress";
import { useLessonCompletion } from "../../hooks/useLessonCompletion";
// import "./CourseLearning.css";

function CourseLearning() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [course, setCourse] = useState(null);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notes, setNotes] = useState("");

    const { progress, refetch: refetchProgress } = useProgress(
        courseId,
        user?.uid
    );

    const handleProgressUpdate = useCallback(() => {
        refetchProgress();
    }, [refetchProgress]);

    const { completeLesson, completing } = useLessonCompletion(
        courseId,
        handleProgressUpdate
    );

    useEffect(() => {
        async function loadUser() {
            try {
                const response = await apiRequest("/me");
                setUser(response);
            } catch (err) {
                console.error("Could not load user:", err);
            }
        }

        loadUser();
    }, []);

    useEffect(() => {
        async function loadCourse() {
            if (!courseId) return;

            try {
                setLoading(true);
                setError("");

                const response = await apiRequest(`/courses/${courseId}`);
                setCourse(response);
            } catch (err) {
                console.error("Could not load course:", err);
                setError("Could not load this course.");
            } finally {
                setLoading(false);
            }
        }

        loadCourse();
    }, [courseId]);

    const lessons = useMemo(() => {
        if (!course) return [];

        const modules = course.modules || [];

        return modules.flatMap((module, moduleIndex) =>
            (module.lessons || []).map((lesson, lessonIndex) => ({
                ...lesson,
                id: lesson.id || lesson.lessonId || `${moduleIndex}-${lessonIndex}`,
                moduleTitle:
                    module.title ||
                    module.name ||
                    `Module ${moduleIndex + 1}`,
            }))
        );
    }, [course]);

    useEffect(() => {
        if (!lessons.length) return;

        const completedLessons = progress?.completedLessons || [];

        let selectedLesson = null;

        if (progress?.lastOpenedLesson) {
            selectedLesson = lessons.find(
                (lesson) => lesson.id === progress.lastOpenedLesson
            );
        }

        if (!selectedLesson) {
            selectedLesson = lessons.find(
                (lesson) => !completedLessons.includes(lesson.id)
            );
        }

        if (!selectedLesson) {
            selectedLesson = lessons[lessons.length - 1];
        }

        setCurrentLesson(selectedLesson);
    }, [lessons, progress]);

    useEffect(() => {
        if (!currentLesson || !courseId) return;

        const savedNotes = localStorage.getItem(
            `notes-${courseId}-${currentLesson.id}`
        );

        setNotes(savedNotes || "");

        apiRequest("/progress/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                courseId,
                lastOpenedLesson: currentLesson.id,
            }),
        }).catch(() => {});
    }, [currentLesson, courseId]);

    const handleLessonSelect = (lesson) => {
        setCurrentLesson(lesson);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleSaveNotes = () => {
        if (!currentLesson) return;

        localStorage.setItem(
            `notes-${courseId}-${currentLesson.id}`,
            notes
        );
    };

    const handleCompleteLesson = async (quizScore = null) => {
        if (!currentLesson) return;

        try {
            await completeLesson(currentLesson.id, quizScore);

            await refetchProgress();

            const currentIndex = lessons.findIndex(
                (lesson) => lesson.id === currentLesson.id
            );

            if (currentIndex < lessons.length - 1) {
                setCurrentLesson(lessons[currentIndex + 1]);
            }
        } catch (err) {
            console.error("Could not complete lesson:", err);
            alert("Could not save your progress. Please try again.");
        }
    };

    const handleQuizComplete = async (score) => {
        const passingScore =
            currentLesson?.quiz?.passingScore ?? 70;

        if (score >= passingScore) {
            await handleCompleteLesson(score);

            alert(
                `Quiz passed with ${score}%. Your progress has been saved!`
            );
        } else {
            await refetchProgress();

            alert(
                `You scored ${score}%. You need ${passingScore}% to pass. Try again!`
            );
        }
    };

    const handleVideoComplete = async () => {
        if (!currentLesson) return;

        await handleCompleteLesson();
    };

    const handleVideoAutoSave = async (currentTime) => {
        if (!currentLesson) return;

        try {
            await apiRequest("/progress/autosave-video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseId,
                    lessonId: currentLesson.id,
                    currentTime,
                }),
            });
        } catch (err) {
            console.error("Could not autosave video:", err);
        }
    };

    const isYouTubeUrl = (url) => {
        if (!url) return false;

        return (
            url.includes("youtube.com/watch") ||
            url.includes("youtu.be/")
        );
    };

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return "";

        try {
            const parsed = new URL(url);

            if (parsed.hostname.includes("youtu.be")) {
                const id = parsed.pathname.replace("/", "");

                return `https://www.youtube.com/embed/${id}`;
            }

            const videoId = parsed.searchParams.get("v");

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        } catch {
            return "";
        }

        return "";
    };

    const getVideoUrl = () => {
        return (
            currentLesson?.videoUrl ||
            currentLesson?.video ||
            currentLesson?.youtubeUrl ||
            ""
        );
    };

    if (loading) {
        return (
            <div className="course-learning-page">
                <div className="loading">
                    Loading your learning experience...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="course-learning-page">
                <div className="error-message">
                    {error}
                </div>

                <button onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="course-learning-page">
                <h2>Course not found</h2>

                <button onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const completedLessons =
        progress?.completedLessons || [];

    const completedCount = completedLessons.length;

    const percentComplete =
        progress?.percentComplete ??
        Math.round(
            (completedCount / Math.max(lessons.length, 1)) * 100
        );

    const currentIndex = currentLesson
        ? lessons.findIndex(
              (lesson) => lesson.id === currentLesson.id
          )
        : 0;

    const videoUrl = getVideoUrl();

    const currentIsCompleted =
        currentLesson &&
        completedLessons.includes(currentLesson.id);

    const isQuiz = Boolean(currentLesson?.quiz);

    return (
        <div className="course-learning-page">

            <header className="learning-header">

                <button
                    className="back-button"
                    onClick={() => navigate("/dashboard")}
                >
                    ← Dashboard
                </button>

                <div>
                    <h1>
                        {course.title || "Personal Finances"}
                    </h1>

                    <p>
                        Your personalized learning journey
                    </p>
                </div>

            </header>

            <div className="learning-progress">

                <div className="progress-top">

                    <strong>
                        Course Progress
                    </strong>

                    <span>
                        {percentComplete}%
                    </span>

                </div>

                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${percentComplete}%`,
                        }}
                    />
                </div>

                <p>
                    {completedCount} of {lessons.length} lessons completed
                </p>

            </div>

            <div className="learning-layout">

                <aside className="lesson-sidebar">

                    <h2>
                        Your Learning Path
                    </h2>

                    <LessonList
                        lessons={lessons}
                        completedLessons={completedLessons}
                        currentLessonId={currentLesson?.id}
                        onLessonSelect={handleLessonSelect}
                        onMarkComplete={handleCompleteLesson}
                        userProgress={progress}
                    />

                </aside>

                <main className="lesson-content">

                    {currentLesson && (
                        <>

                            <div className="lesson-heading">

                                <span className="module-label">
                                    {currentLesson.moduleTitle}
                                </span>

                                <h2>
                                    {currentLesson.title}
                                </h2>

                                <p>
                                    Step {currentIndex + 1} of{" "}
                                    {lessons.length}
                                </p>

                            </div>

                            {currentLesson.description && (
                                <div className="lesson-description">
                                    {currentLesson.description}
                                </div>
                            )}

                            {Array.isArray(currentLesson.steps) &&
                                currentLesson.steps.length > 0 && (
                                    <div className="study-steps">

                                        <h3>
                                            Steps to complete
                                        </h3>

                                        {currentLesson.steps.map(
                                            (step, index) => (
                                                <div
                                                    className="study-step"
                                                    key={index}
                                                >
                                                    <div className="step-number">
                                                        {index + 1}
                                                    </div>

                                                    <div>
                                                        <h4>
                                                            {step.title ||
                                                                `Step ${
                                                                    index + 1
                                                                }`}
                                                        </h4>

                                                        <p>
                                                            {step.text ||
                                                                step.description ||
                                                                step}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                    </div>
                                )}

                            {currentLesson.content && (
                                <div className="lesson-content-text">
                                    <h3>
                                        Learn
                                    </h3>

                                    <p>
                                        {currentLesson.content}
                                    </p>
                                </div>
                            )}

                            {videoUrl && (
                                <div className="lesson-video">

                                    <h3>
                                        Watch & Learn
                                    </h3>

                                    {isYouTubeUrl(videoUrl) ? (
                                        <iframe
                                            className="youtube-player"
                                            src={getYouTubeEmbedUrl(
                                                videoUrl
                                            )}
                                            title={
                                                currentLesson.title
                                            }
                                            allowFullScreen
                                        />
                                    ) : videoUrl.includes(
                                          "youtube.com/results"
                                      ) ? (
                                        <div className="youtube-search">
                                            <p>
                                                Watch a helpful YouTube
                                                lesson for this topic.
                                            </p>

                                            <a
                                                href={videoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open YouTube lesson →
                                            </a>
                                        </div>
                                    ) : (
                                        <VideoPlayer
                                            src={videoUrl}
                                            title={
                                                currentLesson.title
                                            }
                                            currentTime={
                                                progress?.videoPositions?.[
                                                    currentLesson.id
                                                ] || 0
                                            }
                                            onVideoComplete={
                                                handleVideoComplete
                                            }
                                            onAutoSave={
                                                handleVideoAutoSave
                                            }
                                        />
                                    )}

                                </div>
                            )}

                            {isQuiz && (
                                <div className="lesson-quiz">

                                    <h3>
                                        Practice Quiz
                                    </h3>

                                    <QuizRenderer
                                        quiz={currentLesson.quiz}
                                        onQuizComplete={
                                            handleQuizComplete
                                        }
                                        userScore={
                                            progress?.quizScores?.[
                                                currentLesson.id
                                            ]
                                        }
                                    />

                                </div>
                            )}

                            {!isQuiz && (
                                <button
                                    className="complete-button"
                                    disabled={
                                        currentIsCompleted ||
                                        completing
                                    }
                                    onClick={() =>
                                        handleCompleteLesson()
                                    }
                                >
                                    {currentIsCompleted
                                        ? "✓ Completed"
                                        : completing
                                        ? "Saving..."
                                        : "Mark Lesson Complete"}
                                </button>
                            )}

                            {isQuiz &&
                                !currentIsCompleted && (
                                    <div className="quiz-completion-note">
                                        Pass the quiz to complete this
                                        lesson.
                                    </div>
                                )}

                            <div className="notes-section">

                                <h3>
                                    My Notes
                                </h3>

                                <textarea
                                    value={notes}
                                    onChange={(e) =>
                                        setNotes(e.target.value)
                                    }
                                    placeholder="Write your notes here..."
                                />

                                <button
                                    onClick={handleSaveNotes}
                                >
                                    Save Notes
                                </button>

                            </div>

                            {currentIndex < lessons.length - 1 && (
                                <button
                                    className="next-lesson-button"
                                    onClick={() =>
                                        setCurrentLesson(
                                            lessons[currentIndex + 1]
                                        )
                                    }
                                >
                                    Next Lesson →
                                </button>
                            )}

                        </>
                    )}

                </main>

            </div>

        </div>
    );
}

export default CourseLearning;