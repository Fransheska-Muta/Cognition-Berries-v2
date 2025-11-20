import React, { useState, useEffect } from 'react';
import './QuizRenderer.css';

const QuizRenderer = ({ 
  quiz, 
  onQuizComplete, 
  userScore = null,
  isReadOnly = false 
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  useEffect(() => {
    if (quiz.timeLimit && !isReadOnly) {
      setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
    }
  }, [quiz.timeLimit, isReadOnly]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isReadOnly) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isReadOnly]);

  useEffect(() => {
    if (userScore !== null) {
      setQuizScore(userScore);
      setShowResults(true);
    }
  }, [userScore]);

  const handleTimeUp = () => {
    if (!showResults) {
      calculateScore();
    }
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    if (isReadOnly || showResults) return;

    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateScore();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    
    quiz.questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer !== undefined && question.correctAnswer === userAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    setQuizScore(score);
    setShowResults(true);
    
    if (onQuizComplete) {
      onQuizComplete(score, userAnswers);
    }
  };

  const handleRetryQuiz = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setQuizScore(null);
    if (quiz.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnswerClass = (question, answerIndex) => {
    if (!showResults) {
      return userAnswers[question.id] === answerIndex ? 'selected' : '';
    }

    if (answerIndex === question.correctAnswer) {
      return 'correct';
    }
    
    if (userAnswers[question.id] === answerIndex && answerIndex !== question.correctAnswer) {
      return 'incorrect';
    }
    
    return '';
  };

  const getQuestionStatus = (index) => {
    if (index === currentQuestionIndex) return 'current';
    if (userAnswers[quiz.questions[index].id] !== undefined) return 'answered';
    return 'pending';
  };

  if (isReadOnly && showResults) {
    return (
      <div className="quiz-container read-only">
        <div className="quiz-header">
          <h2>{quiz.title}</h2>
          <div className={`quiz-score ${quizScore >= 70 ? 'pass' : 'fail'}`}>
            Score: {quizScore}%
          </div>
        </div>
        
        <div className="questions-review">
          {quiz.questions.map((question, index) => (
            <div key={question.id} className="question-review">
              <h4>Question {index + 1}: {question.text}</h4>
              <div className="answers-review">
                {question.answers.map((answer, answerIndex) => (
                  <div
                    key={answerIndex}
                    className={`answer-review ${getAnswerClass(question, answerIndex)}`}
                  >
                    {answer}
                    {answerIndex === question.correctAnswer && (
                      <span className="correct-marker">✓ Correct</span>
                    )}
                    {userAnswers[question.id] === answerIndex && answerIndex !== question.correctAnswer && (
                      <span className="incorrect-marker">✗ Your answer</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="quiz-container results">
        <div className="results-header">
          <h2>Quiz Complete!</h2>
          <div className={`final-score ${quizScore >= quiz.passingScore ? 'pass' : 'fail'}`}>
            <div className="score-circle">
              {quizScore}%
            </div>
            <div className="score-text">
              {quizScore >= quiz.passingScore ? 'Passed' : 'Failed'}
            </div>
          </div>
        </div>

        <div className="results-details">
          <div className="result-stats">
            <div className="stat">
              <span className="stat-value">
                {Object.values(userAnswers).filter((answer, index) => 
                  answer === quiz.questions[index].correctAnswer
                ).length}
              </span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {quiz.questions.length - Object.values(userAnswers).filter((answer, index) => 
                  answer === quiz.questions[index].correctAnswer
                ).length}
              </span>
              <span className="stat-label">Incorrect</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {quiz.questions.length - Object.keys(userAnswers).length}
              </span>
              <span className="stat-label">Skipped</span>
            </div>
          </div>

          {quizScore < quiz.passingScore && (
            <div className="retry-section">
              <p>You need {quiz.passingScore}% to pass. Would you like to try again?</p>
              <button className="retry-btn" onClick={handleRetryQuiz}>
                Retry Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-info">
          <h2>{quiz.title}</h2>
          <div className="quiz-meta">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            {timeRemaining !== null && (
              <span className="timer">
                Time: {formatTime(timeRemaining)}
              </span>
            )}
          </div>
        </div>
        
        {quiz.passingScore && (
          <div className="passing-score">
            Passing Score: {quiz.passingScore}%
          </div>
        )}
      </div>

      {/* Question Navigation */}
      <div className="question-nav">
        {quiz.questions.map((_, index) => (
          <button
            key={index}
            className={`nav-dot ${getQuestionStatus(index)}`}
            onClick={() => setCurrentQuestionIndex(index)}
            disabled={isReadOnly}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Current Question */}
      <div className="question-container">
        <h3 className="question-text">
          {currentQuestion.text}
        </h3>
        
        {currentQuestion.image && (
          <div className="question-image">
            <img src={currentQuestion.image} alt="Question illustration" />
          </div>
        )}

        <div className="answers-container">
          {currentQuestion.answers.map((answer, index) => (
            <div
              key={index}
              className={`answer-option ${getAnswerClass(currentQuestion, index)}`}
              onClick={() => handleAnswerSelect(currentQuestion.id, index)}
            >
              <div className="answer-marker">
                {String.fromCharCode(65 + index)}
              </div>
              <div className="answer-text">
                {answer}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="quiz-navigation">
        <button
          className="nav-btn prev-btn"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || isReadOnly}
        >
          Previous
        </button>
        
        <div className="progress-indicator">
          {Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}% Complete
        </div>
        
        <button
          className="nav-btn next-btn"
          onClick={handleNextQuestion}
          disabled={isReadOnly}
        >
          {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default QuizRenderer;