describe('Hello World Test', () => {
    it('should display the correct title', () => {
        cy.visit('http://localhost:3000'); // Adjust the URL as needed
        cy.title().should('include', 'PapBakery'); // Replace with the expected title
    });
});