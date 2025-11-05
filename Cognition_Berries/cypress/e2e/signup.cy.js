describe("Cognition Berries – Sign-Up Flow", () => {

  beforeEach(() => {
    cy.visit("/signup");
  });

  it("should display the signup form correctly", () => {
    cy.contains("Sign Up").should("be.visible");
    cy.get('input[name="name"]').should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("contain.text", "Sign Up");
  });

  it("should register a new user successfully", () => {
    const timestamp = Date.now();
    const email = `cypress_user_${timestamp}@test.com`;

    cy.get('input[name="name"]').type("Cypress Test User");
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();

    // ✅ Verify successful redirect to Home page
    cy.url({ timeout: 10000 }).should("include", "/home");
  });

  it("should show an error if email is invalid", () => {
    cy.get('input[name="name"]').type("Invalid Email User");
    cy.get('input[name="email"]').type("invalidemail");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.on("window:alert", (msg) => {
      expect(msg).to.contain("Please enter a valid email address.");
    });
  });
});
