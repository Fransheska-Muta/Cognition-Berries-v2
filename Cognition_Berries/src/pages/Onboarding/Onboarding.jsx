import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Onboarding.css";

const questions = [
  {
    id: "knowledge",
    title: "How would you describe your current financial knowledge?",
    subtitle: "This helps us determine where your learning journey should begin.",
    type: "single",
    options: [
      {
        value: "beginner",
        title: "I'm completely new to finance",
        description: "I want to start with the basics."
      },
      {
        value: "basic",
        title: "I know the basics",
        description: "I understand some financial concepts."
      },
      {
        value: "confident",
        title: "I'm fairly confident",
        description: "I understand most common financial concepts."
      },
      {
        value: "advanced",
        title: "I have advanced knowledge",
        description: "I'm comfortable with more complex financial topics."
      }
    ]
  },

  {
    id: "goals",
    title: "What would you like to learn about?",
    subtitle: "Select all the areas that interest you.",
    type: "multiple",
    options: [
      {
        value: "budgeting",
        title: "Budgeting",
        description: "Learn how to manage your income and expenses."
      },
      {
        value: "saving",
        title: "Saving",
        description: "Build better saving habits and financial security."
      },
      {
        value: "investing",
        title: "Investing",
        description: "Understand how investing works."
      },
      {
        value: "debt",
        title: "Managing Debt",
        description: "Learn strategies for understanding and managing debt."
      },
      {
        value: "wealth",
        title: "Building Wealth",
        description: "Learn about long-term financial growth."
      }
    ]
  },

  {
    id: "interests",
    title: "Which financial topics interest you most?",
    subtitle: "Choose the topics you would like to explore.",
    type: "multiple",
    options: [
      {
        value: "personal-finance",
        title: "Personal Finance",
        description: "Everyday money management."
      },
      {
        value: "investing",
        title: "Investing",
        description: "Learn about growing your money."
      },
      {
        value: "stocks",
        title: "Stocks & Markets",
        description: "Understand stocks and financial markets."
      },
      {
        value: "trading",
        title: "Trading",
        description: "Explore how trading works."
      },
      {
        value: "financial-planning",
        title: "Financial Planning",
        description: "Plan for your future financial goals."
      }
    ]
  },

  {
    id: "goal",
    title: "What is your biggest learning goal?",
    subtitle: "Choose what you would most like to achieve through Cognition Berries.",
    type: "single",
    options: [
      {
        value: "money-management",
        title: "Manage my money better",
        description: "Become more confident with everyday finances."
      },
      {
        value: "saving",
        title: "Build better saving habits",
        description: "Develop stronger saving and financial planning habits."
      },
      {
        value: "investing",
        title: "Understand investing",
        description: "Learn how investments and markets work."
      },
      {
        value: "wealth",
        title: "Build long-term wealth",
        description: "Develop knowledge for long-term financial growth."
      }
    ]
  }
];


function Onboarding() {

  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);

  const [answers, setAnswers] = useState({
    knowledge: "",
    goals: [],
    interests: [],
    goal: ""
  });


  const currentQuestion = questions[currentStep];


  const handleSingleSelect = (value) => {

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value
    }));

  };


  const handleMultipleSelect = (value) => {

    setAnswers((previous) => {

      const currentAnswers = previous[currentQuestion.id] || [];

      if (currentAnswers.includes(value)) {

        return {
          ...previous,
          [currentQuestion.id]: currentAnswers.filter(
            (item) => item !== value
          )
        };

      }

      return {
        ...previous,
        [currentQuestion.id]: [
          ...currentAnswers,
          value
        ]
      };

    });

  };


  const isSelected = (value) => {

    const currentAnswer = answers[currentQuestion.id];

    if (currentQuestion.type === "single") {
      return currentAnswer === value;
    }

    return currentAnswer?.includes(value);

  };


  const hasAnswer = () => {

    const answer = answers[currentQuestion.id];

    if (Array.isArray(answer)) {
      return answer.length > 0;
    }

    return answer !== "";

  };


  const handleNext = () => {

    if (!hasAnswer()) {
      return;
    }

    if (currentStep < questions.length - 1) {

      setCurrentStep((previous) => previous + 1);

    } else {

      createLearningPath();

    }

  };


  const handleBack = () => {

    if (currentStep > 0) {

      setCurrentStep((previous) => previous - 1);

    }

  };


  const createLearningPath = () => {

    const learningPath = generateLearningPath(answers);


    /*
      Save the onboarding information temporarily.

      Later we will replace this with our backend/database
      so the information belongs to the user's account.
    */

    localStorage.setItem(
      "cognitionBerriesOnboarding",
      JSON.stringify(answers)
    );


    localStorage.setItem(
      "cognitionBerriesLearningPath",
      JSON.stringify(learningPath)
    );


    navigate("/dashboard");

  };


  return (

    <div className="onboarding-page">


      {/* HEADER */}

      <div className="onboarding-header">
        <div className="onboarding-header-text">
          Personalise your learning journey
        </div>

      </div>


      {/* MAIN CONTENT */}

      <main className="onboarding-main">


        <div className="onboarding-card">


          {/* TITLE */}

          <div className="onboarding-intro">

            <span className="onboarding-label">
              YOUR FINANCIAL JOURNEY
            </span>

            <h1>
              Let's personalise your learning
            </h1>

            <p>
              Answer a few quick questions and we'll
              create a learning path based on your
              knowledge, goals and interests.
            </p>

          </div>


          {/* PROGRESS */}

          <div className="progress-container">

            <div className="progress-info">
 {/* for here its eg step 1 of 5 */}
              <span>
                Step {currentStep + 1} of {questions.length}
              </span>

              <span>
                {Math.round(
                  ((currentStep + 1) / questions.length) * 100
                )}%
              </span>

            </div>


            <div className="progress-track">

              <div
                className="progress-fill"
                style={{
                  width: `${(
                    ((currentStep + 1) /
                      questions.length) *
                    100
                  )}%`
                }}
              />

            </div>

          </div>


          {/* QUESTION */}

          <div className="question-section">

            <h2>
              {currentQuestion.title}
            </h2>

            <p className="question-subtitle">
              {currentQuestion.subtitle}
            </p>


            <div
              className={
                currentQuestion.type === "multiple"
                  ? "answer-grid multiple"
                  : "answer-grid"
              }
            >

              {currentQuestion.options.map((option) => (

                <button
                  key={option.value}
                  type="button"
                  className={`answer-option ${
                    isSelected(option.value)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {

                    if (
                      currentQuestion.type === "single"
                    ) {

                      handleSingleSelect(
                        option.value
                      );

                    } else {

                      handleMultipleSelect(
                        option.value
                      );

                    }

                  }}
                >

                  <div className="answer-radio">

                    {isSelected(option.value) && (
                      <span>✓</span>
                    )}

                  </div>


                  <div className="answer-content">

                    <strong>
                      {option.title}
                    </strong>

                    <span>
                      {option.description}
                    </span>

                  </div>

                </button>

              ))}

            </div>

          </div>


          {/* BUTTONS */}

          <div className="onboarding-actions">

            <button
              type="button"
              className="back-button"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              ← Back
            </button>


            <button
              type="button"
              className="continue-button"
              onClick={handleNext}
              disabled={!hasAnswer()}
            >
              {currentStep === questions.length - 1
                ? "Create My Learning Path"
                : "Continue →"}
            </button>

          </div>


        </div>


      </main>

    </div>

  );

}


/*
  Creates the first version of the personalised
  learning path.

  We will make this more intelligent later by
  connecting it to the actual courses in the
  database.
*/

function generateLearningPath(answers) {

  const path = [];


  // Beginner users start with Money Basics.

  if (answers.knowledge === "beginner") {

    path.push("Money Basics");

  }


  // Budgeting

  if (
    answers.goals.includes("budgeting") ||
    answers.interests.includes("personal-finance")
  ) {

    path.push("Budgeting");

  }


  // Saving

  if (
    answers.goals.includes("saving") ||
    answers.goal === "saving"
  ) {

    path.push("Saving");

  }


  // Investing

  if (
    answers.goals.includes("investing") ||
    answers.interests.includes("investing") ||
    answers.goal === "investing"
  ) {

    path.push("Introduction to Investing");

  }


  // Stocks

  if (answers.interests.includes("stocks")) {

    path.push("Understanding Stocks");

  }


  // Wealth building

  if (
    answers.goals.includes("wealth") ||
    answers.goal === "wealth" ||
    answers.interests.includes("financial-planning")
  ) {

    path.push("Building a Portfolio");

  }


  /*
    If the user doesn't have a specific path yet,
    give them a basic financial education journey.
  */

  if (path.length === 0) {

    return [
      "Money Basics",
      "Budgeting",
      "Saving",
      "Introduction to Investing",
      "Understanding Stocks",
      "Building a Portfolio"
    ];

  }


  // Remove duplicate courses.

  return [...new Set(path)];

}


export default Onboarding;