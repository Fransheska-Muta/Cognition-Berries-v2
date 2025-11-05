describe("Cognition Berries - Add Course Page", () => {
  beforeEach(() => {
    // optional: log in before test
    cy.visit("/login");
    cy.get('input[name="email"]').type("test@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/");
  });

  it("should navigate to Add Course section", () => {
    cy.get('a[href="/courses"]').click();
    cy.contains("Courses").should("be.visible");
  });

  it("should add a new course successfully", () => {
    cy.get('input[name="courseTitle"]').type("Cypress Testing 101");
    cy.get('textarea[name="courseDescription"]').type("Intro to automated testing using Cypress");
    cy.get('button[type="submit"]').click();
    cy.contains("Course added successfully").should("be.visible");
  });
});
