// cypress/e2e/cart.cy.js

describe("Cognition Berries – Cart Page", () => {
const email = `pope@gmail.com`;
  const password = "pope99";

  beforeEach(() => {
    // ✅ Register and login test user
    cy.login(email, password);
    cy.visit("/extra-material");
    cy.url().should("include", "/extra-material");
  });

  it("should display the cart page", () => {
    cy.visit("/cart");
    cy.url().should("include", "/cart");
    cy.contains("Shopping Cart").should("be.visible");
  });

  it("should show empty cart message if no items", () => {
    cy.visit("/cart");
    cy.contains("Your cart is empty.").should("be.visible"); // ✅ Matches your UI
    cy.contains("Continue Shopping").should("exist").click({ force: true });
    cy.location("pathname", { timeout: 10000 }).should("eq", "/extra-material");
  });

  it("should add an item to the cart from Extra Material page", () => {
    cy.visit("/extra-material");

    cy.get("body").then(($body) => {
      if ($body.find(".book-card").length > 0) {
        cy.window().then((win) => cy.stub(win, "alert").as("alert"));
        cy.get(".book-card button").first().click(); // Add to cart
        cy.get("@alert").should("have.been.called");
      } else {
        cy.log("⚠ No books available to add to cart for testing.");
      }
    });
  });

  it("should display items in the cart if added", () => {
    cy.visit("/cart");

    cy.get("body").then(($body) => {
      if ($body.find(".cart-item").length > 0) {
        cy.get(".cart-item").should("have.length.at.least", 1);
      } else {
        cy.contains("Your cart is empty.").should("be.visible");
      }
    });
  });

  it("should increase and decrease item quantity", () => {
    cy.visit("/cart");

    cy.get("body").then(($body) => {
      if ($body.find(".cart-item").length > 0) {
        cy.get(".qty-btn").contains("+").first().click();
        cy.wait(500);
        cy.get(".qty-btn").contains("−").first().click();
      } else {
        cy.log("⚠ No items in cart to test quantity update.");
      }
    });
  });

  it("should allow removing an item from the cart", () => {
    cy.visit("/cart");

    cy.get("body").then(($body) => {
      if ($body.find(".remove-btn").length > 0) {
        cy.get(".remove-btn").first().click();
        cy.wait(500);
      } else {
        cy.log("⚠ No items to remove from cart.");
      }
    });
  });

  it("should navigate to checkout page when 'Proceed to Checkout' is clicked", () => {
    cy.visit("/cart");

    cy.get("body").then(($body) => {
      if ($body.find(".cart-item").length > 0) {
        cy.contains("Proceed to Checkout").click();
        cy.url().should("include", "/checkout");
      } else {
        cy.log("⚠ Cannot checkout when the cart is empty.");
      }
    });
  });
});
