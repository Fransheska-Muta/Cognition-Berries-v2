describe("Cognition Berries – Courses Page", () => {
  it("should load courses page", () => {
    cy.visit('http://localhost:5173/courses');
    // cy.contains("Courses").should("be.visible"); // Adjust header if different
  });

  it('Courses', function() {
     beforeEach(() => {
        cy.visit("/signup");
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
    cy.visit('http://localhost:5173/courses')
    
  });
});
