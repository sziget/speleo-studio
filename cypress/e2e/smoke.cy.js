describe('smoke tests', () => {

  beforeEach(function () {
    cy.fixture('testdata').then((testdata) => {
      this.testdata = testdata;
    });
  });

  it('page loads', function () {
    cy.visit('/?cave=' + this.testdata.jsonCaveFile);
  });

});
