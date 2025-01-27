describe('smoke tests', () => {

  beforeEach(function () {
    cy.fixture('testdata').then((testdata) => {
      this.testdata = testdata;
    });
  });

  it('page loads', function () {
    cy.visit('/speleo-studio/?cave=' + this.testdata.jsonCaveFile);
    cy.get('#welcome-panel').should('contain.text', 'Welcome to Speleo Studio.');
    cy.get('button').contains("Let's get started").click();
  });

});
