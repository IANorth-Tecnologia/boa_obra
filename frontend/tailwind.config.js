// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background-primary': '#111827', 
        'background-secondary': '#1F2937', 
        'background-tertiary': '#374151', 
        'text-primary': '#F9FAFB',     
        'text-secondary': '#9CA3AF',   
        'text-tertiary': '#6B7280',    

        // Light theme colors
        'light-background-primary': '#FFFFFF',   
        'light-background-secondary': '#F9FAFB', 
        'light-background-tertiary': '#F3F4F6',  
        'light-text-primary': '#111827',         
        'light-text-secondary': '#6B7280',       
        'light-text-tertiary': '#9CA3AF',        

        // Accent (Azul padrão)
        'accent-primary': '#3B82F6',   
        'accent-secondary': '#2563EB', 
        
        'status-success': '#10B981',
        'status-warning': '#F59E0B',
        'status-error': '#EF4444',
      }
    },
  },
  plugins: [],
}
