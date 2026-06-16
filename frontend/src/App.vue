<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// Root component with router-view for navigation
</script>

<style>
/* Global styles - Mobile-first design */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background-color: #f5f5f5;
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Mobile-first responsive breakpoints */
@media (min-width: 768px) {
  #app {
    max-width: 768px;
    margin: 0 auto;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
  }
}

/* Utility classes */
.container {
  padding: 1rem;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1rem;
}

/* Form elements */
input, textarea, select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #007bff;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

h1 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}
</style>
