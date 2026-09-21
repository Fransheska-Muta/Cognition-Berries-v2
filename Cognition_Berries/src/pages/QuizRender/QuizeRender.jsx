import React, { useEffect, useState } from "react";
// import "./QuizRenderer.css";

const QuizRenderer = ({
    quiz,
    onQuizComplete,
    userScore = null,
    isReadOnly = false,
}) => {
    const [answers, setAnswers] = useState({});
    const [finished, setFinished] = useState(false);
    const [score, setScore] = useState(userScore);

    useEffect(() => {
        setScore(userScore);
    }, [userScore]);

    if (!quiz || !quiz.questions?.length) {
        return (
            <div className="quiz-empty">
                No quiz available for this lesson.
            </div>
        );
    }

    const questions = quiz.questions;

    const handleAnswer = (questionId, answerIndex) => {
        if (finished || isReadOnly) {
            return;
        }

        setAnswers((previous) => ({
            ...previous,
            [questionId]: answerIndex,
        }));
    };

    const finishQuiz = () => {
        let correctAnswers = 0;

        questions.forEach((question) => {
            const selectedAnswer =
                answers[question.id];

            if (
                selectedAnswer !== undefined &&
                selectedAnswer === question.correctAnswer
            ) {
                correctAnswers++;
            }
        });

        const calculatedScore = Math.round(
            (correctAnswers / questions.length) * 100
        );

        setScore(calculatedScore);
        setFinished(true);

        if (onQuizComplete) {
            onQuizComplete(
                calculatedScore,
                answers
            );
        }
    };

    const retryQuiz = () => {
        setAnswers({});
        setFinished(false);
        setScore(null);
    };

    return (
        <div className="quiz-renderer">

            {questions.map((question, index) => (
                <div
                    className="quiz-question"
                    key={question.id || index}
                >
                    <h4>
                        {index + 1}. {question.text}
                    </h4>

                    <div className="quiz-answers">

                        {question.answers.map(
                            (answer, answerIndex) => {

                                const selected =
                                    answers[question.id] ===
                                    answerIndex;

                                return (
                                    <button
                                        type="button"
                                        key={answerIndex}
                                        className={
                                            selected
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            handleAnswer(
                                                question.id,
                                                answerIndex
                                            )
                                        }
                                    >
                                        {answer}
                                    </button>
                                );
                            }
                        )}

                    </div>
                </div>
            ))}

            {!finished && !isReadOnly && (
                <button
                    type="button"
                    className="quiz-submit"
                    disabled={
                        Object.keys(answers).length !==
                        questions.length
                    }
                    onClick={finishQuiz}
                >
                    Submit Quiz
                </button>
            )}

            {finished && (
                <div className="quiz-result">

                    <h3>
                        Your Score: {score}%
                    </h3>

                    {score >=
                    (quiz.passingScore ?? 70) ? (
                        <p>
                            🎉 Great job! You passed!
                        </p>
                    ) : (
                        <p>
                            Keep practicing and try again.
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={retryQuiz}
                    >
                        Try Again
                    </button>

                </div>
            )}

        </div>
    );
};

export default QuizRenderer;