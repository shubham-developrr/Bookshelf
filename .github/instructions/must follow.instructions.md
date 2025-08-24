---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

### Project Context
This project is a React + TypeScript educational platform that features advanced AI tutoring capabilities, a mobile-optimized text highlighting system, a theme system, and a comprehensive content management system. The goal is to transform static educational content into an interactive learning experience.

### Coding Guidelines
1. **Component Structure**: Follow the established folder structure for components, pages, contexts, utils, and types.
2. **State Management**: Use React Context and local state for managing application state. Avoid using Redux.
3. use these instrtuctions for general understanding of all the components .github\copilot-instructions-updated.md
4. only ask for running the server once you have verified its not running on port 5174 as its always running there
5. **Testing**: Write tests for all new features and components. Use Playwright for end-to-end testing.
6. **Accessibility**: Ensure all components are accessible and follow best practices for ARIA roles and keyboard navigation.
7. **Performance**: Optimize components for performance, especially those involving complex calculations or rendering.
8. **Documentation**: Document all new components and features thoroughly, including usage examples and API references.

9. **Playwright Testing**: When utilizing the Playwright tool for testing, ensure that you use the integrated copilot tool.
10. The terminal is PowerShell, so give commands compatible with it.
