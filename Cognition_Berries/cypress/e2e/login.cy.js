describe("Cognition Berries – Login Flow", () => {
  // Store user credentials in a variable
  const timestamp = Date.now();
  const testUser = {
    name: "Cypress Login User",
    email: `cypress_user_${timestamp}@test.com`,
    password: "password123",
  };

  // Sign up a new user first
  before(() => {
    cy.visit("/signup");

    cy.get('input[name="name"]').type(testUser.name);
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();

    // Wait for redirect to /home
    cy.url().should("include", "/home");
  });

  beforeEach(() => {
    cy.visit("/login");
  });

  it("should display the login form", () => {
    cy.contains("Login").should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("contain.text", "Login");
  });

  it("should log in successfully with valid credentials", () => {
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 10000 }).should("include", "/home");
  });

  it("should show an alert for invalid credentials", () => {
    cy.get('input[name="email"]').type("invalid@user.com");
    cy.get('input[name="password"]').type("wrongpass");
    cy.get('button[type="submit"]').click();

    cy.on("window:alert", (msg) => {
      expect(msg).to.contain("Login failed");
    });
  });
});
