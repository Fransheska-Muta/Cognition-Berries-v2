import { useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./FinancialSimulators.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const clampNumber = (value, min = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, number) : min
};

// savings calculator
function calculateSavings(startingAmount, monthlyContribution, rate, years) {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = rate / 100 / 12;
  let balance = startingAmount;
  let totalContributions = startingAmount;
  const yearlyData = [];
  for (let month = 1; month <= months; month++) {
    balance += monthlyContribution;
    totalContributions += monthlyContribution;
    balance *= 1 + monthlyRate;
    if (month % 12 === 0 || month === months) {
      yearlyData.push({
        year: Math.ceil(month / 12),
        contributions: totalContributions,
        balance,
        interest: balance - totalContributions,
      })
    }
  }

  return {
    balance,
    totalContributions,
    interest: balance - totalContributions,
    yearlyData,
  };
}


function calculateInvestment(initialInvestment,monthlyInvestment,rate,years) {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = rate / 100 / 12;
  let balance = initialInvestment;
  let totalContributions = initialInvestment;
  const yearlyData = [];
  for (let month = 1; month <= months; month++) {
    balance += monthlyInvestment;
    totalContributions += monthlyInvestment;
    balance *= 1 + monthlyRate;
    if (month % 12 === 0 || month === months) {
      yearlyData.push({
        year: Math.ceil(month / 12),
        contributions: totalContributions,
        balance,
        growth: balance - totalContributions,
      });
    }
  }

  return {
    balance,
    totalContributions,
    growth: balance - totalContributions,
    yearlyData,
  };
}
// debt calculator
function calculateDebt(debt, annualRate, monthlyPayment) {
  let balance = debt;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  const monthlyRate = annualRate / 100 / 12;
  const payment = monthlyPayment;
  const monthlyData = [];
  if (balance <= 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      monthlyData: [],
      impossible: false,
    };
  }

  if (
    monthlyRate > 0 &&
    payment <= balance * monthlyRate
  ) {
    return {
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      monthlyData: [],
      impossible: true,
    };
  }

  while (balance > 0 && months < 1200) {
    months++;
    const interest = balance * monthlyRate;
    totalInterest += interest;
    const principal = Math.min(
      Math.max(payment - interest, 0),
      balance
    )
    const actualPayment = principal + interest;
    balance -= principal;
    totalPaid += actualPayment;
    monthlyData.push({
      month: months,
      balance: Math.max(balance, 0),
      interest,
      paid: totalPaid,
    });
  }

  return {
    months,
    totalInterest,
    totalPaid,
    monthlyData,
    impossible: balance > 0,
  };
}

// the growth chart
function GrowthChart({ data, type = "balance" }) {
  if (!data || data.length === 0) {
    return (
      <div className="sim-chart-empty">
        Enter your information to see the chart.
      </div>
    );
  }

  const values = data.map((item) => type === "debt"? item.balance: item.balance)
  const contributions = data.map((item) =>item.contributions || 0)
  const maxValue = Math.max(...values, ...contributions, 1);
  const width = 700;
  const height = 280;
  const padding = 35;
  const createPoints = (items, valueKey) => {
    return items
      .map((item, index) => {
        const value = item[valueKey] || 0;

        const x = padding + (index / Math.max(items.length - 1, 1)) *(width - padding * 2);
        const y = height - padding - (value / maxValue) *(height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ")
  }
  const balancePoints = createPoints(data, "balance");
  return (
    <div className="sim-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="sim-chart" role="img" aria-label="Financial growth chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis"/>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        <polyline points={balancePoints} className="chart-line" fill="none"/>
        {/* {type !== "debt" && (
          <polyline points={createPoints(data, "contributions")} className="chart-line-secondary" fill="none"/>
        )} */}
        {data.map((item, index) => {
          const value = item.balance || 0;
          const x =padding +(index / Math.max(data.length - 1, 1)) *(width - padding * 2);
          const y = height - padding - (value / maxValue) *(height - padding * 2);

          return (
            <circle key={`${item.year || item.month}-${index}`} cx={x} cy={y} r="4" className="chart-point"/>
          )
        })}
      </svg>

      <div className="chart-labels">
        <span>
          {type === "debt" ? "Starting debt" : "Starting"}
        </span>

        <span>
          {type === "debt" ? "Debt repayment" : "Future value"}
        </span>
      </div>
    </div>
  );
}

// the calculatiosn
function FinancialSimulators() {
  // const navigate = useNavigate();
  const [activeSimulator, setActiveSimulator] =useState("savings");
  /* Savings */
  const [startingAmount, setStartingAmount] =useState();
  const [monthlySavings, setMonthlySavings] =useState();
  const [savingsRate, setSavingsRate] =useState();
  const [savingsYears, setSavingsYears] =useState();
  /* Investment */
  const [initialInvestment, setInitialInvestment] =useState();
  const [monthlyInvestment, setMonthlyInvestment] =useState();
  const [investmentRate, setInvestmentRate] =useState();
  const [investmentYears, setInvestmentYears] =useState();
  /* Debt */
  const [debtAmount, setDebtAmount] =useState();
  const [debtRate, setDebtRate] =useState();
  const [monthlyPayment, setMonthlyPayment] =useState();
  /* Calculations */
  const savingsResult = useMemo(() =>calculateSavings(
        clampNumber(startingAmount),
        clampNumber(monthlySavings),
        clampNumber(savingsRate),
        clampNumber(savingsYears)
      ),
    [
      startingAmount,
      monthlySavings,
      savingsRate,
      savingsYears,
    ]
  )

  const investmentResult = useMemo(() => calculateInvestment(
        clampNumber(initialInvestment),
        clampNumber(monthlyInvestment),
        clampNumber(investmentRate),
        clampNumber(investmentYears)
      ),
    [
      initialInvestment,
      monthlyInvestment,
      investmentRate,
      investmentYears,
    ]
  );

  const debtResult = useMemo(() =>calculateDebt(
        clampNumber(debtAmount),
        clampNumber(debtRate),
        clampNumber(monthlyPayment)
      ),
    [debtAmount, debtRate, monthlyPayment]
  );

// for the debt calculatoins
  const scenarioB = useMemo( () =>calculateDebt(
        clampNumber(debtAmount),
        clampNumber(debtRate),
        clampNumber(monthlyPayment) + 500
      ),
    [debtAmount, debtRate, monthlyPayment]
  )
  const interestSaved = Math.max( 0,debtResult.totalInterest - scenarioB.totalInterest)
  const monthsSaved = Math.max(0,debtResult.months - scenarioB.months)
  const renderSavings = () => (
    <>
      <div className="simulator-heading">
        <div><span className="simulator-icon">💰</span><div>
            <h2>Savings Calculator</h2>
            <p> See how regular saving and compound interest could grow your money over time.</p>
          </div>
        </div>
      </div>

      <div className="calculator-layout">
        <div className="input-panel">
          <h3>Your savings plan</h3>

          <label>
            Starting amount
            <div className="input-with-prefix">
              <span>R</span>
              <input
                type="number"
                min="0"
                value={startingAmount}
                onChange={(e) =>
                  setStartingAmount(e.target.value)
                }
              />
            </div>
          </label>

          <label>
            Monthly contribution
            <div className="input-with-prefix">
              <span>R</span>
              <input
                type="number"
                min="0"
                value={monthlySavings}
                onChange={(e) =>
                  setMonthlySavings(e.target.value)
                }
              />
            </div>
          </label>

          <label>
            Interest rate
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                step="0.1"
                value={savingsRate}
                onChange={(e) =>
                  setSavingsRate(e.target.value)
                }
              />
              <span>%</span>
            </div>
          </label>

          <label>
            Time
            <div className="input-with-suffix">
              <input
                type="number"
                min="1"
                max="50"
                value={savingsYears}
                onChange={(e) =>
                  setSavingsYears(e.target.value)
                }
              />
              <span>years</span>
            </div>
          </label>
        </div>

        <div className="result-panel">
          <p className="result-label">
            Estimated final balance
          </p>

          <h3 className="main-result">
            {formatCurrency(savingsResult.balance)}
          </h3>

          <div className="result-grid">
            <div>
              <span>Initial savings</span>
              <strong>
                {formatCurrency(
                  clampNumber(startingAmount)
                )}
              </strong>
            </div>

            <div>
              <span>Contributions</span>
              <strong>
                {formatCurrency(
                  clampNumber(monthlySavings) *
                    Math.round(
                      clampNumber(savingsYears) * 12
                    )
                )}
              </strong>
            </div>

            <div>
              <span>Interest earned</span>
              <strong>
                {formatCurrency(
                  savingsResult.interest
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Your savings growth</h3>
            <p>
              Watch your money grow as time and compound
              interest work together.
            </p>
          </div>
        </div>

        <GrowthChart
          data={savingsResult.yearlyData}
        />
      </div>
    </>
  );

  const renderInvestment = () => (
    <>
      <div className="simulator-heading">
        <div>
          <span className="simulator-icon">📈</span>
          <div>
            <h2>Investment Calculator</h2>
            <p>
              Explore how regular investing could affect
              your money over the long term.
            </p>
          </div>
        </div>
      </div>

      <div className="calculator-layout">
        <div className="input-panel">
          <h3>Your investment plan</h3>

          <label>
            Initial investment
            <div className="input-with-prefix">
              <span>R</span>
              <input
                type="number"
                min="0"
                value={initialInvestment}
                onChange={(e) =>
                  setInitialInvestment(e.target.value)
                }
              />
            </div>
          </label>

          <label>
            Monthly investment
            <div className="input-with-prefix">
              <span>R</span>
              <input
                type="number"
                min="0"
                value={monthlyInvestment}
                onChange={(e) =>
                  setMonthlyInvestment(e.target.value)
                }
              />
            </div>
          </label>

          <label>
            Expected annual return
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                step="0.1"
                value={investmentRate}
                onChange={(e) =>
                  setInvestmentRate(e.target.value)
                }
              />
              <span>%</span>
            </div>
          </label>

          <label>
            Investment period
            <div className="input-with-suffix">
              <input
                type="number"
                min="1"
                max="50"
                value={investmentYears}
                onChange={(e) =>
                  setInvestmentYears(e.target.value)
                }
              />
              <span>years</span>
            </div>
          </label>
        </div>

        <div className="result-panel">
          <p className="result-label">
            Estimated final value
          </p>

          <h3 className="main-result">
            {formatCurrency(
              investmentResult.balance
            )}
          </h3>

          <div className="result-grid">
            <div>
              <span>Total contributions</span>
              <strong>
                {formatCurrency(
                  investmentResult.totalContributions
                )}
              </strong>
            </div>

            <div>
              <span>Estimated growth</span>
              <strong>
                {formatCurrency(
                  investmentResult.growth
                )}
              </strong>
            </div>

            <div>
              <span>Investment period</span>
              <strong>
                {investmentYears} years
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Contributions vs growth</h3>
            <p>
              The simulation shows how your estimated
              investment value could grow over time.
            </p>
          </div>
        </div>

        <GrowthChart
          data={investmentResult.yearlyData}
        />
      </div>

      <div className="warning-box">
        <span>⚠️</span>
        <div>
          <strong>Important</strong>
          <p>
            This calculator provides an estimate for
            educational purposes only. Investment returns
            are not guaranteed and actual results can be
            higher or lower.
          </p>
        </div>
      </div>
    </>
  );

  const renderDebt = () => (
    <>
      <div className="simulator-heading">
        <div>
          <span className="simulator-icon">💳</span>
          <div>
            <h2>Debt Repayment Tool</h2>
            <p>
              Explore how your monthly payment can affect
              your repayment time and interest costs.
            </p>
          </div>
        </div>
      </div>

      <div className="calculator-layout">
        <div className="input-panel">
          <h3>Your debt</h3>

          <label>
            Debt amount
            <div className="input-with-prefix">
              <span>R</span>
              <input
                type="number"
                min="0"
                value={debtAmount}
                onChange={(e) =>
                  setDebtAmount(e.target.value)
                }
              />
            </div>
          </label>

          <label>
            Interest rate
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                step="0.1"
                value={debtRate}
                onChange={(e) =>
                  setDebtRate(e.target.value)
                }
              />
              <span>%</span>
            </div>
          </label>

          <label>
            Monthly payment
            <div className="input-with-prefix">
              <span>R</span>
              <input
                type="number"
                min="1"
                value={monthlyPayment}
                onChange={(e) =>
                  setMonthlyPayment(e.target.value)
                }
              />
            </div>
          </label>
        </div>

        <div className="result-panel debt-result">
          {debtResult.impossible ? (
            <>
              <p className="result-label">
                Payment too low
              </p>

              <h3 className="debt-warning-title">
                Your debt may not decrease
              </h3>

              <p>
                Your monthly payment needs to be higher
                than the interest charged each month.
              </p>
            </>
          ) : (
            <>
              <p className="result-label">
                Estimated debt-free time
              </p>

              <h3 className="main-result">
                {Math.floor(
                  debtResult.months / 12
                ) > 0
                  ? `${Math.floor(
                      debtResult.months / 12
                    )} years ${
                      debtResult.months % 12
                    } months`
                  : `${debtResult.months} months`}
              </h3>

              <div className="result-grid">
                <div>
                  <span>Total interest</span>
                  <strong>
                    {formatCurrency(
                      debtResult.totalInterest
                    )}
                  </strong>
                </div>

                <div>
                  <span>Total paid</span>
                  <strong>
                    {formatCurrency(
                      debtResult.totalPaid
                    )}
                  </strong>
                </div>

                <div>
                  <span>Monthly payment</span>
                  <strong>
                    {formatCurrency(
                      clampNumber(monthlyPayment)
                    )}
                  </strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!debtResult.impossible && (
        <>
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3>Debt balance over time</h3>
                <p>
                  See how your balance could fall as you
                  make regular payments.
                </p>
              </div>
            </div>

            <GrowthChart
              data={debtResult.monthlyData}
              type="debt"
            />
          </div>

          <div className="scenario-card">
            <div>
              <span className="scenario-label">
                Scenario A
              </span>

              <h3>
                {formatCurrency(
                  clampNumber(monthlyPayment)
                )}
                /month
              </h3>

              <p>
                {debtResult.months} months to repay
              </p>

              <p>
                Interest:{" "}
                {formatCurrency(
                  debtResult.totalInterest
                )}
              </p>
            </div>

            <div className="scenario-arrow">→</div>

            <div>
              <span className="scenario-label">
                Scenario B
              </span>

              <h3>
                {formatCurrency(
                  clampNumber(monthlyPayment) + 500
                )}
                /month
              </h3>

              <p>
                {scenarioB.months} months to repay
              </p>

              <p>
                Interest:{" "}
                {formatCurrency(
                  scenarioB.totalInterest
                )}
              </p>
            </div>
          </div>

          <div className="saving-highlight">
            <span>🎯</span>

            <div>
              <strong>
                Increase your payment by R500
              </strong>

              <p>
                You could potentially save{" "}
                <strong>
                  {formatCurrency(interestSaved)}
                </strong>{" "}
                in interest and become debt-free{" "}
                <strong>
                  {monthsSaved} months
                </strong>{" "}
                sooner.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      <Navbar />

      <main className="financial-simulators">
        <div className="simulator-container">

          {/* <button
            className="back-button"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button> */}

          <header className="page-header">
            <span className="page-eyebrow">INTERACTIVE LEARNING</span>
            <h1>Financial Simulators</h1>
            <p> Experiment with your money. Change the numbers and see how different financial decisions could affect your future </p>
          </header>

          <div className="simulator-tabs">
            <button
              className={
                activeSimulator === "savings"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSimulator("savings")
              }
            >
              💰 Savings
            </button>

            <button
              className={
                activeSimulator === "investment"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSimulator("investment")
              }
            >
              📈 Investment
            </button>

            <button
              className={
                activeSimulator === "debt"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSimulator("debt")
              }
            >
              💳 Debtf
            </button>
          </div>

          <section className="simulator-card">
            {activeSimulator === "savings" &&
              renderSavings()}

            {activeSimulator === "investment" &&
              renderInvestment()}

            {activeSimulator === "debt" &&
              renderDebt()}
          </section>

        </div>
      </main>
    </>
  )
}

export default FinancialSimulators