import React from "react";
// import "./LessonList.css";

const LessonList = ({
    lessons = [],
    completedLessons = [],
    currentLessonId,
    onLessonSelect,
}) => {
    return (
        <div className="lesson-list">
            {lessons.map((lesson, index) => {
                const lessonId =
                    lesson.id ||
                    lesson.lessonId ||
                    index.toString();

                const isCompleted =
                    completedLessons.includes(lessonId);

                const isCurrent =
                    currentLessonId === lessonId;

                let lessonType = "Study";

                if (lesson.quiz) {
                    lessonType = "Quiz";
                } else if (
                    lesson.videoUrl ||
                    lesson.video ||
                    lesson.youtubeUrl
                ) {
                    lessonType = "Video";
                }

                return (
                    <button
                        key={lessonId}
                        type="button"
                        className={`lesson-item ${
                            isCurrent ? "active" : ""
                        } ${
                            isCompleted ? "completed" : ""
                        }`}
                        onClick={() =>
                            onLessonSelect(lesson)
                        }
                    >
                        <div className="lesson-status">
                            {isCompleted ? (
                                "✓"
                            ) : (
                                index + 1
                            )}
                        </div>

                        <div className="lesson-info">
                            <strong>
                                {lesson.title ||
                                    `Lesson ${index + 1}`}
                            </strong>

                            <span>
                                {lessonType}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default LessonList;