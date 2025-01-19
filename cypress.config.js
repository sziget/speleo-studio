import { defineConfig } from 'cypress';

export default defineConfig({
  e2e : {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      config.baseUrl = 'https://joemeszaros.github.io/speleo-studio/';
      return config;
    }
  }
});
