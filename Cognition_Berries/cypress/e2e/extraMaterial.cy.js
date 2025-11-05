describe("Cognition Berries – Extra Material Page", () => {
  const email = `pope@gmail.com`;
  const password = "pope99";

  beforeEach(() => {
    // ✅ Register and login test user
    cy.login(email, password);
    cy.visit("/extra-material");
    cy.url().should("include", "/extra-material");
  });

  it("should show page title", () => {
    cy.contains("📚 Extra Material").should("be.visible");
  });

  it("should show books or display 'No books available at the moment.'", () => {
    // cy.viist("/extra-material")
    cy.get("body").then(($body) => {
      if ($body.find(".book-card").length > 0) {
        cy.get(".book-card").should("have.length.at.least", 1);
      } else {
        cy.contains("No books available at the moment.").should("be.visible");
      }
    });
  });

  it("should allow Add to Cart if books exist", () => {
    cy.get("body").then(($body) => {
      if ($body.find(".book-card button").length > 0) {
        cy.window().then((win) => cy.stub(win, "alert").as("alert"));
        cy.get(".book-card button").first().click();
        cy.get("@alert").should("have.been.called");
      } else {
        cy.log("⚠ No books to add to cart");
      }
    });
  });

  it("should navigate to cart page when clicking 'Go to Cart'", () => {
    cy.contains("Go to Cart", { matchCase: true })
      .scrollIntoView()
      .click({ force: true });
    cy.url().should("include", "/cart");
  });
});
